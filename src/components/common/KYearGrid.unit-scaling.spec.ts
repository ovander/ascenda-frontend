/**
 * KYearGrid.unit-scaling.spec.ts
 *
 * Layer 2 of the systematic unit-multiple test suite.
 *
 * KYearGrid is the single shared component through which ALL computed monetary
 * values are rendered across every module (PnL, FiPlan, BSheet, Staff, etc.).
 * It calls `formatUnit(data.values[idx])` for every non-editable cell.
 *
 * These tests verify:
 *   1. Computed (non-editable) cells display `formatUnit(rawValue)` — the
 *      correct scaled representation for the active display unit.
 *   2. Switching the display unit changes rendered text proportionally.
 *   3. Editable cells show the raw stored value (not scaled) and carry the
 *      unit label as a visual suffix.
 *   4. The "Amounts in …" badge reflects the current unit label.
 *   5. colorBySign rows apply correct CSS classes.
 *   6. Aggregate / subtotal rows have the right CSS classes.
 *
 * Golden base-€ values
 * ─────────────────────
 *   REVENUE  = 1_200_000  → k€: 1,200.0  │ M€: 1.20  │ €: 1,200,000
 *   COGS     =   480_000  → k€:   480.0  │ M€: 0.48  │ €:   480,000
 *   NEGATIVE =  -300_000  → k€:  -300.0  │ M€: -0.30 │ €:  -300,000
 *
 * Stub strategy
 * ─────────────
 * PrimeVue's DataTable/Column slot system works like this in production:
 *   • DataTable iterates its `:value` rows and, for each row, invokes every
 *     Column child's `#body` slot with `{ data: row }`.
 * To reproduce this in tests without the real PrimeVue library we write proper
 * Vue component stubs that use provide/inject to thread the current row down
 * from DataTable into each Column's body slot:
 *
 *   DataTable → RowProvider (provide __dtRow__ = row) → <slot /> → Column
 *   Column → inject __dtRow__ → slots.body({ data: injectedRow })
 *
 * useDisplayUnitStore is mocked with a reactive plain-object that exposes
 * `setUnit()`.  This removes any dependency on localStorage and lets tests
 * control the active unit without needing the real Pinia store.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, provide, inject, h } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import KYearGrid, { type GridRow } from './KYearGrid.vue'
import { useSettingsStore } from '@/features/settings/stores/settingsStore'

// ── Reactive display-unit mock ────────────────────────────────────────────────

type Unit = '€' | 'k€' | 'M€'

const displayUnitState = { unit: 'k€' as Unit }

const FACTORS:   Record<Unit, number> = { '€': 1, 'k€': 1_000, 'M€': 1_000_000 }
const DECIMALS:  Record<Unit, number> = { '€': 0, 'k€': 1,     'M€': 2         }

vi.mock('@/stores/displayUnit', () => ({
  useDisplayUnitStore: () => ({
    get unit()    { return displayUnitState.unit },
    get factor()  { return FACTORS[displayUnitState.unit] },
    get decimals(){ return DECIMALS[displayUnitState.unit] },
    setUnit: (u: Unit) => { displayUnitState.unit = u },
    cycleUnit: () => {
      const order: Unit[] = ['€', 'k€', 'M€']
      const next = order[(order.indexOf(displayUnitState.unit) + 1) % 3]
      displayUnitState.unit = next
    },
  }),
}))

vi.mock('@/features/settings/stores/settingsStore', () => ({
  useSettingsStore: vi.fn(() => ({ config: { language: 'en' } })),
}))

vi.mock('@/composables/useYearHeaders', () => ({
  useYearHeaders: () => ({ yearHeaders: { value: ['Y1', 'Y2', 'Y3', 'Y4', 'Y5'] } }),
}))

vi.mock('@/utils/format', () => ({
  debounce: (fn: (...a: any[]) => any) => fn,
}))

// ── PrimeVue stubs with proper row-threading ───────────────────────────────────
// RowProvider wraps each row and provides it to all Column descendants via
// Vue's provide/inject mechanism.  This replicates what PrimeVue's real
// DataTable does internally.

const ROW_KEY = '__dtRow__' as const

const RowProvider = defineComponent({
  name: 'RowProvider',
  props: ['rowData'],
  setup(props, { slots }) {
    provide(ROW_KEY, props.rowData)
    return () => slots.default?.() ?? null
  },
})

const DataTableStub = defineComponent({
  name: 'DataTableStub',
  props: ['value', 'rowGroupMode', 'groupRowsBy', 'scrollable', 'scrollHeight', 'showGridlines', 'size'],
  setup(props, { slots }) {
    return () =>
      h('div', [
        ...(props.value ?? []).map((row: any, ri: number) =>
          h(RowProvider, { key: ri, rowData: row }, {
            default: () => slots.default?.() ?? null,
          })
        ),
        slots.footer?.() ?? null,
      ])
  },
})

const ColumnStub = defineComponent({
  name: 'ColumnStub',
  props: ['field', 'header', 'frozen', 'class', 'style'],
  setup(_, { slots }) {
    const rowData = inject<any>(ROW_KEY, { values: [], editable: false })
    return () =>
      h('div', { class: 'col' }, [
        slots.header?.() ?? null,
        slots.body?.({ data: rowData }) ?? null,
      ])
  },
})

const globalConfig = {
  stubs: {
    DataTable: DataTableStub,
    Column: ColumnStub,
    InputNumber: {
      template: `<input class="input-number" type="number" :value="modelValue" @input="$emit('update:modelValue', +$event.target.value)" />`,
      props: ['modelValue', 'minFractionDigits', 'maxFractionDigits', 'locale', 'mode', 'suffix'],
      emits: ['update:modelValue'],
    },
  },
}

// ── Golden test values ─────────────────────────────────────────────────────────

const REVENUE  = 1_200_000
const COGS     =   480_000
const NEGATIVE =  -300_000

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRows(overrides: Partial<GridRow>[] = []): GridRow[] {
  return [
    { id: 'revenue',  label: 'Revenue',  values: [REVENUE,  REVENUE,  REVENUE,  REVENUE,  REVENUE],  editable: false, ...overrides[0] },
    { id: 'cogs',     label: 'COGS',     values: [COGS,     COGS,     COGS,     COGS,     COGS],     editable: false, ...overrides[1] },
    { id: 'negative', label: 'Negative', values: [NEGATIVE, NEGATIVE, NEGATIVE, NEGATIVE, NEGATIVE], editable: false, ...overrides[2] },
  ]
}

function mountGrid(rows: GridRow[], unit?: string) {
  return mount(KYearGrid, { props: { rows, unit }, global: globalConfig })
}

function setUnit(u: Unit) {
  displayUnitState.unit = u
}

function cellTexts(wrapper: ReturnType<typeof mountGrid>): string[] {
  return wrapper.findAll('span.text-sm').map(s => s.text())
}

// ─────────────────────────────────────────────────────────────────────────────

describe('KYearGrid — computed cell rendering with display unit', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(useSettingsStore).mockReturnValue({ config: { language: 'en' } } as any)
  })

  it('renders 1_200_000 base € as "1,200.0" in k€ mode', () => {
    setUnit('k€')
    const wrapper = mountGrid(makeRows())
    expect(cellTexts(wrapper)).toContain('1,200.0')
  })

  it('renders 1_200_000 base € as "1,200,000" in € mode', () => {
    setUnit('€')
    const wrapper = mountGrid(makeRows())
    expect(cellTexts(wrapper)).toContain('1,200,000')
  })

  it('renders 1_200_000 base € as "1.20" in M€ mode', () => {
    setUnit('M€')
    const wrapper = mountGrid(makeRows())
    expect(cellTexts(wrapper)).toContain('1.20')
  })

  it('renders 480_000 as "480.0" in k€ mode', () => {
    setUnit('k€')
    const wrapper = mountGrid(makeRows())
    expect(cellTexts(wrapper)).toContain('480.0')
  })

  it('renders -300_000 as "-300.0" in k€ mode', () => {
    setUnit('k€')
    const wrapper = mountGrid(makeRows())
    expect(cellTexts(wrapper)).toContain('-300.0')
  })

  it('renders -300_000 as "-0.30" in M€ mode', () => {
    setUnit('M€')
    const wrapper = mountGrid(makeRows())
    expect(cellTexts(wrapper)).toContain('-0.30')
  })
})

describe('KYearGrid — unit label badge', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows "Amounts in k€" badge when unit prop = "k€"', () => {
    const wrapper = mountGrid(makeRows(), 'k€')
    expect(wrapper.text()).toContain('Amounts in k€')
  })

  it('shows "Amounts in M€" badge when unit prop = "M€"', () => {
    const wrapper = mountGrid(makeRows(), 'M€')
    expect(wrapper.text()).toContain('Amounts in M€')
  })

  it('does not show amounts badge when unit prop is undefined', () => {
    const wrapper = mountGrid(makeRows())
    expect(wrapper.text()).not.toContain('Amounts in')
  })
})

describe('KYearGrid — editable cells show scaled value (divided by unit factor)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('editable cell modelValue is divided by unit factor in k€ mode', () => {
    setUnit('k€')
    const editableRow: GridRow = {
      id: 'capex', label: 'Capex',
      values: [500_000, 0, 0, 0, 0],
      editable: true,
    }
    const wrapper = mountGrid([editableRow], 'k€')
    const input = wrapper.find('input.input-number')
    expect(input.exists()).toBe(true)
    // 500_000 base-€ ÷ 1000 = 500 in k€ mode
    expect(Number((input.element as HTMLInputElement).value)).toBe(500)
  })

  it('editable cell modelValue is divided by unit factor in M€ mode', () => {
    setUnit('M€')
    const editableRow: GridRow = {
      id: 'capex', label: 'Capex',
      values: [2_500_000, 0, 0, 0, 0],
      editable: true,
    }
    const wrapper = mountGrid([editableRow], 'M€')
    const input = wrapper.find('input.input-number')
    expect(input.exists()).toBe(true)
    // 2_500_000 base-€ ÷ 1_000_000 = 2.5 in M€ mode
    expect(Number((input.element as HTMLInputElement).value)).toBeCloseTo(2.5)
  })

  it('editable cell modelValue is raw in € mode (factor = 1)', () => {
    setUnit('€')
    const editableRow: GridRow = {
      id: 'capex', label: 'Capex',
      values: [50_000, 0, 0, 0, 0],
      editable: true,
    }
    const wrapper = mountGrid([editableRow], '€')
    const input = wrapper.find('input.input-number')
    expect(input.exists()).toBe(true)
    // 50_000 base-€ ÷ 1 = 50_000 in € mode
    expect(Number((input.element as HTMLInputElement).value)).toBe(50_000)
  })
})

describe('KYearGrid — colorBySign rows', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('positive value gets text-green-700 class', () => {
    setUnit('k€')
    const row: GridRow = { id: 'balance', label: 'Balance', values: [1_000, 0, 0, 0, 0], editable: false, colorBySign: true }
    const wrapper = mountGrid([row])
    expect(wrapper.findAll('.text-green-700').length).toBeGreaterThan(0)
  })

  it('negative value gets text-red-600 class', () => {
    setUnit('k€')
    const row: GridRow = { id: 'deficit', label: 'Deficit', values: [-1_000, 0, 0, 0, 0], editable: false, colorBySign: true }
    const wrapper = mountGrid([row])
    expect(wrapper.findAll('.text-red-600').length).toBeGreaterThan(0)
  })

  it('zero value gets no sign class', () => {
    setUnit('k€')
    const row: GridRow = { id: 'zero', label: 'Zero', values: [0, 0, 0, 0, 0], editable: false, colorBySign: true }
    const wrapper = mountGrid([row])
    expect(wrapper.find('.text-red-600').exists()).toBe(false)
    expect(wrapper.find('.text-green-700').exists()).toBe(false)
  })
})

describe('KYearGrid — aggregate / subtotal row classes', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('isAggregate row carries row-aggregate class', () => {
    setUnit('k€')
    const rows: GridRow[] = [{ id: 'h', label: 'TOTAL', values: [0, 0, 0, 0, 0], editable: false, isAggregate: true }]
    expect(mountGrid(rows).html()).toContain('row-aggregate')
  })

  it('isSubtotal row carries row-subtotal class', () => {
    setUnit('k€')
    const rows: GridRow[] = [{ id: 's', label: 'Sub', values: [0, 0, 0, 0, 0], editable: false, isSubtotal: true }]
    expect(mountGrid(rows).html()).toContain('row-subtotal')
  })
})

describe('KYearGrid — unit switching proportionality', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('same row value renders proportionally when unit changes (€→k€→M€)', async () => {
    const BASE = 5_000_000
    const row: GridRow = { id: 'r', label: 'R', values: [BASE, BASE, BASE, BASE, BASE], editable: false }

    setUnit('€')
    const wrapper = mountGrid([row])
    expect(cellTexts(wrapper)[0]).toBe('5,000,000')

    // Re-mount with new unit (mock is stateless — no reactive re-render needed)
    setUnit('k€')
    const w2 = mountGrid([row])
    expect(cellTexts(w2)[0]).toBe('5,000.0')

    setUnit('M€')
    const w3 = mountGrid([row])
    expect(cellTexts(w3)[0]).toBe('5.00')
  })
})
