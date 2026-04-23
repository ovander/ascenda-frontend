import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

// ── Mock docx library ─────────────────────────────────────────────────────────
// Use vi.hoisted so mockToBlob is initialised before vi.mock() is hoisted.
const { mockToBlob } = vi.hoisted(() => ({
  mockToBlob: vi.fn().mockResolvedValue(
    new Blob(['docx-content'], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),
  ),
}))

vi.mock('docx', async (importOriginal) => {
  const mod = await importOriginal<typeof import('docx')>()
  return {
    ...mod,
    Packer: { ...mod.Packer, toBlob: mockToBlob },
  }
})

// ── Mock stores ───────────────────────────────────────────────────────────────
const mockFullReport = ref<any>(null)
const mockActivePlan  = ref<any>({ name: 'Test Plan' })
const mockConfig      = ref<any>(null)
const mockGetLocale   = vi.fn(() => 'fr-FR')
const mockFormatUnit  = vi.fn()

vi.mock('@/features/report/stores/reportStore', () => ({
  useReportStore: () => ({ get fullReport() { return mockFullReport.value } }),
}))
vi.mock('@/features/plans/stores/planStore', () => ({
  usePlanStore: () => ({ get activePlan() { return mockActivePlan.value } }),
}))
vi.mock('@/features/settings/stores/settingsStore', () => ({
  useSettingsStore: () => ({ get config() { return mockConfig.value } }),
}))
vi.mock('@/composables/useDecimal', () => ({
  useDecimal: () => ({ getLocale: mockGetLocale, formatUnit: mockFormatUnit }),
}))

// ── Minimal FullPlanOutput fixture ────────────────────────────────────────────
const MINIMAL_REPORT: any = {
  revenue: {
    totals: [
      { year: 2024, totalTurnover: '100', totalDirectSales: '80', totalIndirectSales: '20',
        europeExportSales: '10', totalCogs: '60', totalGrossMargin: '40',
        grossMarginPct: '0.4', totalUnitSales: 500 },
    ],
  },
  pnl: {
    years: [
      { year: 2024, sales: 100, exportSalesMemo: 10, cogs: 60, externalExpenses: 5,
        addedValue: 35, taxesAndDuties: 2, payrollExpenses: 15, ebitda: 18,
        depreciation: 3, otherOperatingExp: 0, ebit: 15, financialExpenses: 2,
        preTaxEarnings: 13, corporateTax: 3, netProfit: 10, cashFlow: 13 },
    ],
  },
  fiplan: {
    plan: {
      requirements: {
        capex: ['10'], wcrChange: ['5'], loanRepayments: ['8'],
        negativeCashFlow: ['0'], dividends: ['0'], total: ['23'],
      },
      resources: {
        capitalIncrease: ['20'], ltLoans: ['10'], positiveCashFlow: ['0'],
        subsidies: ['0'], total: ['30'],
      },
      balance: { annualBalance: ['7'], cumulativeCash: ['7'] },
    },
    cashFlow: {
      operating: { operatingFlows: ['13'], netProfit: ['10'], depreciation: ['3'], wcrChange: ['-2'] },
      investing:  { investmentFlows: ['-10'], capexOutflow: ['-10'] },
      financing:  { financingFlows: ['5'], capitalIncrease: ['5'], newLoansAndGrants: ['0'], dividends: ['0'], loanRepayments: ['-0'] },
      summary:    { changeInCash: ['8'], cumulativeCash: ['8'] },
    },
  },
  bsheet: {
    condensed: {
      assets:      { noncurrentAssets: [10, 8], currentAssets: [5, 6], cash: [2, 10], total: [17, 24] },
      liabilities: { equity: [5, 15], longTermDebt: [8, 6], shortTermDebt: [4, 3], total: [17, 24] },
    },
    charts: { years: [2023, 2024] },
  },
  ratios: {
    years: [2024],
    sales: { sales: [100], growthRate: [0.1], grossMarginPct: [0.4] },
    profitability: {
      ebitda: [18], ebitdaPct: [0.18], netProfit: [10], netProfitPct: [0.1],
      cashFlow: [13], freeCashFlow: [3], cashAtEoy: [10],
    },
    operational: { staffHeadcount: [5], salesPerStaff: [20], capitalExpenditure: [10] },
    equityLeverage: { totalEquityEoy: [15], ltLoans: [6], wcrRotationDays: [45] },
    valuation: { npv: 80, irr: 0.25, irrValid: true, terminalValue: 60, discountedValue: 50 },
  },
  wcr: {
    customers:   { receivables: [8] },
    inventory:   { closing: [4] },
    suppliers:   { payables: [3] },
    fiscalSocial:{ total: [2] },
    summary:     { netWcr: [9] },
    effectiveDso: 30,   // scalar — weighted-average collection delay in days
    effectiveDpo: 25,   // scalar — weighted-average payment delay in days
  },
  cash: { years: [] },
  budget1: { yearIndex: 1, rows: [] },
  budget2: { quarterly: { rows: [], columns: [] } },
  warnings: [],
}

const MINIMAL_CONFIG: any = {
  language: 'fr',
  companyName: 'ACME SAS',
  currency: 'EUR',
  country: 'FR',
  currencySymbol: '€',
  yearHeaders: ['2024'],
  firstCivilYear: 2024,
}

// ── Tests: generateDocxReport ──────────────────────────────────────────────────
import { generateDocxReport } from './useDocxGenerator'

describe('generateDocxReport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockToBlob.mockResolvedValue(new Blob(['content']))
  })

  it('calls Packer.toBlob and returns a Blob', async () => {
    const blob = await generateDocxReport({
      report: MINIMAL_REPORT,
      config:  MINIMAL_CONFIG,
      locale:  'fr-FR',
      currency:'EUR',
    })
    expect(blob).toBeInstanceOf(Blob)
    expect(mockToBlob).toHaveBeenCalledTimes(1)
  })

  it('passes a Document instance to Packer.toBlob', async () => {
    await generateDocxReport({
      report: MINIMAL_REPORT,
      config:  MINIMAL_CONFIG,
      locale:  'fr-FR',
      currency:'EUR',
    })
    const { Document } = await import('docx')
    expect(mockToBlob.mock.calls[0][0]).toBeInstanceOf(Document)
  })

  it('uses French labels when language is "fr" — calls Packer once', async () => {
    // Label correctness is covered by reportLabels.spec.ts.
    // Here we just confirm the generator completes without error for the fr path.
    await expect(
      generateDocxReport({ report: MINIMAL_REPORT, config: { ...MINIMAL_CONFIG, language: 'fr' }, locale: 'fr-FR', currency: 'EUR' })
    ).resolves.toBeInstanceOf(Blob)
    expect(mockToBlob).toHaveBeenCalledTimes(1)
  })

  it('uses English labels when language is "en" — calls Packer once', async () => {
    await expect(
      generateDocxReport({ report: MINIMAL_REPORT, config: { ...MINIMAL_CONFIG, language: 'en' }, locale: 'en-US', currency: 'EUR' })
    ).resolves.toBeInstanceOf(Blob)
    expect(mockToBlob).toHaveBeenCalledTimes(1)
  })

  it('works when optional report sections are missing', async () => {
    const sparse = { ...MINIMAL_REPORT, wcr: null, bsheet: null, ratios: null, fiplan: null }
    await expect(
      generateDocxReport({ report: sparse, config: MINIMAL_CONFIG, locale: 'fr-FR', currency: 'EUR' })
    ).resolves.toBeInstanceOf(Blob)
  })
})

// ── Tests: useDocxGenerator composable ────────────────────────────────────────
import { useDocxGenerator } from './useDocxGenerator'

describe('useDocxGenerator', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockFullReport.value = null
    mockConfig.value     = null
    mockActivePlan.value = { name: 'Test Plan' }
    mockGetLocale.mockReturnValue('fr-FR')
    mockToBlob.mockResolvedValue(new Blob(['content']))
  })

  it('generating starts as false', () => {
    const { generating } = useDocxGenerator()
    expect(generating.value).toBe(false)
  })

  it('does nothing if fullReport is null', async () => {
    mockFullReport.value = null
    mockConfig.value     = MINIMAL_CONFIG
    const { downloadDocxReport } = useDocxGenerator()
    await downloadDocxReport()
    expect(mockToBlob).not.toHaveBeenCalled()
  })

  it('does nothing if config is null', async () => {
    mockFullReport.value = MINIMAL_REPORT
    mockConfig.value     = null
    const { downloadDocxReport } = useDocxGenerator()
    await downloadDocxReport()
    expect(mockToBlob).not.toHaveBeenCalled()
  })

  it('calls Packer.toBlob when report and config are available', async () => {
    mockFullReport.value = MINIMAL_REPORT
    mockConfig.value     = MINIMAL_CONFIG
    const { downloadDocxReport } = useDocxGenerator()

    // Stub document.createElement / URL APIs used for file download
    const mockAnchor = { href: '', download: '', click: vi.fn() }
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined)

    await downloadDocxReport()

    expect(mockToBlob).toHaveBeenCalledTimes(1)
  })

  it('sets generating=true during generation then resets to false', async () => {
    mockFullReport.value = MINIMAL_REPORT
    mockConfig.value     = MINIMAL_CONFIG

    let capturedDuringGeneration = false
    mockToBlob.mockImplementation(async () => {
      await Promise.resolve()
      return new Blob(['x'])
    })

    const mockAnchor = { href: '', download: '', click: vi.fn() }
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined)

    const { downloadDocxReport, generating } = useDocxGenerator()
    const promise = downloadDocxReport()
    capturedDuringGeneration = generating.value
    await promise

    expect(capturedDuringGeneration).toBe(true)
    expect(generating.value).toBe(false)
  })

  it('resets generating to false even if Packer throws', async () => {
    mockFullReport.value = MINIMAL_REPORT
    mockConfig.value     = MINIMAL_CONFIG
    mockToBlob.mockRejectedValue(new Error('pack error'))

    const { downloadDocxReport, generating } = useDocxGenerator()
    await expect(downloadDocxReport()).rejects.toThrow('pack error')
    expect(generating.value).toBe(false)
  })

  it('builds a filename from plan name, language and today date', async () => {
    mockFullReport.value = MINIMAL_REPORT
    mockConfig.value     = { ...MINIMAL_CONFIG, language: 'fr' }
    mockActivePlan.value = { name: 'Mon Plan 2024' }

    const mockAnchor = { href: '', download: '', click: vi.fn() }
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined)

    await useDocxGenerator().downloadDocxReport()

    expect(mockAnchor.download).toMatch(/Mon_Plan_2024_dossier_fr_\d{4}-\d{2}-\d{2}\.docx/)
  })

  it('uses "en" suffix in filename when language is English', async () => {
    mockFullReport.value = MINIMAL_REPORT
    mockConfig.value     = { ...MINIMAL_CONFIG, language: 'en' }

    const mockAnchor = { href: '', download: '', click: vi.fn() }
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined)

    await useDocxGenerator().downloadDocxReport()
    expect(mockAnchor.download).toContain('_en_')
  })
})
