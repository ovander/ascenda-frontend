/**
 * module-display.unit-scaling.spec.ts
 *
 * Layer 3 of the systematic unit-multiple test suite.
 *
 * Contract
 * ────────
 * Every module view must feed RAW base-€ values into KYearGrid rows.
 * Scaling happens exclusively inside KYearGrid.formatUnit() at render time.
 * If any view pre-divides values before passing them to the grid, the
 * displayed numbers will be wrong when the user switches display units.
 *
 * Modules covered
 * ───────────────
 *   PnlView    — reportTableRows (computed from pnlStore.report.years)
 *   FiplanView — planRows (computed from fiplanStore.report.plan)
 *   CapexView  — summaryRows (computed from capexStore.summary.totals)
 *   Cross-unit invariant — formatUnit proportionality across €/k€/M€
 *   Edge cases — zero, very large, empty string inputs
 *
 * vi.mock hoisting fix
 * ────────────────────
 * Vitest hoists ALL vi.mock() calls to the top of the file even when they
 * appear inside helper functions.  The factory closures run before any
 * describe/beforeEach code has executed, so variables defined inside
 * describe blocks are not yet in scope.
 *
 * Fix: vi.hoisted() declares mutable "holder" objects that exist before the
 * hoisted factories run.  Each describe's beforeEach populates the holder
 * with the specific mock data for that module.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

// ── vi.hoisted: mutable containers for per-module mock data ───────────────────
// These are created BEFORE any vi.mock factory runs.

const {
  pnlStoreState,
  fiplanStoreState,
  capexStoreState,
  displayUnitState,
} = vi.hoisted(() => ({
  pnlStoreState: {
    report:        null as any,
    manualEntries: [] as any[],
    loading:       false,
    error:         null,
    fetchAll:      () => Promise.resolve(),
    fetchReport:   () => Promise.resolve(),
    fetchEntries:  () => Promise.resolve(),
    updateEntries: () => Promise.resolve(),
  },
  fiplanStoreState: {
    entries:       [] as any[],
    report:        null as any,
    loading:       false,
    error:         null,
    fetchAll:      () => Promise.resolve(),
    updateEntries: () => Promise.resolve(),
  },
  capexStoreState: {
    entries:      [] as any[],
    summary:      null as any,
    loading:      false,
    error:        null,
    fetchAll:     () => Promise.resolve(),
    updateEntry:  () => Promise.resolve(),
    fetchSummary: () => Promise.resolve(),
  },
  displayUnitState: { unit: 'k€' as '€' | 'k€' | 'M€' },
}))

// ── vi.mock calls (module-level, hoisted by Vitest) ───────────────────────────

vi.mock('@/features/settings/stores/settingsStore', () => ({
  useSettingsStore: vi.fn(() => ({
    config: { language: 'en' },
    openingBalance:       null,
    fetchOpeningBalance:  () => Promise.resolve(),
    updateOpeningBalance: () => Promise.resolve(),
  })),
}))

vi.mock('@/utils/logger', () => ({
  devlog: { error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}))

vi.mock('@/composables/useYearHeaders', () => ({
  useYearHeaders: () => ({ yearHeaders: ref(['Y1', 'Y2', 'Y3', 'Y4', 'Y5']) }),
}))

vi.mock('@/composables/useApi', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

vi.mock('@/features/plans/stores/planStore', () => ({
  usePlanStore: () => ({ activePlan: { id: 'plan-1' } }),
}))

vi.mock('@/features/scenarios/stores/scenarioStore', () => ({
  useScenarioStore: () => ({ activeScenario: { id: 'sc-1' } }),
}))

vi.mock('@/features/pnl/stores/pnlStore', () => ({
  usePnlStore: () => pnlStoreState,
}))

vi.mock('@/features/fiplan/stores/fiplanStore', () => ({
  useFiplanStore: () => fiplanStoreState,
}))

vi.mock('@/features/bsheet/stores/bsheetStore', () => ({
  useBSheetStore: () => ({ report: null, loading: false, fetchReport: vi.fn() }),
}))

vi.mock('@/features/capex/stores/capexStore', () => ({
  useCapexStore: () => capexStoreState,
}))

vi.mock('@/stores/displayUnit', () => ({
  useDisplayUnitStore: () => {
    const factors: Record<string, number> = { '€': 1, 'k€': 1_000, 'M€': 1_000_000 }
    const decimals: Record<string, number> = { '€': 0, 'k€': 1, 'M€': 2 }
    return {
      get unit()    { return displayUnitState.unit },
      get factor()  { return factors[displayUnitState.unit] },
      get decimals(){ return decimals[displayUnitState.unit] },
      setUnit: (u: '€' | 'k€' | 'M€') => { displayUnitState.unit = u },
    }
  },
}))

// ── Shared PrimeVue stubs ─────────────────────────────────────────────────────

const primevueStubs = {
  DataTable:       { template: '<div class="dt"><slot name="body" :data="{}" /></div>', props: ['value', 'rowGroupMode', 'groupRowsBy', 'scrollable', 'scrollHeight', 'showGridlines', 'size'] },
  Column:          { template: '<div><slot name="header" /><slot name="body" :data="{}" /></div>', props: ['field', 'header', 'frozen', 'class', 'style'] },
  InputNumber:     { template: '<input />', props: ['modelValue', 'minFractionDigits', 'maxFractionDigits', 'locale', 'mode', 'suffix'] },
  Tabs:            { template: '<div><slot /></div>' },
  TabList:         { template: '<div><slot /></div>' },
  Tab:             { template: '<div><slot /></div>' },
  TabPanels:       { template: '<div><slot /></div>' },
  TabPanel:        { template: '<div><slot /></div>' },
  ProgressSpinner: { template: '<div />' },
  Button:          { template: '<button><slot /></button>', props: ['label','icon','severity','outlined','size','disabled','loading','text'] },
  Select:          { template: '<select />', props: ['modelValue','options','optionLabel','optionValue','pt'] },
  Dialog:          { template: '<div class="dialog"><slot /><slot name="footer" /></div>', props: ['visible','header','modal','closable','style'] },
  KFormLegend:     { template: '<div />' },
  KChart:          { template: '<div />' },
}

// ── Golden values ─────────────────────────────────────────────────────────────

const SALES_BASE    = 1_200_000
const COGS_BASE     =   480_000
const NET_PROFIT    =   250_000
const EBITDA_BASE   =   350_000
const CAPEX_BASE    =   300_000
const DEPR_BASE     =   100_000

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 1: PnlView
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_PNL_REPORT = {
  years: [{
    sales:                 SALES_BASE,
    exportSalesMemo:       0,
    capitalizedProduction: 0,
    storedProduction:      0,
    totalOperatingRevenue: SALES_BASE,
    cogs:                  COGS_BASE,
    externalExpenses:      0,
    totalConsumption:      COGS_BASE,
    addedValue:            SALES_BASE - COGS_BASE,
    taxesAndDuties:        0,
    payrollExpenses:       0,
    ebitda:                EBITDA_BASE,
    depreciation:          0,
    impairment:            0,
    grantsOtherRevenue:    0,
    otherOperatingExp:     0,
    ebit:                  EBITDA_BASE,
    financialRevenues:     0,
    financialExpenses:     0,
    preTaxEarnings:        NET_PROFIT,
    extraordinaryIncome:   0,
    extraordinaryExpense:  0,
    employeeParticipation: 0,
    corporateTax:          0,
    taxCredits:            0,
    netProfit:             NET_PROFIT,
    cashFlow:              NET_PROFIT,
    staffHeadcount:        5,
  }],
}

describe('PnlView — reportTableRows pass raw base-€ values to grid', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    pnlStoreState.report = MOCK_PNL_REPORT
    pnlStoreState.manualEntries = []
  })

  it('sales row value is the raw base-€ value (not pre-scaled)', async () => {
    const { default: PnlView } = await import('@/features/pnl/views/PnlView.vue')
    const wrapper = mount(PnlView, { global: { plugins: [createPinia()], stubs: primevueStubs } })
    const vm = wrapper.vm as any

    const salesRow = vm.reportTableRows.find((r: any) => r.label === 'Net Sales (Products)')
    expect(salesRow).toBeDefined()
    expect(salesRow.values[0]).toBe(SALES_BASE)
  })

  it('COGS row value is the raw base-€ value', async () => {
    const { default: PnlView } = await import('@/features/pnl/views/PnlView.vue')
    const wrapper = mount(PnlView, { global: { plugins: [createPinia()], stubs: primevueStubs } })
    const vm = wrapper.vm as any

    const cogsRow = vm.reportTableRows.find((r: any) => r.label === 'COGS')
    expect(cogsRow).toBeDefined()
    expect(cogsRow.values[0]).toBe(COGS_BASE)
  })

  it('net profit row value is the raw base-€ value', async () => {
    const { default: PnlView } = await import('@/features/pnl/views/PnlView.vue')
    const wrapper = mount(PnlView, { global: { plugins: [createPinia()], stubs: primevueStubs } })
    const vm = wrapper.vm as any

    const npRow = vm.reportTableRows.find((r: any) => r.label === 'Net Profit')
    expect(npRow).toBeDefined()
    expect(npRow.values[0]).toBe(NET_PROFIT)
  })

  it('all reportTableRows have numeric values (not strings, not NaN)', async () => {
    const { default: PnlView } = await import('@/features/pnl/views/PnlView.vue')
    const wrapper = mount(PnlView, { global: { plugins: [createPinia()], stubs: primevueStubs } })
    const vm = wrapper.vm as any

    for (const row of vm.reportTableRows) {
      for (const v of row.values) {
        expect(typeof v).toBe('number')
        expect(isNaN(v)).toBe(false)
      }
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 2: FiplanView
// ─────────────────────────────────────────────────────────────────────────────

const zeros5 = ['0', '0', '0', '0', '0']

const MOCK_FIPLAN_REPORT = {
  plan: {
    requirements: {
      capex:            [String(CAPEX_BASE), '0', '0', '0', '0'],
      wcrChange:        zeros5,
      loanRepayments:   zeros5,
      negativeCashFlow: zeros5,
      total:            [String(CAPEX_BASE), '0', '0', '0', '0'],
    },
    resources: {
      positiveCashFlow: zeros5,
      total:            zeros5,
    },
    balance: {
      annualBalance:  [String(-CAPEX_BASE), '0', '0', '0', '0'],
      cumulativeCash: [String(-CAPEX_BASE), '0', '0', '0', '0'],
    },
  },
  cashFlow: {
    operating:  { netProfit: zeros5, depreciation: zeros5, disposalGainLoss: zeros5, wcrChange: zeros5, operatingFlows: zeros5 },
    investing:  { capexOutflow: zeros5, assetDisposals: zeros5, investmentFlows: zeros5 },
    financing:  { capitalIncrease: zeros5, currentAccountCont: zeros5, newLoansAndGrants: zeros5, dividends: zeros5, loanGrantRepayments: zeros5, financingFlows: zeros5 },
    summary:    { initialCash: '0', changeInCash: zeros5, cumulativeCash: zeros5 },
  },
  warning: [true, false, false, false, false],
}

describe('FiplanView — planRows pass raw base-€ values to grid', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fiplanStoreState.entries = []
    fiplanStoreState.report  = MOCK_FIPLAN_REPORT
  })

  it('Capex row carries the raw CAPEX_BASE value (not pre-scaled)', async () => {
    const { default: FiplanView } = await import('@/features/fiplan/views/FiplanView.vue')
    const wrapper = mount(FiplanView, { global: { plugins: [createPinia()], stubs: primevueStubs } })
    const vm = wrapper.vm as any

    const capexRow = vm.planRows.find((r: any) => r.id === 'capex')
    expect(capexRow).toBeDefined()
    expect(capexRow.values[0]).toBe(CAPEX_BASE)
  })

  it('annualBalance row carries the raw negative value (not pre-scaled)', async () => {
    const { default: FiplanView } = await import('@/features/fiplan/views/FiplanView.vue')
    const wrapper = mount(FiplanView, { global: { plugins: [createPinia()], stubs: primevueStubs } })
    const vm = wrapper.vm as any

    const balRow = vm.planRows.find((r: any) => r.id === 'annual_balance')
    expect(balRow).toBeDefined()
    expect(balRow.values[0]).toBe(-CAPEX_BASE)
  })

  it('all non-editable planRows values are numbers (not strings)', async () => {
    const { default: FiplanView } = await import('@/features/fiplan/views/FiplanView.vue')
    const wrapper = mount(FiplanView, { global: { plugins: [createPinia()], stubs: primevueStubs } })
    const vm = wrapper.vm as any

    for (const row of vm.planRows.filter((r: any) => !r.editable)) {
      for (const v of row.values) {
        expect(typeof v).toBe('number')
        expect(isNaN(v)).toBe(false)
      }
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 3: CapexView
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_CAPEX_SUMMARY = {
  totals: {
    totalCapex:        [CAPEX_BASE, 0, 0, 0, 0],
    totalDepreciation: [DEPR_BASE,  0, 0, 0, 0],
    netAssets:         [0, CAPEX_BASE - DEPR_BASE, 0, 0, 0, 0],  // 6 entries (index 0 = opening)
  },
}

describe('CapexView — summaryRows pass raw base-€ values to grid', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    capexStoreState.entries = []
    capexStoreState.summary = MOCK_CAPEX_SUMMARY
  })

  it('Total Capex row carries the raw CAPEX_BASE value', async () => {
    const { default: CapexView } = await import('@/features/capex/views/CapexView.vue')
    const wrapper = mount(CapexView, { global: { plugins: [createPinia()], stubs: primevueStubs } })
    const vm = wrapper.vm as any

    const row = vm.summaryRows.find((r: any) => r.id === 'summary-capex')
    expect(row).toBeDefined()
    expect(row.values[0]).toBe(CAPEX_BASE)
  })

  it('Total Depreciation row carries the raw DEPR_BASE value', async () => {
    const { default: CapexView } = await import('@/features/capex/views/CapexView.vue')
    const wrapper = mount(CapexView, { global: { plugins: [createPinia()], stubs: primevueStubs } })
    const vm = wrapper.vm as any

    const row = vm.summaryRows.find((r: any) => r.id === 'summary-depreciation')
    expect(row).toBeDefined()
    expect(row.values[0]).toBe(DEPR_BASE)
  })

  it('Net Assets row is sliced correctly (6 backend values → 5 display years)', async () => {
    const { default: CapexView } = await import('@/features/capex/views/CapexView.vue')
    const wrapper = mount(CapexView, { global: { plugins: [createPinia()], stubs: primevueStubs } })
    const vm = wrapper.vm as any

    const row = vm.summaryRows.find((r: any) => r.id === 'summary-net-assets')
    expect(row).toBeDefined()
    expect(row.values).toHaveLength(5)
    // Y1 display = index 1 of the 6-entry backend array (index 0 is the opening year)
    expect(row.values[0]).toBe(CAPEX_BASE - DEPR_BASE)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 4: Cross-unit rendering invariant
// ─────────────────────────────────────────────────────────────────────────────

describe('Cross-module unit-scaling invariant — formatUnit is the only scaling step', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it.each([
    ['€',  '1,200,000'],
    ['k€', '1,200.0'  ],
    ['M€', '1.20'     ],
  ] as ['€' | 'k€' | 'M€', string][])(
    'base value 1_200_000 renders as "%s" when unit = %s',
    async (unit, expected) => {
      displayUnitState.unit = unit
      const { useDecimal } = await import('@/composables/useDecimal')
      const { formatUnit } = useDecimal()
      expect(formatUnit(SALES_BASE)).toBe(expected)
    },
  )

  it.each([
    ['€',  '-300,000'],
    ['k€', '-300.0'  ],
    ['M€', '-0.30'   ],
  ] as ['€' | 'k€' | 'M€', string][])(
    'negative base value -300_000 renders as "%s" when unit = %s',
    async (unit, expected) => {
      displayUnitState.unit = unit
      const { useDecimal } = await import('@/composables/useDecimal')
      const { formatUnit } = useDecimal()
      expect(formatUnit(-300_000)).toBe(expected)
    },
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 5: Proportionality when switching units
// ─────────────────────────────────────────────────────────────────────────────

describe('Unit-switching consistency — same base value, proportional display', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('€→k€ reduces displayed numeric value by factor 1000', async () => {
    const { useDecimal } = await import('@/composables/useDecimal')

    displayUnitState.unit = '€'
    const inEuro  = Number(useDecimal().formatUnit(SALES_BASE).replace(/,/g, ''))

    displayUnitState.unit = 'k€'
    const inKEuro = Number(useDecimal().formatUnit(SALES_BASE).replace(/,/g, ''))

    expect(inEuro / inKEuro).toBeCloseTo(1000, 0)
  })

  it('k€→M€ reduces displayed numeric value by factor 1000', async () => {
    const { useDecimal } = await import('@/composables/useDecimal')

    displayUnitState.unit = 'k€'
    const inKEuro = Number(useDecimal().formatUnit(SALES_BASE).replace(/,/g, ''))

    displayUnitState.unit = 'M€'
    const inMEuro = Number(useDecimal().formatUnit(SALES_BASE).replace(/,/g, ''))

    expect(inKEuro / inMEuro).toBeCloseTo(1000, 0)
  })

  it('€→M€ reduces displayed numeric value by factor 1_000_000', async () => {
    const { useDecimal } = await import('@/composables/useDecimal')
    const BASE = 100_000_000

    displayUnitState.unit = '€'
    const inEuro  = Number(useDecimal().formatUnit(BASE).replace(/,/g, ''))

    displayUnitState.unit = 'M€'
    const inMEuro = Number(useDecimal().formatUnit(BASE).replace(/,/g, ''))

    expect(inEuro / inMEuro).toBeCloseTo(1_000_000, -1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 6: Edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe('Unit-scaling edge cases', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('zero formats as a zero-like string in all units', async () => {
    const { useDecimal } = await import('@/composables/useDecimal')
    for (const u of ['€', 'k€', 'M€'] as const) {
      displayUnitState.unit = u
      expect(useDecimal().formatUnit(0).replace(/\s/g, '')).toMatch(/^0/)
    }
  })

  it('100B base € displays in M€ without scientific notation', async () => {
    displayUnitState.unit = 'M€'
    const { useDecimal } = await import('@/composables/useDecimal')
    const result = useDecimal().formatUnit(100_000_000_000)
    expect(result).not.toMatch(/[eE]/)
    // 100,000,000,000 / 1,000,000 = 100,000
    const numeric = Number(result.replace(/[,\s]/g, ''))
    expect(numeric).toBeCloseTo(100_000, 0)
  })

  it('small non-zero value (50 base €) rounds to 0.1 in k€ mode', async () => {
    displayUnitState.unit = 'k€'
    const { useDecimal } = await import('@/composables/useDecimal')
    const result = useDecimal().formatUnit(50)
    const numeric = Number(result.replace(/[,\s]/g, ''))
    // 50 / 1000 = 0.05 → formatted at 1 decimal place → "0.1" (rounds up)
    expect(numeric).toBeCloseTo(0.1, 1)
  })

  it('empty string input formats as zero', async () => {
    displayUnitState.unit = 'k€'
    const { useDecimal } = await import('@/composables/useDecimal')
    expect(useDecimal().formatUnit('')).toBe('0.0')
  })

  it('string "0" input formats as zero in all units', async () => {
    const { useDecimal } = await import('@/composables/useDecimal')
    for (const u of ['€', 'k€', 'M€'] as const) {
      displayUnitState.unit = u
      expect(useDecimal().formatUnit('0').replace(/\s/g, '')).toMatch(/^0/)
    }
  })
})
