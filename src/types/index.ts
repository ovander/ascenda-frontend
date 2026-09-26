// ---- Auth & User ----
// Ascenda tenant roles — enriched by TenantMiddleware from the DB.
// Socrate issues only "user" or "admin" in the JWT; all other values are Ascenda-specific.
export type UserRole = 'admin' | 'owner' | 'editor' | 'reader'
export type PlanRole = 'editor' | 'viewer'

export interface User {
  id: string
  name: string
  email?: string
  role: UserRole // Ascenda RBAC role injected by TenantMiddleware
  /** Commercial plan: 'freemium' | 'pro' | 'enterprise'. For enterprise-tenant members the
   *  backend overrides this with the tenant plan — use tenant.tier as the authoritative source. */
  plan?: string
  isActive?: boolean
}

export interface PlanMember {
  id: string
  planId: string
  userId: string
  role: PlanRole
  grantedBy: string
  createdAt: string
  updatedAt: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface Tenant {
  id: string
  name: string
  slug: string
  logoUrl?: string
  tier: string
  maxPlans: number
  maxUsers: number
  aiCredits: number
}

// ---- Plans & Scenarios ----
export type PlanStatus = 'draft' | 'active' | 'archived'

export interface Plan {
  id: string
  tenantId: string
  name: string
  description: string
  status: PlanStatus
  createdAt: string
  updatedAt: string
}

export interface Scenario {
  id: string
  planId: string
  name: string
  description: string
  isBase: boolean
  createdAt: string
  updatedAt: string
}

// ---- Settings ----
export interface PlanConfig {
  id: string
  scenarioId: string
  language: 'fr' | 'en'
  companyName: string
  forecastStart: string
  firstFiscalYearMonths: number
  salaryMonthsPerYear: number
  employerTaxRate: string
  previousStaff: number
  priorYearTurnover: string
  avgDistributorDiscount: string
  mltInterestRate: string
  discountedSalesPct: string
  billsDiscountRate: string
  avgBillTermMonths: number
  vatRate: string
  corporateTaxRate: string
  taxesAndDutiesRate: string
  interestOnPositiveCash: string
  mltLoanTermYears: number
  currencySymbol: string
  currency?: string          // ISO 4217 code (e.g. 'EUR') — optional, derived field
  discountRate: string
  incentiveCap: string
  country: string
}

export interface PlanConfigComputed extends PlanConfig {
  currentDate: string
  firstCivilYear: number
  overdraftRate: string
  yearHeaders: string[]
  unitLabel: string
}

export interface OpeningBalance {
  id: string
  scenarioId: string
  noncurrentAssets: string
  inventories: string
  customerReceivables: string
  cashAndSecurities: string
  shareCapital: string
  retainedEarnings: string
  loansAndDebt: string
  supplierPayables: string
  socialAndTaxDebts: string
}

export interface OpeningBalanceComputed extends OpeningBalance {
  totalAssets: string
  totalLiabilities: string
  otherPayables: string
}

export interface PaymentTranches {
  days0: string
  days30: string
  days60: string
  days90: string
  days120: string
}

export interface WorkingCapitalConfig {
  id: string
  scenarioId: string
  // Fractions 0–1 (sum ≤ 1 for each party; 120d tranche is auto-computed as 1 - sum)
  customerPct0Days: string
  customerPct30Days: string
  customerPct60Days: string
  customerPct90Days: string
  supplierPct0Days: string
  supplierPct30Days: string
  supplierPct60Days: string
  supplierPct90Days: string
  // Inventory as fraction of COGS per year (0–1)
  inventoryPctYear1: string
  inventoryPctYear2: string
  inventoryPctYear3: string
  inventoryPctYear4: string
  inventoryPctYear5: string
}

// ---- Business Driver Framework ----
export type DriverType =
  | 'generic'
  | 'saas'
  | 'consulting'
  | 'industry'
  | 'marketplace'
  | 'media'
  | 'session_based'
  | 'competition'
  | 'contract'

/** Typed params for the 'consulting' driver */
export interface ConsultingParams {
  headcount: [string, string, string, string, string]
  workingDays: number
  utilizationRate: [string, string, string, string, string]
  monthlyGross: [string, string, string, string, string]
  employerCharges: string
}

/** Typed params for the 'saas' driver */
export interface SaaSParams {
  activeUsers: [number, number, number, number, number]
  monthlyFee: [string, string, string, string, string]
  infraCostPerUser: [string, string, string, string, string]
  supportCostPerUser: [string, string, string, string, string]
  churnRate?: [string, string, string, string, string]
  expansionRate?: [string, string, string, string, string]
}

/** Typed params for the 'industry' driver */
export interface IndustryParams {
  productionCapacity: [number, number, number, number, number]
  scrapRate: [string, string, string, string, string]
  setupCost: [string, string, string, string, string]
}

/** Typed params for the 'marketplace' driver */
export interface MarketplaceParams {
  transactions: [number, number, number, number, number]
  gmvPerTransaction: [string, string, string, string, string]
  takeRate: [string, string, string, string, string]
  paymentCost: [string, string, string, string, string]
  fixedInfraCost: [string, string, string, string, string]
}

/** Typed params for the 'media' driver */
export interface MediaParams {
  impressions: [number, number, number, number, number]
  cpm: [string, string, string, string, string]
  fillRate: [string, string, string, string, string]
  contentCost: [string, string, string, string, string]
  deliveryCostPerImpression: [string, string, string, string, string]
}

/** Typed params for the 'session_based' driver (training, events, workshops) */
export interface SessionBasedParams {
  /** Planned sessions per year (before capacity clamping) */
  sessions: [number, number, number, number, number]
  /** Max participants per session (design capacity) */
  participantsPerSession: [string, string, string, string, string]
  /** Fraction of session capacity actually filled (0–1) */
  fillRate: [string, string, string, string, string]
  /** Revenue per attending participant (€) */
  pricePerParticipant: [string, string, string, string, string]
  /** Number of trainers / facilitators available */
  trainerCount: [string, string, string, string, string]
  /** Max sessions one trainer can deliver per year */
  sessionsPerTrainer: [number, number, number, number, number]
  /** Fraction of trainer capacity actually scheduled (0–1) */
  utilizationRate: [string, string, string, string, string]
  /** Fixed cost per session (trainer fee, venue, materials) (€) */
  trainerCostPerSession: [string, string, string, string, string]
  /** Variable cost per attending participant (€) */
  variableCostPerParticipant: [string, string, string, string, string]
}

type PerYear<T> = [T, T, T, T, T]

/**
 * Typed params for the 'competition' driver (athlete prize money).
 *
 *   gains     = wins × prizePerWin + top10s × prizePerTop10
 *             + (cuts − wins − top10s) × prizePerCut + otherPrizeMoney
 *   volume    = events
 *   costs     = events × (entry + travel + caddie fee)
 *             + coach annual fee
 *             + (caddieShare + coachShare) × gains
 *
 * Counts are JSON numbers (int64 on the backend); money and shares are
 * decimal strings. Shares are fractions of winnings (0.07 = 7 %).
 */
export interface CompetitionParams {
  /** Tour played each year (informational, drives the presets) */
  circuit: PerYear<string>
  events: PerYear<number>
  cuts: PerYear<number>
  /** Top-10 finishes, wins excluded */
  top10s: PerYear<number>
  wins: PerYear<number>
  prizePerWin: PerYear<string>
  prizePerTop10: PerYear<string>
  prizePerCut: PerYear<string>
  /** Prize money outside the main circuit (national championship, invitations) */
  otherPrizeMoney: PerYear<string>
  entryFeePerEvent: PerYear<string>
  travelPerEvent: PerYear<string>
  caddieFeePerEvent: PerYear<string>
  caddieShare: PerYear<string>
  /** Coach's fixed fee for the year */
  coachAnnualFee: PerYear<string>
  coachShare: PerYear<string>
  /**
   * @deprecated First-version coach fee per event. Still costed by the
   * backend (fee × events); the form folds it into coachAnnualFee on load.
   */
  coachFeePerEvent?: PerYear<string>
}

/** One sponsorship or image-rights contract of the 'contract' driver. */
export interface ContractLine {
  partner: string
  /** Fixed value per year; '0' = contract not active that year */
  amounts: PerYear<string>
  /** Paid per competition win in a year the contract is active */
  bonusPerWin: string
}

/**
 * Typed params for the 'contract' driver (sponsorship, image rights).
 *   revenue = Σ amounts + wins × Σ bonusPerWin of contracts active that year
 * Wins come from the scenario's competition products.
 */
export interface ContractParams {
  contracts: ContractLine[]
}

export type DriverParams =
  | ConsultingParams
  | SaaSParams
  | IndustryParams
  | MarketplaceParams
  | MediaParams
  | SessionBasedParams
  | CompetitionParams
  | ContractParams
  | null

// ---- Products ----
export interface Product {
  id: string
  scenarioId: string
  name: string
  productType?: string        // 'service' | 'product' — drives volume label
  sortOrder: number
  /** Business Driver Framework — Phase 1 */
  driverType: DriverType
  driverParams?: DriverParams
}

export interface ProductAssumption {
  id: string
  productId: string
  yearIndex: number
  rawMaterialCost: string
  royaltiesCost: string
  logisticsCost: string
  costCoefficient: string
  baseUnitPrice: string
  priceCoefficient: string
}

/**
 * Response from GET /{productId}/driver/bundle
 * Contains driver-computed volumes and assumptions (post-override).
 * For generic products these are identical to the stored rows.
 */
export interface ProductDerivedBundle {
  /** Y1..Y5 volumes derived from DriverParams (or stored if generic) */
  volumes: ProductSalesVolume[]
  /** Y1..Y5 assumption rows after driver override (index 0 = Y1) */
  assumptions: ProductAssumption[]
}

export type GeoZone = 'france' | 'europe' | 'export'
export type SalesChannel = 'direct' | 'indirect'

export interface ProductSalesVolume {
  id: string
  productId: string
  yearIndex: number
  zone: GeoZone
  channel: SalesChannel
  unitsSold: number
}

export interface ProductDistributorMargin {
  id: string
  productId: string
  yearIndex: number
  zone: GeoZone
  marginPercent: string
}

export interface ProductRevenueSummary {
  productId: string
  productName: string
  years: ProductRevenueYear[]
}

// Matches backend model.ProductRevenueYear JSON fields
export interface ProductRevenueYear {
  year: number
  yearIndex: number
  // Revenue (in k€)
  turnover: string
  europeExportSales: string
  directSalesTotal: string
  // Unit sales
  totalUnitSales: number
  franceUnitSales: number
  europeUnitSales: number
  exportUnitSales: number
  cumulatedUnitSales: number
  directUnitSales: number
  indirectUnitSales: number
  // Cost & margin
  cogs: string
  grossMargin: string
  grossMarginPct: string
}

// Matches backend model.ConsolidatedRevenueYear JSON fields
export interface ConsolidatedRevenueYear {
  year: number
  totalTurnover: string
  totalDirectSales: string
  totalIndirectSales: string
  europeExportSales: string
  totalCogs: string
  totalGrossMargin: string
  grossMarginPct: string
  totalUnitSales: number
}

export interface ConsolidatedRevenue {
  scenarioId: string
  products: ProductRevenueSummary[]
  totals: ConsolidatedRevenueYear[]
}

// ---- Staff ----
export type StaffCategory =
  | 'rnd_engineers'
  | 'rnd_product'
  | 'prod_engineers'
  | 'prod_technicians'
  | 'sales_team'
  | 'marketing_team'
  | 'sales_customer_success'
  | 'admin_managers'
  | 'admin_assistants'
  | 'executive_team'
  | 'gna_finance'
  | 'gna_hr'
  | 'gna_it'

export type StaffFunction = 'rnd' | 'production' | 'sales_marketing' | 'ga'

export interface StaffHeadcount {
  id: string
  scenarioId: string
  category: StaffCategory
  yearIndex: number
  fte: string
}

export interface StaffSalary {
  id: string
  scenarioId: string
  category: StaffCategory
  yearIndex: number
  monthlyGrossSalary: string
  annualIncreasePct: string
}

export interface StaffIncentive {
  id: string
  scenarioId: string
  yearIndex: number
  incentivePct: string
  specificIncentives: string
}

export interface StaffPayrollYear {
  yearIndex: number
  totalPayroll: string
  employerCharges: string
  totalWithCharges: string
  incentives: string
  totalStaffCost: string
  byFunction: Record<StaffFunction, string>
}

export interface StaffPayrollSummary {
  scenarioId: string
  years: StaffPayrollYear[]
}

// ---- Capex ----
export type AssetCategory =
  | 'land'
  | 'intangible_business'
  | 'buildings'
  | 'setup_expenses'
  | 'patents_trademarks'
  | 'rnd_expenses'
  | 'other_intangible'
  | 'prototypes'
  | 'equipment_tools'
  | 'office_furniture'
  | 'computer_hw_sw'
  | 'vehicles'
  | 'other_tangible'
  | 'financial'

export interface CapexEntry {
  id: string
  scenarioId: string
  category: AssetCategory
  yearIndex: number
  amount: string
  depreciationYears: number
  isManualOverride: boolean
}

export interface CapexCategoryRow {
  category: string
  isDepreciable: boolean
  isStaffLinked: boolean
  depreciationYears: number
  years: string[] // [5] — one per forecast year
}

export interface CapexDepreciationRow {
  category: string
  depreciationYears: number
  years: string[] // [5] — one per forecast year
}

export interface CapexTotals {
  totalCapex: string[]        // [5]
  previousNetAssets: string
  priorDepreciation: string[] // [5]
  totalDepreciation: string[] // [5]
  netAssets: string[]         // [6] — index 0 = previous, 1-5 = end-of-year
}

export interface CapexSummary {
  investments: CapexCategoryRow[]
  totals: CapexTotals
  depreciationSchedule: CapexDepreciationRow[]
}

// ---- OpexPerHire (Settings §8) ----
export interface OpexPerHire {
  id: string
  scenarioId: string
  propertyRentals: string         // k€ base annual rent (year 1)
  postageTelecom: string          // k€/person/year
  suppliesPurchases: string       // k€/person/year
  studiesDocumentation: string    // k€/person/year
  insuranceCostsPctSales: string  // decimal — e.g. "0.005" = 0.5%
  royaltyPaymentsPctSales: string // decimal — e.g. "0.01"  = 1%
  travelTransportation: string    // k€/person/year
  missionRepresentation: string   // k€/person/year
  recruitTrainingPctPayroll: string // decimal — e.g. "0.03" = 3%
}

// ---- Opex ----
export interface OpexManualEntry {
  id: string
  scenarioId: string
  lineId: string
  yearIndex: number
  amount: string
}

// Matches backend model.OpexLineResult
export interface OpexLineResult {
  lineId: string
  isUserInput: boolean
  costDriver: string
  years: string[] // [5] — one per forecast year (decimal serialized as string)
}

// Matches backend model.OpexSubcategoryResult
export interface OpexSubcategoryResult {
  subcategory: string
  lines: OpexLineResult[]
  subtotal: string[] // [5]
}

// Matches backend model.OpexSummary
export interface OpexSummary {
  subcategories: OpexSubcategoryResult[] // array, NOT a Record
  grandTotal: string[]                   // [5]
}

// Legacy alias kept for any remaining references
export type OpexLine = OpexLineResult

// ---- P&L ----
export interface PnlManualEntry {
  id: string
  scenarioId: string
  lineId: string
  yearIndex: number
  amount: string
}

export interface PnlReportLine {
  lineId: string
  label: string
  values: string[]
  pctOfRevenue: string[]
  isAggregate: boolean
  isInput: boolean
}

// Matches backend model.PnlYear (column-oriented: one object per year)
export interface PnlYear {
  year: number
  yearIndex: number
  sales: number
  exportSalesMemo: number
  capitalizedProduction: number
  storedProduction: number
  totalOperatingRevenue: number
  cogs: number
  inventoryChange: number
  externalExpenses: number
  totalConsumption: number
  addedValue: number
  taxesAndDuties: number
  payrollExpenses: number
  ebitda: number
  depreciation: number
  impairment: number
  grantsOtherRevenue: number
  otherOperatingExp: number
  ebit: number
  financialRevenues: number
  financialExpenses: number
  preTaxEarnings: number
  extraordinaryIncome: number
  extraordinaryExpense: number
  employeeParticipation: number
  corporateTax: number
  taxCredits: number
  netProfit: number
  staffHeadcount: number
  cashFlow: number
  pctOfSales: number
}

// Matches backend GET /pnl/chart — raw per-year arrays (map[string]interface{})
export interface PnlChartData {
  years: number[]
  sales: number[]
  operatingRevenue: number[]
  cogs: number[]
  consumption: number[]
  addedValue: number[]
  payroll: number[]
  ebitda: number[]
  ebitdaPositive: number[]
  ebitdaNegative: number[]
  otherOpex: number[]
  payrollExpenses: number[]
  depreciation: number[]
  ebit: number[]
  financialRevenues: number[]
  financialExpenses: number[]
  preTaxEarnings: number[]
  corporateTax: number[]
  netProfit: number[]
}

// Matches backend model.PnlReport
export interface PnlReport {
  years: PnlYear[]
  chartData: PnlChartData
}

// ---- FiPlan ----
export interface FiplanEntry {
  id: string
  scenarioId: string
  lineId: string
  yearIndex: number
  amount: string
  /** Present on capital_increase entries synced from a cap table round. */
  capTableRoundId?: string
  capTableRoundLabel?: string
}

export interface FiplanReport {
  plan: {
    requirements: {
      capex: string[]
      dividends: string[]
      negativeCashFlow: string[]
      wcrChange: string[]
      loanRepayments: string[]
      grantRepayments: string[]
      total: string[]
    }
    resources: {
      capitalIncrease: string[]
      currentAccountCont: string[]
      positiveCashFlow: string[]
      subsidies: string[]
      otherGrants: string[]
      repayableGrants: string[]
      ltLoans: string[]
      assetSales: string[]
      total: string[]
    }
    balance: {
      annualBalance: string[]
      cumulativeCash: string[]
      bsheetCashCheck: string[]
      initialCash: string
    }
  }
  cashFlow: {
    operating: {
      netProfit: string[]
      depreciation: string[]
      disposalGainLoss: string[]
      cashFlowCaf: string[]
      wcrChange: string[]
      operatingFlows: string[]
    }
    investing: {
      capexOutflow: string[]
      assetDisposals: string[]
      investmentFlows: string[]
    }
    financing: {
      capitalIncrease: string[]
      currentAccountCont: string[]
      newLoansAndGrants: string[]
      dividends: string[]
      loanGrantRepayments: string[]
      financingFlows: string[]
    }
    summary: {
      changeInCash: string[]
      cumulativeCash: string[]
      initialCash: string
    }
  }
  warning: boolean[]
}

// ---- P&L Cash (Anglo-Saxon) ----
export interface PnlCashEntry {
  id: string
  scenarioId: string
  lineId: string
  yearIndex: number
  amount: string
}

// One computed year from the backend ComputePnlCash function.
export interface PnlCashYear {
  year: number
  yearIndex: number
  sales: number
  costOfSales: number
  grossMargin: number
  rdPayroll: number
  outsourcedRd: number
  royaltiesMisc: number
  salesPayroll: number
  advertisingPromo: number
  miscSalesCosts: number
  gaPayroll: number
  insuranceRent: number
  leasedEquip: number
  legalConsulting: number
  travelMisc: number
  depreciation: number
  ebit: number
  interestExpense: number
  subsidies: number
  taxesIncurred: number
  netProfit: number
  salesPct: number
}

// Chart-ready aggregation from the backend.
export interface PnlCashChartData {
  years: number[]
  costOfSales: number[]
  rdProduction: number[]
  salesMarketing: number[]
  generalAdmin: number[]
  ebitNegative: number[]
  ebitPositive: number[]
}

// Full report shape returned by GET /pnl-cash/report.
export interface PnlCashReport {
  years: PnlCashYear[]
  chartData: PnlCashChartData
}

// ---- Balance Sheet ----
// All arrays have 6 elements: index 0 = opening balance, 1-5 = forecast years.

export interface BSheetDetailedAssets {
  noncurrentAssets: number[]
  inventory: number[]
  accountsReceivable: number[]
  cash: number[]
  totalAssets: number[]
}

export interface BSheetDetailedLiabilities {
  shareCapital: number[]
  netProfit: number[]
  retainedEarnings: number[]
  longTermDebt: number[]
  tradePayables: number[]
  socialTaxDebts: number[]
  otherPayables: number[]
  totalLiabilities: number[]
}

export interface BSheetCondensedAssets {
  noncurrentAssets: number[]
  currentAssets: number[]
  cash: number[]
  total: number[]
}

export interface BSheetCondensedLiabilities {
  equity: number[]
  longTermDebt: number[]
  shortTermDebt: number[]
  total: number[]
}

export interface BSheetAnalysis {
  equity: number[]
  longTermDebt: number[]
  permanentCapital: number[]
  shortTermDebt: number[]
  totalSources: number[]
  noncurrentAssets: number[]
  currentAssets: number[]
  cash: number[]
  totalUses: number[]
  workingCapital: number[]
  wcr: number[]
  wcMinusWcr: number[]
  netDebt: number[]
}

export interface BSheetCharts {
  years: number[]
  assetStructure: number[]
  liabilityStructure: number[]
  capitalEmployed: number[]
  capitalInvested: number[]
  wcEmployed: number[]
  wcInvested: number[]
}

export interface BSheetReport {
  detailed: {
    assets: BSheetDetailedAssets
    liabilities: BSheetDetailedLiabilities
  }
  condensed: {
    assets: BSheetCondensedAssets
    liabilities: BSheetCondensedLiabilities
  }
  analysis: BSheetAnalysis
  capital: { employed: number[]; invested: number[] }
  workingCapital: { employed: number[]; invested: number[] }
  equity: number[]
  charts: BSheetCharts
  ncaWarning: boolean[]
}

// ---- Ratios ----
export interface RatiosSalesMargins {
  sales: number[]
  growthRate: number[]
  exportSales: number[]
  exportPct: number[]
  cogs: number[]
  cogsPct: number[]
  grossMarginPct: number[]
}

export interface RatiosOperational {
  staffHeadcount: number[]
  salesPerStaff: number[]
  payrollExpenses: number[]
  payrollPct: number[]
  capitalExpenditure: number[]
  capexPct: number[]
  depreciation: number[]
  externalExpenses: number[]
  advertisingPromo: number[]
  adPromoPct: number[]
}

export interface RatiosProfitability {
  addedValue: number[]
  addedValuePct: number[]
  ebitda: number[]
  ebitdaPct: number[]
  netProfit: number[]
  netProfitPct: number[]
  /** CashFlow = NetProfit + Depreciation (accounting cash flow) */
  cashFlow: number[]
  cashFlowPct: number[]
  /** FreeCashFlow = CashFlow − CapEx − ΔWCR (investable free cash flow) */
  freeCashFlow: number[]
  freeCashFlowPct: number[]
  cashAtEoy: number[]
}

export interface RatiosEquityLeverage {
  initialEquity: number
  capitalIncrease: number[]
  totalEquityEoy: number[]
  netProfitMinusCap: number[]
  /** FinancialReturn = NetProfit / TotalEquityEOY */
  financialReturn: number[]
  /** TotalAssets: denominator of EquityToAssets — included for audit traceability */
  totalAssets: number[]
  /** EquityToAssets = TotalEquityEOY / TotalAssets */
  equityToAssets: number[]
  ltLoans: number[]
  ltLoansToEquity: number[]
  cashFlowToLoans: number[]
  finExpToEbitda: number[]
  /** WCR: working capital requirement in currency (base for WCRRotationDays) */
  wcr: number[]
  /** WCRRotationDays = WCR / Sales × 365 */
  wcrRotationDays: number[]
}

export interface RatiosValuation {
  discountRate: number
  /** NPV = Σ FCF[y] / (1+r)^(y+1) */
  npv: number
  irr: number
  irrValid: boolean
  /** TerminalValue = FCF[4] / max(r, 5%) discounted to today (perpetuity) */
  terminalValue: number
  /** DiscountedValue = NPV + TerminalValue (enterprise value estimate) */
  discountedValue: number
  /** PEMultiple = DiscountedValue / NetProfit[4] (DCF-implied earnings multiple) */
  peMultiple: number
}

export interface RatiosReport {
  years: number[]
  scalingFactor: number
  sales: RatiosSalesMargins
  operational: RatiosOperational
  profitability: RatiosProfitability
  equityLeverage: RatiosEquityLeverage
  valuation: RatiosValuation
}

// ---- WCR ----
export interface WCREntry {
  id: string
  scenarioId: string
  lineId: string
  yearIndex: number
  amount: string
}

export interface WCRCustomers {
  salesExclVat: number[]
  exportExclVat: number[]
  salesInclTax: number[]
  tranches: number[][]
  totalCustomers: number[]
  initialTradeRecv: number
}

export interface WCRInventory {
  cogsBase: number[]
  inventoryPct: number[]
  inventoryValue: number[]
  initialInventory: number
}

export interface WCRSuppliers {
  cogsExclVat: number[]
  externalExclVat: number[]
  capexExclVat: number[]
  totalInclVat: number[]
  tranches: number[][]
  totalSuppliers: number[]
  initialTradePay: number
}

export interface WCRSummaryData {
  customerWcr: number[]
  inventoryWcr: number[]
  supplierWcr: number[]
  basicWcr: number[]
  basicWcrDays: number[]
  initialWcr: number
  wcrChange: number[]
}

export interface WCRFiscalSocialData {
  vatCollected: number[]
  vatDeductible: number[]
  netVatPayable: number[]
  vatDaysOutstanding: number[]
  vatLiability: number[]
  employerCharges: number[]
  employeeCharges: number[]
  totalSocialCharges: number[]
  socialDaysOutstand: number[]
  socialLiability: number[]
  corporateTaxLiab: number[]
  totalFiscalSocial: number[]
}

export interface WCRAdjustmentsData {
  prepaidExpenses: number[]
  deferredRevenue: number[]
  taxReceivables: number[]
  otherAdjustPlus: number[]
  otherAdjustMinus: number[]
  netAdjustment: number[]
}

export interface WCRAdjustedData {
  adjustedWcr: number[]
  adjustedWcrDays: number[]
  adjustedWcrChange: number[]
  initialAdjWcr: number
}

export interface WCRChartsData {
  years: number[]
  customerWcr: number[]
  inventoryWcr: number[]
  supplierWcr: number[]
  fiscalSocialWcr: number[]
  wcrChange: number[]
}

/** Mirrors backend model.WCRConfigSnapshot */
export interface WCRConfigSnapshot {
  /** Tranche delay buckets in days — always [0, 30, 60, 90, 120] */
  days: number[]
  /** Customer allocation weight per bucket; sums to 1 */
  customerPcts: number[]
  /** Supplier allocation weight per bucket; sums to 1 */
  supplierPcts: number[]
  /** Inventory % of COGS, one per plan year */
  inventoryPcts: number[]
}

export interface WCRReport {
  vatRate: number
  customers: WCRCustomers
  inventory: WCRInventory
  suppliers: WCRSuppliers
  summary: WCRSummaryData
  fiscalSocial: WCRFiscalSocialData
  adjustments: WCRAdjustmentsData
  adjusted: WCRAdjustedData
  charts: WCRChartsData
  /** Weighted-average customer collection delay: Σ(customerPct_k × days_k) */
  effectiveDso: number
  /** Weighted-average supplier payment delay: Σ(supplierPct_k × days_k) */
  effectiveDpo: number
  /** Full tranche configuration snapshot for auditability */
  configSnapshot: WCRConfigSnapshot
}

// ---- Cash (Monthly) ----
export interface CashMonthlyOverride {
  id: string
  scenarioId: string
  lineId: string
  yearIndex: number
  month: number
  amount: string
}

export interface CashLine {
  lineId: string
  label: string
  months: string[]
  annualTotal: string
  distributionRule: 'even' | 'lump_m1' | 'from_schedule' | 'manual'
}

export interface CashSection {
  label: string
  lines: CashLine[]
  total: string[]
}

export interface CashReport {
  years: {
    yearIndex: number
    revenue: CashSection
    operating: CashSection
    capex: CashSection
    financing: CashSection
    netCashFlow: string[]
    openingBalance: string[]
    closingBalance: string[]
  }[]
}

// ---- Budget ----
export interface BudgetMonthlyOverride {
  id: string
  scenarioId: string
  lineId: string
  yearIndex: number
  month: number
  amount: string
}

export interface BudgetMonthlyRow {
  lineId: string
  label: string
  section: string
  annual: string
  months: string[]          // [12] decimal strings
  annualTotal: string       // sum of actual monthly values (after overrides)
  isTotal: boolean
  distributionRule: string
}

export interface Budget1Report {
  yearIndex: number
  rows: BudgetMonthlyRow[]
}

export interface Budget2Row {
  lineId: string
  label: string
  values: string[]          // decimal strings
  isTotal: boolean
  isAggregate: boolean
}

export interface Budget2View {
  label: string
  columns: string[]
  rows: Budget2Row[]
}

export interface Budget2Report {
  quarterly: Budget2View
  semiAnnual: Budget2View
  byFunction: Budget2View
  byCostType: Budget2View
}

// ---- Snapshots ----
export interface Snapshot {
  id: string
  scenarioId: string
  version: number
  label: string
  description: string
  reason: string
  createdBy: string
  createdAt: string
  reportHash: string
}

export interface SnapshotDiff {
  snapshot1Id: string
  snapshot2Id: string
  changes: Record<string, any>
}

// ---- Full Report ----
export interface FullPlanOutput {
  revenue: ConsolidatedRevenue
  pnl: PnlReport
  fiplan: FiplanReport
  pnlCash: PnlCashReport
  bsheet: BSheetReport
  ratios: RatiosReport
  wcr: WCRReport
  cash: CashReport
  budget1: Budget1Report
  budget2: Budget2Report
  warnings: ValidationWarning[]
}

export interface ValidationWarning {
  module: string
  severity: 'error' | 'warning' | 'info'
  message: string
  field?: string
}

// ---- API Response ----
export interface ApiError {
  code: number
  message: string
  details?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

// ---- Chart Data ----
export interface ChartDataset {
  label: string
  data: number[]
  backgroundColor?: string | string[]
  borderColor?: string
  type?: string
  stack?: string
}

export interface ChartData {
  labels: string[]
  datasets: ChartDataset[]
}

// ─────────────────────────────────────────────────────────────────────────────
// ---- Cap Table (Pro tier) ----
// ─────────────────────────────────────────────────────────────────────────────

export type ShareholderType = 'founder' | 'investor' | 'employee' | 'other'

export interface Shareholder {
  id: string
  planId: string
  name: string
  type: ShareholderType
  shares: number         // absolute share count
  ownershipPct: string   // decimal string e.g. "34.5"
  investedAmount: string // decimal string, 0 if founder
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface CapTableSummary {
  planId: string
  totalShares: number
  totalInvested: string
  shareholders: Shareholder[]
}

// ─────────────────────────────────────────────────────────────────────────────
// ---- Break-Even Point (Pro tier) ----
// ─────────────────────────────────────────────────────────────────────────────

export type BEPSource = 'manual' | 'imported'
export type BEPPlanStatus = 'draft' | 'validated'
export type BEPSensitivityType = 'revenue' | 'margin' | 'fixed_cost'

export interface BEPSnapshot {
  id: string
  tenantId: string
  scenarioId: string
  label: string
  fiscalYear: number
  periodStart?: string
  periodEnd?: string
  source: BEPSource
  fixedCostsTotal: string        // decimal string
  contributionMarginPct: string  // decimal string [0-100]
  avgOrderValue?: string         // decimal string, optional
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface FixedCostLine {
  id: string
  snapshotId: string
  category: string
  label: string
  amountAnnual: string
  isCustomCategory: boolean
  sortOrder: number
}

export interface VariableCostLine {
  id: string
  snapshotId: string
  category: string
  label: string
  amountPerUnit: string
  isCustomCategory: boolean
  sortOrder: number
}

export interface SensitivityConfig {
  id: string
  snapshotId: string
  analysisType: BEPSensitivityType
  stepSizePct: string
  rangePct: string
  isDefault: boolean
}

export interface OptimisationPlan {
  id: string
  snapshotId: string
  name: string
  status: BEPPlanStatus
  createdBy: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface FixedCostSaving {
  id: string
  planId: string
  fixedCostLineId: string
  savingAmount: string
  newAmount: string
  comment?: string
  pcgAccountRefs?: string[]
}

export interface VariableCostSaving {
  id: string
  planId: string
  variableCostLineId: string
  savingAmount: string
  newAmount: string
  comment?: string
}

export interface PCGAccount {
  code: string
  label: string
  group: string
}

export interface PCGReviewItem {
  id: string
  planId: string
  pcgCode: string
  pcgLabel: string
  checked: boolean
  comment?: string
}

// Compute output types (returned by GET .../report, never persisted)

export interface BEPWarning {
  code: string
  message: string
}

export interface BEPCoreResult {
  bepRevenue: string | null
  bepVolume: string | null
  monthlyBep: string | null
  variableCostPct: string
  variableCostPerOrder: string | null
  warnings: BEPWarning[]
}

export interface EBERow {
  variationPct: string
  revenue: string
  totalCosts: string
  ebe: string
  isNegative: boolean
  isBep: boolean
}

export interface MarginSensRow {
  marginVariationPp: string
  marginPct: string
  bepRevenue: string | null
  isBase: boolean
  isUndefined: boolean
}

export interface FixedCostSensRow {
  costVariationPct: string
  newFixedCosts: string
  marginPct: string
  bepRevenue: string
  isBase: boolean
}

export interface BEPReport {
  snapshotId: string
  core: BEPCoreResult
  ebeTable: EBERow[]
  marginSens: MarginSensRow[]
  costSens: FixedCostSensRow[]
}

export interface OptimisedCostState {
  current: string
  optimised: string
  deltaAbs: string
  deltaPct: string
}

export interface OptimisedBEPReport {
  snapshotId: string
  planId: string
  baselineFixedCosts: string
  baselineMarginPct: string
  baselineBepRevenue: string | null
  baselineBepVolume: string | null
  fixedCosts: OptimisedCostState
  variableCostPerUnit: OptimisedCostState
  marginPct: OptimisedCostState
  optimisedBepRevenue: string | null
  optimisedBepVolume: string | null
  bepRevenueImprovementPct: string | null
  bepVolumeImprovement: string | null
  warnings: BEPWarning[]
}

// ─────────────────────────────────────────────────────────────────────────────
// ---- Scenario-level Cap Table (Enterprise tier) ----
// ─────────────────────────────────────────────────────────────────────────────

export type RoundEventType =
  | 'funding_round'
  | 'conversion'
  | 'stock_split'
  | 'esop_expansion'
  | 'secondary'

/** A single equity event (funding round, conversion, split, etc.). */
export interface CapTableRound {
  id: string
  scenarioId: string
  phaseNumber: number
  label: string
  eventDate?: string
  eventType: RoundEventType
  amountRaisedK: string    // decimal string, k-currency units
  pctGranted: string       // decimal string, percentage
  shareClassType: string
  sortOrder: number
  /** FiPlan sync fields */
  fiscalYearIndex?: number // 0-based (0 = Year 1 … 4 = Year 5)
  fiplanSynced: boolean
  fiplanSyncedAmountK?: string // snapshot of amountRaisedK at last sync
  /** true when amountRaisedK ≠ fiplanSyncedAmountK (computed server-side, never persisted) */
  isSyncAmountDivergent?: boolean
  /** Opening-balance sync fields (founding rounds — FR: capital social) */
  openingBalanceSynced: boolean
  openingBalanceSyncedAmountK?: string // snapshot of amountRaisedK at last sync
  /** true when amountRaisedK ≠ openingBalanceSyncedAmountK (computed server-side, never persisted) */
  isOpeningBalanceDivergent?: boolean
}
