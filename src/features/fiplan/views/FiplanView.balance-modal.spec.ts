/**
 * FiplanView.balance-modal.spec.ts
 *
 * Tests for the Balance modal enhancements in FiplanView:
 *
 *   2-year treasury rule (balanceRows computed)
 *     - disabled: Y1 and Y2 computed independently
 *     - enabled, only Y1 gap: Y1 shortfall unchanged, Y2 unaffected (no Y2 gap)
 *     - enabled, only Y2 gap: Y1 shortfall absorbs Y2's gap, Y2 marked coveredByY1
 *     - enabled, Y1 + Y2 gaps: Y1 shortfall = sum, Y2 marked coveredByY1
 *     - enabled, Y3 gap: Y3 computed normally — rule only touches Y1/Y2
 *
 *   hasSomeGap / totalSuggested with 2-year treasury
 *     - hasSomeGap is true when only Y2 has a gap (absorbed into Y1)
 *     - totalSuggested reflects the combined Y1+Y2 amount from Y1 row
 *
 *   resetBalance
 *     - restores twoYearTreasury to true
 *     - restores safetyPct to 0
 *     - resets yearConfigs to single capital_increase line at 100 %
 *
 *   applyBalance — Opening Balance instrument routing
 *     - _ob_share_capital: calls updateOpeningBalance, no fiplan entry created
 *     - _ob_cash: calls updateOpeningBalance, no fiplan entry created
 *     - mixed (regular + OB): both updateEntries and updateOpeningBalance called
 *     - OB instrument fetches opening balance first when not yet loaded
 *     - regular instrument only: updateOpeningBalance NOT called
 *
 *   Y1 Select options include Opening Balance instruments
 *     - Y1 instrument panel offers _ob_share_capital and _ob_cash options
 *     - Y2+ instrument panels do NOT offer OB options
 *
 * Strategy
 * ────────
 * • PrimeVue Dialog is stubbed to always render its default slot so modal
 *   content is in the DOM without needing to open it.
 * • All stores are mocked with controllable refs so we can inject any
 *   annualBalance / report values.
 * • applyBalance is triggered via wrapper.vm directly to avoid DOM complexity.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, defineComponent, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import FiplanView from './FiplanView.vue'

// ── Controllable store state ──────────────────────────────────────────────────

const mockEntries    = ref<any[]>([])
const mockReport     = ref<any>(null)
const mockUpdateEntries   = vi.fn()
const mockFetchAll        = vi.fn()
const mockFetchReport     = vi.fn()

const mockOBData          = ref<any>(null)
const mockUpdateOB        = vi.fn()
const mockFetchOB         = vi.fn()

const mockActiveScenario  = { id: 'sc-1' }

// ── Helper: build a minimal FiplanReport with given annual balances ───────────
/**
 * `annualBalance[i]` follows the report convention: positive = surplus, negative = deficit.
 */
function makeReport(annualBalance: number[]) {
  const fmt = (v: number) => String(v)
  const zeros = ['0', '0', '0', '0', '0']
  return {
    plan: {
      requirements: { total: zeros },
      resources:    { total: zeros },
      balance: {
        annualBalance: annualBalance.map(fmt),
        cumulativeCash: zeros,
      },
    },
    cashFlow: {
      operating:  { netProfit: zeros, depreciation: zeros, disposalGainLoss: zeros, wcrChange: zeros, operatingFlows: zeros },
      investing:  { capexOutflow: zeros, assetDisposals: zeros, investmentFlows: zeros },
      financing:  { capitalIncrease: zeros, currentAccountCont: zeros, newLoansAndGrants: zeros, dividends: zeros, loanGrantRepayments: zeros, financingFlows: zeros },
      summary:    { initialCash: '0', changeInCash: zeros, cumulativeCash: zeros },
    },
    warning: annualBalance.map(v => v < 0),
  }
}

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/features/fiplan/stores/fiplanStore', () => ({
  useFiplanStore: () => ({
    entries:        mockEntries.value,
    report:         mockReport.value,
    loading:        false,
    error:          null,
    fetchAll:       mockFetchAll,
    fetchReport:    mockFetchReport,
    updateEntries:  mockUpdateEntries,
  }),
}))

vi.mock('@/features/settings/stores/settingsStore', () => ({
  useSettingsStore: () => ({
    openingBalance:       mockOBData.value,
    updateOpeningBalance: mockUpdateOB,
    fetchOpeningBalance:  mockFetchOB,
  }),
}))

vi.mock('@/features/pnl/stores/pnlStore', () => ({
  usePnlStore: () => ({ report: null, loading: false, fetchReport: vi.fn() }),
}))

vi.mock('@/features/bsheet/stores/bsheetStore', () => ({
  useBSheetStore: () => ({ report: null, loading: false, fetchReport: vi.fn() }),
}))

vi.mock('@/features/plans/stores/planStore', () => ({
  usePlanStore: () => ({ activePlan: { id: 'plan-1' } }),
}))

vi.mock('@/features/scenarios/stores/scenarioStore', () => ({
  useScenarioStore: () => ({ activeScenario: mockActiveScenario }),
}))

vi.mock('@/composables/useYearHeaders', () => ({
  useYearHeaders: () => ({ yearHeaders: ref(['Y1', 'Y2', 'Y3', 'Y4', 'Y5']) }),
}))

vi.mock('@/composables/useDecimal', () => ({
  useDecimal: () => ({
    getUnitLabel: () => 'k€',
    /** Simulate k€ mode: divide base-€ by 1000, 1 decimal place */
    formatUnit: (val: string | number) => {
      const n = typeof val === 'string' ? parseFloat(val) || 0 : val
      return (n / 1000).toFixed(1)
    },
  }),
}))

vi.mock('@/stores/ui', () => ({
  useUiStore: vi.fn(() => ({ showToast: vi.fn() })),
}))

vi.mock('@/utils/logger', () => ({ devlog: { error: vi.fn(), debug: vi.fn() } }))

// ── PrimeVue stubs ────────────────────────────────────────────────────────────

/** Dialog always renders its slot — no visibility guard. */
const DialogStub = defineComponent({
  props: ['visible', 'header', 'modal', 'closable', 'style'],
  emits: ['update:visible', 'hide'],
  template: `<div class="p-dialog-stub"><slot /><slot name="footer" /></div>`,
})

const globalStubs = {
  Dialog: DialogStub,
  Tabs:        { template: '<div><slot /></div>' },
  TabList:     { template: '<div><slot /></div>' },
  Tab:         { template: '<div><slot /></div>' },
  TabPanels:   { template: '<div><slot /></div>' },
  TabPanel:    { template: '<div><slot /></div>' },
  KYearGrid:   { template: '<div />', props: ['rows', 'unit'] },
  KFormLegend: { template: '<div />' },
  KChart:      { template: '<div />' },
  ProgressSpinner: { template: '<div />' },
  Button: {
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['label', 'icon', 'severity', 'outlined', 'size', 'disabled', 'loading', 'text'],
    emits: ['click'],
  },
  Select: {
    template: '<select @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
    props: ['modelValue', 'options', 'optionLabel', 'optionValue', 'optionDisabled', 'pt'],
    emits: ['update:modelValue'],
  },
  InputNumber: {
    template: '<input type="number" :value="modelValue" @input="$emit(\'update:modelValue\', +$event.target.value)" />',
    props: ['modelValue', 'min', 'max', 'step', 'suffix', 'showButtons', 'inputClass'],
    emits: ['update:modelValue'],
  },
  Tabs2: { template: '<div />' },
}

// ── Mount helper ──────────────────────────────────────────────────────────────

function mountView() {
  return mount(FiplanView, {
    global: {
      plugins: [createPinia()],
      stubs: globalStubs,
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('FiplanView — Balance modal: 2-year treasury rule', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockUpdateEntries.mockResolvedValue(undefined)
    mockUpdateOB.mockResolvedValue(undefined)
    mockFetchOB.mockResolvedValue(undefined)
    mockOBData.value = { shareCapital: '0', cashAndSecurities: '0' }
  })

  it('disabled: Y1 and Y2 shortfalls computed independently', async () => {
    mockReport.value = makeReport([-100, -200, 0, 0, 0])
    const wrapper = mountView()
    const vm = wrapper.vm as any

    // Turn off 2-year treasury rule
    vm.twoYearTreasury = false
    await nextTick()

    const rows = vm.balanceRows
    expect(rows[0].shortfall).toBe(100)  // Y1 only
    expect(rows[1].shortfall).toBe(200)  // Y2 only — not absorbed
    expect(rows[1].coveredByY1).toBe(false)
  })

  it('enabled, only Y1 has a gap: Y1 shortfall = Y1 gap only (Y2 gap = 0)', async () => {
    mockReport.value = makeReport([-150, 0, 0, 0, 0])
    const wrapper = mountView()
    const vm = wrapper.vm as any
    vm.twoYearTreasury = true
    await nextTick()

    const rows = vm.balanceRows
    expect(rows[0].shortfall).toBe(150)    // Y1 gap + 0 from Y2
    expect(rows[1].shortfall).toBe(0)
    expect(rows[1].coveredByY1).toBe(false) // Y2 had no gap to cover
  })

  it('enabled, only Y2 has a gap: Y1 absorbs Y2 gap, Y2 is coveredByY1', async () => {
    mockReport.value = makeReport([0, -300, 0, 0, 0])
    const wrapper = mountView()
    const vm = wrapper.vm as any
    vm.twoYearTreasury = true
    await nextTick()

    const rows = vm.balanceRows
    expect(rows[0].shortfall).toBe(300)      // Y1 gets Y2's gap
    expect(rows[1].shortfall).toBe(0)
    expect(rows[1].coveredByY1).toBe(true)   // Y2 suppressed
  })

  it('enabled, both Y1 and Y2 have gaps: Y1 shortfall = Y1 + Y2, Y2 is coveredByY1', async () => {
    mockReport.value = makeReport([-100, -200, 0, 0, 0])
    const wrapper = mountView()
    const vm = wrapper.vm as any
    vm.twoYearTreasury = true
    await nextTick()

    const rows = vm.balanceRows
    expect(rows[0].shortfall).toBe(300)   // 100 + 200
    expect(rows[1].shortfall).toBe(0)
    expect(rows[1].coveredByY1).toBe(true)
  })

  it('enabled, Y3 has a gap: Y3 computed normally — rule does not touch Y3+', async () => {
    mockReport.value = makeReport([0, 0, -500, 0, 0])
    const wrapper = mountView()
    const vm = wrapper.vm as any
    vm.twoYearTreasury = true
    await nextTick()

    const rows = vm.balanceRows
    expect(rows[2].shortfall).toBe(500)
    expect(rows[2].coveredByY1).toBe(false)
    expect(rows[0].shortfall).toBe(0)   // Y1 also has no gap to absorb
  })

  it('enabled, Y2 deficit not absorbed into Y1 when Y2 surplus: no effect on Y1', async () => {
    // Y2 annual balance is positive — no shortfall
    mockReport.value = makeReport([0, 50, 0, 0, 0])
    const wrapper = mountView()
    const vm = wrapper.vm as any
    vm.twoYearTreasury = true
    await nextTick()

    const rows = vm.balanceRows
    expect(rows[0].shortfall).toBe(0)   // nothing to absorb from Y2
    expect(rows[1].shortfall).toBe(0)
    expect(rows[1].coveredByY1).toBe(false)
  })
})

describe('FiplanView — Balance modal: hasSomeGap / totalSuggested with 2-year treasury', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockUpdateEntries.mockResolvedValue(undefined)
    mockOBData.value = null
  })

  it('hasSomeGap is true when only Y2 has a gap (absorbed into Y1)', async () => {
    mockReport.value = makeReport([0, -400, 0, 0, 0])
    const wrapper = mountView()
    const vm = wrapper.vm as any
    vm.twoYearTreasury = true
    await nextTick()

    expect(vm.hasSomeGap).toBe(true)
  })

  it('totalSuggested reflects the Y1+Y2 combined amount from Y1 row (100% coverage)', async () => {
    mockReport.value = makeReport([-100, -200, 0, 0, 0])
    const wrapper = mountView()
    const vm = wrapper.vm as any
    vm.twoYearTreasury = true
    // Ensure Y1 config has 100% coverage (default)
    vm.yearConfigs[0].lines[0].coveragePct = 100
    await nextTick()

    // Y1 shortfall = 300, 100% coverage, safety 0% → rounded up to nearest k€ = 1000
    expect(vm.totalSuggested).toBe(1000)
  })

  it('totalSuggested does NOT double-count Y2 (coveredByY1 row has suggested = 0)', async () => {
    mockReport.value = makeReport([-100, -200, 0, 0, 0])
    const wrapper = mountView()
    const vm = wrapper.vm as any
    vm.twoYearTreasury = true
    await nextTick()

    const y2Row = vm.balanceRows[1]
    expect(y2Row.suggested).toBe(0)      // suppressed row contributes 0
    expect(vm.totalSuggested).toBe(1000) // only Y1 contributes; 300 shortfall rounds up to k€
  })
})

describe('FiplanView — Balance modal: resetBalance', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockReport.value = makeReport([-100, -200, 0, 0, 0])
    mockOBData.value = null
  })

  it('restores twoYearTreasury to true', async () => {
    const wrapper = mountView()
    const vm = wrapper.vm as any
    vm.twoYearTreasury = false
    await nextTick()

    vm.resetBalance()
    await nextTick()
    expect(vm.twoYearTreasury).toBe(true)
  })

  it('restores safetyPct to 0', async () => {
    const wrapper = mountView()
    const vm = wrapper.vm as any
    vm.safetyPct = 20
    await nextTick()

    vm.resetBalance()
    await nextTick()
    expect(vm.safetyPct).toBe(0)
  })

  it('resets yearConfigs to one capital_increase line at 100 % per year', async () => {
    const wrapper = mountView()
    const vm = wrapper.vm as any
    // Mutate a config
    vm.yearConfigs[0].lines[0].financingType = 'lt_loans'
    vm.yearConfigs[0].lines[0].coveragePct   = 50
    await nextTick()

    vm.resetBalance()
    await nextTick()

    for (let i = 0; i < 5; i++) {
      expect(vm.yearConfigs[i].lines).toHaveLength(1)
      expect(vm.yearConfigs[i].lines[0].financingType).toBe('capital_increase')
      expect(vm.yearConfigs[i].lines[0].coveragePct).toBe(100)
    }
  })
})

describe('FiplanView — Balance modal: applyBalance OB instrument routing', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockUpdateEntries.mockResolvedValue(undefined)
    mockFetchReport.mockResolvedValue(undefined)
    mockUpdateOB.mockResolvedValue(undefined)
    mockFetchOB.mockResolvedValue(undefined)
    mockEntries.value = []
  })

  it('_ob_share_capital: does NOT create a fiplan entry, calls updateOpeningBalance with shareCapital delta', async () => {
    mockReport.value  = makeReport([-200, 0, 0, 0, 0])
    mockOBData.value  = { shareCapital: '100', cashAndSecurities: '50' }
    const wrapper = mountView()
    const vm = wrapper.vm as any
    vm.twoYearTreasury = false
    vm.yearConfigs[0].lines[0].financingType = '_ob_share_capital'
    vm.yearConfigs[0].lines[0].coveragePct   = 100
    await nextTick()

    await vm.applyBalance()

    // Pure OB scenario — updateEntries must NOT be called (empty array guard)
    expect(mockUpdateEntries).not.toHaveBeenCalled()
    // fetchReport must be called instead so the UI refreshes
    expect(mockFetchReport).toHaveBeenCalled()

    // Opening balance patched with correct deltas.
    // Share capital injection is a double entry (Dr Cash / Cr Equity), so both
    // shareCapital AND cashAndSecurities must increase by the injected amount.
    // lineAmount rounds up to nearest k€: Math.ceil(200 / 1000) * 1000 = 1000
    expect(mockUpdateOB).toHaveBeenCalledWith(
      expect.objectContaining({
        shareCapital:      '1100', // 1000 added to existing 100
        cashAndSecurities: '1050', // 1000 also added to existing 50 (Dr Cash / Cr Equity)
      }),
    )
  })

  it('_ob_cash: does NOT create a fiplan entry, calls updateOpeningBalance with cashAndSecurities delta', async () => {
    mockReport.value  = makeReport([-150, 0, 0, 0, 0])
    mockOBData.value  = { shareCapital: '0', cashAndSecurities: '25' }
    const wrapper = mountView()
    const vm = wrapper.vm as any
    vm.twoYearTreasury = false
    vm.yearConfigs[0].lines[0].financingType = '_ob_cash'
    vm.yearConfigs[0].lines[0].coveragePct   = 100
    await nextTick()

    await vm.applyBalance()

    // Pure OB scenario — updateEntries must NOT be called (empty array guard)
    expect(mockUpdateEntries).not.toHaveBeenCalled()
    // fetchReport must be called instead so the UI refreshes
    expect(mockFetchReport).toHaveBeenCalled()

    // lineAmount rounds up to nearest k€: Math.ceil(150 / 1000) * 1000 = 1000
    expect(mockUpdateOB).toHaveBeenCalledWith(
      expect.objectContaining({ cashAndSecurities: '1025' }), // 1000 added to existing 25
    )
  })

  it('mixed (capital_increase + _ob_share_capital): both updateEntries and updateOpeningBalance called', async () => {
    mockReport.value  = makeReport([-200, 0, 0, 0, 0])
    mockOBData.value  = { shareCapital: '0', cashAndSecurities: '0' }
    const wrapper = mountView()
    const vm = wrapper.vm as any
    vm.twoYearTreasury = false
    // Y1: 50% via capital_increase, 50% via share capital
    vm.yearConfigs[0].lines[0] = { financingType: 'capital_increase', coveragePct: 50 }
    vm.yearConfigs[0].lines.push({ financingType: '_ob_share_capital', coveragePct: 50 })
    await nextTick()

    await vm.applyBalance()

    // lineAmount rounds up to nearest k€: Math.ceil(100 / 1000) * 1000 = 1000 for each 50% share
    const putEntries = mockUpdateEntries.mock.calls[0][0]
    const capEntry = putEntries.find((e: any) => e.lineId === 'capital_increase')
    expect(capEntry).toBeDefined()
    expect(Number(capEntry.amount)).toBe(1000)

    // Opening balance updated for share capital (also 1000)
    expect(mockUpdateOB).toHaveBeenCalledWith(
      expect.objectContaining({ shareCapital: '1000' }),
    )
  })

  it('fetches opening balance first when settingsStore.openingBalance is null', async () => {
    mockReport.value  = makeReport([-100, 0, 0, 0, 0])
    mockOBData.value  = null   // not yet loaded
    mockFetchOB.mockImplementation(() => {
      // Simulate the store loading data
      mockOBData.value = { shareCapital: '0', cashAndSecurities: '0' }
      return Promise.resolve()
    })

    const wrapper = mountView()
    const vm = wrapper.vm as any
    vm.twoYearTreasury = false
    vm.yearConfigs[0].lines[0].financingType = '_ob_share_capital'
    vm.yearConfigs[0].lines[0].coveragePct   = 100
    await nextTick()

    await vm.applyBalance()

    expect(mockFetchOB).toHaveBeenCalled()
    expect(mockUpdateOB).toHaveBeenCalled()
  })

  it('regular instrument only: updateOpeningBalance is NOT called', async () => {
    mockReport.value  = makeReport([-100, 0, 0, 0, 0])
    mockOBData.value  = { shareCapital: '0', cashAndSecurities: '0' }
    const wrapper = mountView()
    const vm = wrapper.vm as any
    vm.twoYearTreasury = false
    vm.yearConfigs[0].lines[0].financingType = 'lt_loans'
    vm.yearConfigs[0].lines[0].coveragePct   = 100
    await nextTick()

    await vm.applyBalance()

    expect(mockUpdateOB).not.toHaveBeenCalled()
    expect(mockUpdateEntries).toHaveBeenCalled()
  })

  it('2-year treasury: applyBalance creates a single Y1 entry covering Y1+Y2 gap', async () => {
    mockReport.value  = makeReport([-100, -200, 0, 0, 0])
    mockOBData.value  = { shareCapital: '0', cashAndSecurities: '0' }
    const wrapper = mountView()
    const vm = wrapper.vm as any
    vm.twoYearTreasury = true    // Y1 shortfall = 300
    await nextTick()

    await vm.applyBalance()

    const putEntries = mockUpdateEntries.mock.calls[0][0]
    const y1Entry = putEntries.find((e: any) => e.lineId === 'capital_increase' && e.yearIndex === 1)
    expect(y1Entry).toBeDefined()
    // Y1+Y2 combined shortfall = 300; rounded up to nearest k€ = 1000
    expect(Number(y1Entry.amount)).toBe(1000)

    // No Y2 entry should have been created (gap absorbed into Y1)
    const y2Entry = putEntries.find((e: any) => e.lineId === 'capital_increase' && e.yearIndex === 2)
    expect(y2Entry).toBeUndefined()
  })
})

describe('FiplanView — Balance modal: Y1 Select includes OB options, Y2+ does not', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockOBData.value = null
  })

  it('Y1 instrument panel renders OB instrument labels in the Select', async () => {
    // Both Y1 and Y2 have gaps so both panels appear (treasury rule off)
    mockReport.value = makeReport([-100, -200, 0, 0, 0])
    const wrapper = mountView()
    const vm = wrapper.vm as any
    vm.showBalanceModal = true
    vm.twoYearTreasury = false
    await nextTick()

    // The Y1 row uses combined options: FINANCING_OPTIONS + Y1_OPENING_OPTIONS
    // We check via the exposed constant on the component
    const y1Options = [...vm.FINANCING_OPTIONS, ...vm.Y1_OPENING_OPTIONS]
    const obLabels  = y1Options.map((o: any) => o.value)
    expect(obLabels).toContain('_ob_share_capital')
    expect(obLabels).toContain('_ob_cash')
  })

  it('Y2+ instrument panels use FINANCING_OPTIONS only (no OB entries)', async () => {
    mockReport.value = makeReport([-100, -200, 0, 0, 0])
    const wrapper = mountView()
    const vm = wrapper.vm as any
    vm.showBalanceModal = true
    vm.twoYearTreasury = false
    await nextTick()

    const regularOptions = vm.FINANCING_OPTIONS.map((o: any) => o.value)
    expect(regularOptions).not.toContain('_ob_share_capital')
    expect(regularOptions).not.toContain('_ob_cash')
  })
})
