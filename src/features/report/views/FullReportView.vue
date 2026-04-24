<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useReportStore } from '@/features/report/stores/reportStore'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useSettingsStore } from '@/features/settings/stores/settingsStore'
import { useDecimal } from '@/composables/useDecimal'
import { useTierGate } from '@/composables/useTierGate'
import { useDocxGenerator } from '@/features/report/composables/useDocxGenerator'
import Fieldset from 'primevue/fieldset'
import PageContainer from '@/components/layout/PageContainer.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import KSection from '@/components/layout/KSection.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import Message from 'primevue/message'

defineProps<{ planId?: string; sid?: string }>()

const reportStore = useReportStore()
const planStore = usePlanStore()
const settingsStore = useSettingsStore()
const { formatUnit, getLocale } = useDecimal()
const { isPro, gate } = useTierGate()
const { downloadDocxReport, generating } = useDocxGenerator()

function exportDocx() {
  if (!gate('pro', 'Dossier Word / Business Plan')) return
  downloadDocxReport()
}

// ── shared helpers ────────────────────────────────────────────────────────────
interface Row { label: string; bold?: boolean; indent?: boolean; tooltip?: string; [key: string]: unknown }

/** Format a 0-1 ratio as "12.3%" */
function pct(v: number) { return `${(v * 100).toFixed(1)}%` }
/** Format an integer/decimal as abbreviated string for ratio cells */
function fmtN(v: number, decimals = 1) { return v.toFixed(decimals) }

// ── P&L (French format) ───────────────────────────────────────────────────────
const pnlYears = computed(() => reportStore.fullReport?.pnl?.years ?? [])

const pnlRows = computed<Row[]>(() => {
  const years = pnlYears.value
  if (!years.length) return []
  const make = (label: string, field: string, bold = false, indent = false, tooltip?: string): Row => {
    const row: Row = { label, bold, indent, tooltip }
    years.forEach((y, i) => { row[`y${i}`] = Number((y as any)[field] ?? 0) })
    return row
  }
  return [
    make('Sales (Revenue)',       'sales',              true,  false, 'Total revenue from product and service sales, net of returns and discounts.'),
    make('Export Sales (memo)',   'exportSalesMemo',    false, true,  'Memo item: portion of sales made to export markets (already included in Sales).'),
    make('COGS',                  'cogs',               false, false, 'Cost of Goods Sold — direct costs of producing goods or delivering services (raw materials, direct labour, subcontracting).'),
    make('External Expenses',     'externalExpenses',   false, false, 'Indirect operating costs: rent, leasing, professional fees, marketing, travel, and HR expenses.'),
    make('Added Value',           'addedValue',         true,  false, 'Economic value created = Sales − COGS − External Expenses. Measures the wealth generated before labour and tax charges.'),
    make('Taxes & Duties',        'taxesAndDuties',     false, false, 'Business taxes and duties (e.g. local business tax, apprenticeship tax) — excludes corporate income tax.'),
    make('Payroll Expenses',      'payrollExpenses',    false, false, 'Total staff costs including gross salaries and employer social security contributions.'),
    make('EBITDA',                'ebitda',             true,  false, 'Earnings Before Interest, Taxes, Depreciation & Amortization. Proxy for operating cash generation before investments.'),
    make('Depreciation',          'depreciation',       false, false, 'Annual amortisation of fixed assets (non-cash charge). Reduces taxable income without consuming cash.'),
    make('Other Operating Exp',   'otherOperatingExp',  false, false, 'Non-recurring or exceptional operating charges not captured in the standard cost lines.'),
    make('EBIT',                  'ebit',               true,  false, 'Earnings Before Interest & Taxes = EBITDA − Depreciation. Reflects operating profitability.'),
    make('Financial Expenses',    'financialExpenses',  false, false, 'Net cost of debt financing — interest paid on loans minus any financial income received.'),
    make('Pre-Tax Earnings',      'preTaxEarnings',     true,  false, 'Profit before corporate income tax = EBIT − Financial Expenses.'),
    make('Corporate Tax',         'corporateTax',       false, false, 'Income tax payable on pre-tax profit at the applicable corporate tax rate.'),
    make('Net Profit',            'netProfit',          true,  false, 'Bottom-line profit after all charges — the definitive measure of annual profitability.'),
    make('Cash Flow',             'cashFlow',           true,  false, 'Self-financing capacity = Net Profit + Depreciation. Represents cash generated internally before external financing.'),
  ]
})

// ── FiPlan ────────────────────────────────────────────────────────────────────
const ratiosYears = computed(() => reportStore.fullReport?.ratios?.years ?? [])

const fiplanRows = computed<Row[]>(() => {
  const fp = reportStore.fullReport?.fiplan?.plan
  if (!fp) return []
  const make = (label: string, arr: string[], bold = false, indent = false, tooltip?: string): Row => {
    const row: Row = { label, bold, indent, tooltip }
    arr.forEach((v, i) => { row[`y${i}`] = Number(v ?? 0) })
    return row
  }
  return [
    { label: 'REQUIREMENTS', bold: true, isHeader: true },
    make('CapEx',                fp.requirements.capex,             false, true,  'Capital expenditures — cash invested in fixed assets (equipment, property, intangibles).'),
    make('WCR Change',           fp.requirements.wcrChange,         false, true,  'Annual increase in Working Capital Requirement — cash absorbed by growth in receivables/inventory minus supplier credit.'),
    make('Loan Repayments',      fp.requirements.loanRepayments,    false, true,  'Scheduled principal repayments on existing long-term loans during the year.'),
    make('Negative Cash Flow',   fp.requirements.negativeCashFlow,  false, true,  'Operating deficit years where outflows exceed inflows, creating a funding need.'),
    make('Dividends',            fp.requirements.dividends,         false, true,  'Profit distributions paid to shareholders during the year.'),
    make('Total Requirements',   fp.requirements.total,             true,  false, 'Sum of all cash outflows requiring external or internal financing: CapEx + WCR Change + Loan Repayments + Deficits + Dividends.'),
    { label: 'RESOURCES', bold: true, isHeader: true },
    make('Capital Increase',     fp.resources.capitalIncrease,      false, true,  'New equity capital injected by shareholders (share issuances, capital contributions).'),
    make('LT Loans',             fp.resources.ltLoans,              false, true,  'New long-term loan proceeds drawn during the year.'),
    make('Positive Cash Flow',   fp.resources.positiveCashFlow,     false, true,  'Surplus operating cash flow available to self-finance investment needs.'),
    make('Subsidies & Grants',   fp.resources.subsidies,            false, true,  'Non-repayable public or private funding received (innovation grants, investment subsidies).'),
    make('Total Resources',      fp.resources.total,                true,  false, 'Sum of all funding sources: Equity + Loans + Operating Surplus + Subsidies.'),
    { label: 'BALANCE', bold: true, isHeader: true },
    make('Annual Balance',       fp.balance.annualBalance,          false, true,  'Resources minus Requirements for the year. Positive = surplus; negative = funding gap.'),
    make('Cumulative Cash',      fp.balance.cumulativeCash,         true,  false, 'Running total of Annual Balance from business start. Represents the cumulative cash position trajectory.'),
  ]
})

const cashFlowRows = computed<Row[]>(() => {
  const cf = reportStore.fullReport?.fiplan?.cashFlow
  if (!cf) return []
  const make = (label: string, arr: string[], bold = false, indent = false, tooltip?: string): Row => {
    const row: Row = { label, bold, indent, tooltip }
    arr.forEach((v, i) => { row[`y${i}`] = Number(v ?? 0) })
    return row
  }
  return [
    make('Operating Cash Flow',   cf.operating.operatingFlows,    true,  false, 'Cash generated by core business operations = Net Profit + Depreciation − WCR Change.'),
    make('  Net Profit',          cf.operating.netProfit,         false, true,  'Net income for the year — the starting point for the indirect cash flow calculation.'),
    make('  Depreciation',        cf.operating.depreciation,      false, true,  'Non-cash depreciation charge added back since it does not consume cash.'),
    make('  WCR Change',          cf.operating.wcrChange,         false, true,  'Increase in Working Capital Requirement — cash absorbed (negative) or released (positive) by changes in receivables, inventory, and payables.'),
    make('Investing Cash Flow',   cf.investing.investmentFlows,   true,  false, 'Net cash used for investment activities — primarily capital expenditure on fixed assets.'),
    make('  CapEx',               cf.investing.capexOutflow,      false, true,  'Cash paid for acquisitions of fixed assets: equipment, property, intangibles.'),
    make('Financing Cash Flow',   cf.financing.financingFlows,    true,  false, 'Net cash from equity raises, new debt, subsidies, and dividend payments.'),
    make('  Capital Increase',    cf.financing.capitalIncrease,   false, true,  'Cash received from shareholders via new share issuances or capital contributions.'),
    make('  New Loans & Grants',  cf.financing.newLoansAndGrants, false, true,  'Proceeds from new long-term borrowings and non-repayable grants received.'),
    make('  Dividends',           cf.financing.dividends,         false, true,  'Cash paid out to shareholders as dividends (negative = cash outflow).'),
    make('Net Change in Cash',    cf.summary.changeInCash,        true,  false, 'Total net change in cash = Operating + Investing + Financing cash flows.'),
    make('Cumulative Cash',       cf.summary.cumulativeCash,      true,  false, 'Cumulative cash position from business start = prior year cumulative + net change in cash.'),
  ]
})

// ── Functional P&L (Anglo-Saxon) ─────────────────────────────────────────────
const pnlCashYears = computed(() => reportStore.fullReport?.pnlCash?.years ?? [])

const pnlCashRows = computed<Row[]>(() => {
  const years = pnlCashYears.value
  if (!years.length) return []
  const make = (label: string, field: string, bold = false, indent = false, tooltip?: string): Row => {
    const row: Row = { label, bold, indent, tooltip }
    years.forEach((y, i) => { row[`y${i}`] = Number((y as any)[field] ?? 0) })
    return row
  }
  return [
    make('Sales',              'sales',            true,  false, 'Total annual revenue from all product and service lines.'),
    make('Cost of Sales',      'costOfSales',      false, false, 'Direct costs attributable to delivering sales: raw materials, direct labour, subcontracting, and direct overheads.'),
    make('Gross Margin',       'grossMargin',      true,  false, 'Sales minus Cost of Sales. Measures commercial efficiency before functional overhead allocation.'),
    make('R&D Payroll',        'rdPayroll',        false, true,  'Salaries and employer charges for Research & Development staff.'),
    make('Outsourced R&D',     'outsourcedRd',     false, true,  'External R&D costs: consultants, laboratories, and contracted innovation work.'),
    make('Sales Payroll',      'salesPayroll',     false, true,  'Salaries and employer charges for the commercial and sales team.'),
    make('Advertising & Promo','advertisingPromo', false, true,  'Marketing spend: advertising, trade shows, digital marketing, and promotional campaigns.'),
    make('G&A Payroll',        'gaPayroll',        false, true,  'General & Administrative staff costs: management, finance, HR, and support functions.'),
    make('Insurance & Rent',   'insuranceRent',    false, true,  'Facility-related costs: office/factory rent, property insurance, and utilities.'),
    make('Legal & Consulting', 'legalConsulting',  false, true,  'External professional services: legal counsel, auditors, management consultants.'),
    make('Depreciation',       'depreciation',     false, true,  'Annual amortisation of fixed assets allocated across business functions.'),
    make('EBIT',               'ebit',             true,  false, 'Earnings Before Interest & Taxes = Gross Margin minus all functional operating expenses.'),
    make('Interest Expense',   'interestExpense',  false, false, 'Net interest cost on outstanding debt obligations.'),
    make('Subsidies',          'subsidies',        false, false, 'Public or private subsidies recognised as income (e.g. R&D tax credits, innovation grants).'),
    make('Corporate Tax',      'taxesIncurred',    false, false, 'Income tax charge at the applicable corporate tax rate.'),
    make('Net Profit',         'netProfit',        true,  false, 'Final profit after all functional costs, interest, subsidies, and taxes.'),
  ]
})

// ── Balance Sheet (condensed) ─────────────────────────────────────────────────
// Index 0 = opening, 1–5 = Year 1–5
const bsheetCols = computed(() => reportStore.fullReport?.bsheet?.charts?.years ?? [])

const bsheetRows = computed<Row[]>(() => {
  const bs = reportStore.fullReport?.bsheet
  if (!bs) return []
  const ca = bs.condensed.assets
  const cl = bs.condensed.liabilities
  const make = (label: string, arr: number[], bold = false, indent = false, tooltip?: string): Row => {
    const row: Row = { label, bold, indent, tooltip }
    arr.forEach((v, i) => { row[`c${i}`] = v })
    return row
  }
  return [
    { label: 'ASSETS', bold: true, isHeader: true },
    make('Non-Current Assets',  ca.noncurrentAssets, false, true,  'Fixed assets net of depreciation: equipment, property, intangibles, and long-term financial investments.'),
    make('Current Assets',      ca.currentAssets,    false, true,  'Short-term assets convertible to cash within 12 months: trade receivables, inventory, and prepayments.'),
    make('Cash',                ca.cash,             false, true,  'Cash and bank balances available at year-end.'),
    make('Total Assets',        ca.total,            true,  false, 'Sum of all assets = Non-Current Assets + Current Assets + Cash. Must equal Total Liabilities & Equity.'),
    { label: 'LIABILITIES & EQUITY', bold: true, isHeader: true },
    make('Equity',              cl.equity,           false, true,  'Shareholders\' funds = paid-in capital + retained earnings + net profit for the year. Represents the net worth of the business.'),
    make('Long-Term Debt',      cl.longTermDebt,     false, true,  'Loans and financial debt with a maturity of more than one year.'),
    make('Short-Term Debt',     cl.shortTermDebt,    false, true,  'Current liabilities due within 12 months: trade payables, short-term loans, VAT and social charges payable.'),
    make('Total Liabilities',   cl.total,            true,  false, 'Sum of all financing sources = Equity + Long-Term Debt + Short-Term Debt. Must equal Total Assets.'),
  ]
})

// ── Ratios ────────────────────────────────────────────────────────────────────
const ratiosRows = computed<Row[]>(() => {
  const r = reportStore.fullReport?.ratios
  if (!r) return []
  interface RatioRow { label: string; bold?: boolean; pct?: boolean; vals: number[]; tooltip?: string }
  const rows: RatioRow[] = [
    { label: 'Sales',            vals: r.sales.sales,                  bold: true, tooltip: 'Total annual revenue.' },
    { label: 'Sales Growth',     vals: r.sales.growthRate,             pct: true,  tooltip: 'Year-on-year revenue growth rate.' },
    { label: 'Gross Margin %',   vals: r.sales.grossMarginPct,         pct: true,  tooltip: 'Gross profit as a percentage of sales = (Sales − COGS) / Sales.' },
    { label: 'EBITDA',           vals: r.profitability.ebitda,         bold: true, tooltip: 'Earnings Before Interest, Taxes, Depreciation & Amortization.' },
    { label: 'EBITDA %',         vals: r.profitability.ebitdaPct,      pct: true,  tooltip: 'EBITDA margin = EBITDA / Sales. Measures operating cash efficiency.' },
    { label: 'Net Profit',       vals: r.profitability.netProfit,      bold: true, tooltip: 'Bottom-line earnings after all charges, interest, and tax.' },
    { label: 'Net Profit %',     vals: r.profitability.netProfitPct,   pct: true,  tooltip: 'Net margin = Net Profit / Sales.' },
    { label: 'Cash Flow',        vals: r.profitability.cashFlow,       bold: true, tooltip: 'Self-financing capacity = Net Profit + Depreciation.' },
    { label: 'Free Cash Flow',   vals: r.profitability.freeCashFlow,               tooltip: 'Cash Flow minus CapEx and WCR changes — cash freely available after investments.' },
    { label: 'Cash at EoY',      vals: r.profitability.cashAtEoy,                  tooltip: 'Cash and bank balance at the end of the year.' },
    { label: 'Headcount',        vals: r.operational.staffHeadcount,               tooltip: 'Total full-time equivalent (FTE) employees at year-end.' },
    { label: 'Sales / Staff',    vals: r.operational.salesPerStaff,                tooltip: 'Revenue productivity per employee = Sales / Headcount.' },
    { label: 'CapEx',            vals: r.operational.capitalExpenditure,            tooltip: 'Capital expenditure — cash invested in fixed assets during the year.' },
    { label: 'Total Equity EoY', vals: r.equityLeverage.totalEquityEoy, bold: true, tooltip: 'Shareholders\' equity at year-end = paid-in capital + cumulative retained earnings.' },
    { label: 'LT Loans',         vals: r.equityLeverage.ltLoans,                   tooltip: 'Outstanding long-term debt at year-end.' },
    { label: 'WCR (days)',        vals: r.equityLeverage.wcrRotationDays,           tooltip: 'Working Capital Requirement expressed in days of annual sales.' },
  ]
  return rows.map((r2) => {
    const row: Row = { label: r2.label, bold: r2.bold ?? false, tooltip: r2.tooltip }
    r2.vals.forEach((v, i) => { row[`y${i}`] = r2.pct ? pct(v) : v })
    return row
  })
})

// ── WCR ───────────────────────────────────────────────────────────────────────
const wcrRows = computed<Row[]>(() => {
  const w = reportStore.fullReport?.wcr
  if (!w) return []
  const make = (label: string, arr: number[], bold = false, indent = false, tooltip?: string): Row => {
    const row: Row = { label, bold, indent, tooltip }
    arr.forEach((v, i) => { row[`y${i}`] = v })
    return row
  }
  return [
    make('Customer WCR',     w.summary.customerWcr,         false, true,  'Trade receivables tied up in operations = DSO (days) × daily sales. Represents cash owed by customers.'),
    make('Inventory WCR',    w.summary.inventoryWcr,        false, true,  'Stock and work-in-progress value tied up in operations, based on inventory turnover days.'),
    make('Supplier WCR',     w.summary.supplierWcr,         false, true,  'Trade payables owed to suppliers — reduces WCR since it represents free credit received (shown as negative).'),
    make('Basic WCR',        w.summary.basicWcr,            true,  false, 'Customer WCR + Inventory WCR − Supplier WCR. Core cash tied up in the operating cycle.'),
    make('Basic WCR (days)', w.summary.basicWcrDays,        false, false, 'Basic WCR expressed as number of days of annual sales. Useful for benchmarking across periods.'),
    make('WCR Change',       w.summary.wcrChange,           false, false, 'Year-on-year increase in Basic WCR. Positive values represent cash consumed by business growth.'),
    make('VAT Liability',    w.fiscalSocial.vatLiability,   false, true,  'Net VAT collectible from customers minus VAT reclaimable on purchases — payable to tax authorities.'),
    make('Social Charges',   w.fiscalSocial.socialLiability,false, true,  'Employer payroll taxes and social security contributions payable at year-end.'),
    make('Adjusted WCR',     w.adjusted.adjustedWcr,        true,  false, 'Basic WCR plus fiscal and social liabilities. Full picture of short-term cash absorbed by operations.'),
    make('Adj. WCR (days)',  w.adjusted.adjustedWcrDays,    false, false, 'Adjusted WCR expressed as days of annual sales.'),
  ]
})

// ── Cash flow (36-month summary per year) ────────────────────────────────────
const cashSummaryRows = computed<{ label: string; bold?: boolean; months: string[] }[]>(() => {
  const cashYears = reportStore.fullReport?.cash?.years ?? []
  if (!cashYears.length) return []

  const months: string[] = []
  cashYears.forEach((cy) => {
    cy.revenue.total.forEach((v) => months.push(v))
  })
  // Build section rows from first year as template; extend to all 3 years
  return cashYears.map((cy, yi) => ({
    label: `Year ${yi + 1}`,
    bold: false,
    revenue: cy.revenue.total.reduce((s, v) => s + Number(v), 0),
    operating: cy.operating.total.reduce((s, v) => s + Number(v), 0),
    netCash: cy.netCashFlow.reduce((s, v) => s + Number(v), 0),
    closingBalance: Number(cy.closingBalance[cy.closingBalance.length - 1] ?? 0),
  })) as any
})

// ── Budget ────────────────────────────────────────────────────────────────────
const BUDGET_LINE_TOOLTIPS: Record<string, string> = {
  sales_revenue:   'Revenue from core product and service sales.',
  other_revenue:   'Secondary or non-recurring income streams.',
  total_revenue:   'Total Revenue = Sales Revenue + Other Revenue.',
  raw_materials:   'Direct cost of raw materials consumed in production.',
  subcontracting:  'External production work contracted to third parties.',
  direct_labor:    'Wages and charges for production staff directly tied to output.',
  total_cogs:      'Total Cost of Goods Sold = Raw Materials + Subcontracting + Direct Labour.',
  gross_margin:    'Gross Margin = Total Revenue − Total COGS.',
  rent_expenses:   'Rent for offices, factories, and other facilities.',
  leasing_expenses:'Leasing and operating lease charges (equipment, vehicles).',
  prof_fees:       'Professional service fees: legal, audit, consulting.',
  royalties:       'Royalties paid for use of intellectual property or licences.',
  travel_expenses: 'Staff travel, accommodation, and business expense reimbursements.',
  marketing_exp:   'Marketing and advertising spend (campaigns, events, digital).',
  hr_expenses:     'HR-related costs: recruitment, training, employee benefits.',
  total_external:  'Total External Expenses = sum of all indirect operating costs.',
  payroll:         'Total gross salaries and employer social contributions.',
  incentives:      'Variable bonus and incentive payments to staff.',
  total_staff:     'Total Staff Costs = Payroll + Incentives.',
  taxes_duties:    'Business taxes and local duties (excluding corporate income tax).',
  ebitda:          'EBITDA = Gross Margin − External Expenses − Staff Costs − Taxes & Duties.',
  depreciation:    'Annual amortisation of fixed assets (non-cash charge).',
  ebit:            'EBIT = EBITDA − Depreciation.',
  financial_income:'Interest and investment income received.',
  financial_exp:   'Interest expense on loans and financial charges paid.',
  pre_tax_profit:  'Pre-Tax Profit = EBIT + Financial Income − Financial Expense.',
  corporate_tax:   'Corporate income tax at the applicable rate.',
  net_profit:      'Net Profit = Pre-Tax Profit − Corporate Tax.',
}

const budget1Rows = computed(() =>
  (reportStore.fullReport?.budget1?.rows ?? []).filter((r) => r.isTotal)
)
const budget2Rows = computed(() =>
  reportStore.fullReport?.budget2?.quarterly?.rows ?? []
)
const budget2Cols = computed(() =>
  reportStore.fullReport?.budget2?.quarterly?.columns ?? []
)

// ── section toggle ────────────────────────────────────────────────────────────
const expandedSections = ref<Record<string, boolean>>({
  revenue: true,
  pnl: true,
  fiplan: false,
  pnlCash: false,
  bsheet: false,
  ratios: false,
  wcr: false,
  cash: false,
  budget: false,
})

const criticalWarnings = computed(() =>
  reportStore.warnings.filter((w) => w.severity === 'error')
)
const allWarnings = computed(() => reportStore.warnings)

onMounted(async () => {
  if (planStore.activePlan && settingsStore.config) {
    await reportStore.fetchFullReport()
  }
})

function toggleSection(key: string) {
  expandedSections.value[key] = !expandedSections.value[key]
}

function exportPDF() {
  const r = reportStore.fullReport
  if (!r) return

  const locale = getLocale()
  const currency = settingsStore.config?.currency ?? 'EUR'

  function fmt(v: string | number | null | undefined): string {
    const n = typeof v === 'string' ? parseFloat(v) : Number(v ?? 0)
    if (!isFinite(n)) return '—'
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
  }
  function fmtPct(v: number) { return isFinite(v) ? `${(v * 100).toFixed(1)}%` : '—' }

  const TH  = 'padding:4px 8px;font-size:9px;font-weight:600;text-align:right;white-space:nowrap;background:#1e3a5f;color:#fff;'
  const THL = 'padding:4px 8px;font-size:9px;font-weight:600;text-align:left;background:#1e3a5f;color:#fff;'

  // ── generic pivot-row table builder ────────────────────────────────────────
  function buildPivotTable(
    title: string,
    rows: Row[],
    years: (number | string)[],
    keyPrefix: string,
    opts: { pctKeys?: string[] } = {},
  ): string {
    const yrCols = years.map((y) => `<th style="${TH}">${y}</th>`).join('')
    const bodyRows = rows.map((row) => {
      if ((row as any).isHeader) {
        return `<tr><td colspan="${years.length + 1}"
          style="padding:4px 8px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;background:#e8f0fe;color:#1e3a5f;border-top:1px solid #c3d3ee;">
          ${row.label}</td></tr>`
      }
      const bg = row.bold ? '#f0f9ff' : '#fff'
      const fw = row.bold ? '700' : '400'
      const lpad = row.indent ? 'padding-left:20px;' : ''
      const label = `<td style="padding:3px 8px;font-size:8.5px;font-weight:${fw};background:${bg};white-space:nowrap;${lpad}">${row.label}</td>`
      const cells = years.map((_, i) => {
        const val = row[`${keyPrefix}${i}`]
        const n = typeof val === 'string' ? parseFloat(val) : Number(val ?? 0)
        const isPct = opts.pctKeys?.some((k) => row.label?.toLowerCase().includes(k))
        const display = isPct ? fmtPct(n) : fmt(n)
        const color = isFinite(n) && n < 0 ? 'color:#dc2626;' : ''
        return `<td style="padding:3px 8px;font-size:8px;text-align:right;background:${bg};${color}font-weight:${fw};">${display}</td>`
      }).join('')
      return `<tr>${label}${cells}</tr>`
    }).join('')

    return `
      <div style="margin-bottom:28px;page-break-inside:avoid;">
        <h2 style="font-size:12px;font-weight:700;color:#1e3a5f;margin:0 0 6px;padding-bottom:4px;border-bottom:2px solid #1e3a5f;">${title}</h2>
        <table style="border-collapse:collapse;width:100%;">
          <thead><tr><th style="${THL}">Line Item</th>${yrCols}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>`
  }

  // ── revenue table ──────────────────────────────────────────────────────────
  function buildRevenueTable(): string {
    const rows = r!.revenue?.totals ?? []
    const bodyRows = rows.map((row) => {
      const margin = isFinite(Number(row.grossMarginPct)) ? fmtPct(Number(row.grossMarginPct)) : '—'
      return `<tr>
        <td style="padding:3px 8px;font-size:8.5px;">${row.year}</td>
        <td style="padding:3px 8px;font-size:8px;text-align:right;">${fmt(row.totalTurnover)}</td>
        <td style="padding:3px 8px;font-size:8px;text-align:right;">${fmt(row.totalCogs)}</td>
        <td style="padding:3px 8px;font-size:8px;text-align:right;">${fmt(row.totalGrossMargin)}</td>
        <td style="padding:3px 8px;font-size:8px;text-align:right;">${margin}</td>
        <td style="padding:3px 8px;font-size:8px;text-align:right;">${Number(row.totalUnitSales).toLocaleString(locale)}</td>
      </tr>`
    }).join('')
    return `
      <div style="margin-bottom:28px;page-break-inside:avoid;">
        <h2 style="font-size:12px;font-weight:700;color:#1e3a5f;margin:0 0 6px;padding-bottom:4px;border-bottom:2px solid #1e3a5f;">Revenue Summary</h2>
        <table style="border-collapse:collapse;width:60%;">
          <thead><tr>
            <th style="${THL}">Year</th>
            <th style="${TH}">Turnover</th>
            <th style="${TH}">COGS</th>
            <th style="${TH}">Gross Margin</th>
            <th style="${TH}">Margin %</th>
            <th style="${TH}">Unit Sales</th>
          </tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>`
  }

  // ── cash flow summary table ───────────────────────────────────────────────
  function buildCashSummaryTable(): string {
    const years = r!.cash?.years ?? []
    const bodyRows = years.map((cy, yi) => {
      const revenue = cy.revenue.total.reduce((s, v) => s + Number(v), 0)
      const operating = cy.operating.total.reduce((s, v) => s + Number(v), 0)
      const net = cy.netCashFlow.reduce((s, v) => s + Number(v), 0)
      const closing = Number(cy.closingBalance[cy.closingBalance.length - 1] ?? 0)
      const netColor = net < 0 ? 'color:#dc2626;' : 'color:#15803d;'
      const closeColor = closing < 0 ? 'color:#dc2626;' : ''
      return `<tr>
        <td style="padding:3px 8px;font-size:8.5px;font-weight:600;">Year ${yi + 1}</td>
        <td style="padding:3px 8px;font-size:8px;text-align:right;">${fmt(revenue)}</td>
        <td style="padding:3px 8px;font-size:8px;text-align:right;color:#dc2626;">${fmt(operating)}</td>
        <td style="padding:3px 8px;font-size:8px;text-align:right;font-weight:700;${netColor}">${fmt(net)}</td>
        <td style="padding:3px 8px;font-size:8px;text-align:right;font-weight:700;${closeColor}">${fmt(closing)}</td>
      </tr>`
    }).join('')
    return `
      <div style="margin-bottom:28px;page-break-inside:avoid;">
        <h2 style="font-size:12px;font-weight:700;color:#1e3a5f;margin:0 0 6px;padding-bottom:4px;border-bottom:2px solid #1e3a5f;">Cash Flow (Annual Summary)</h2>
        <table style="border-collapse:collapse;width:55%;">
          <thead><tr>
            <th style="${THL}">Period</th>
            <th style="${TH}">Revenue</th>
            <th style="${TH}">Operating Out</th>
            <th style="${TH}">Net Cash Flow</th>
            <th style="${TH}">Closing Balance</th>
          </tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>`
  }

  // ── valuation box ──────────────────────────────────────────────────────────
  function buildValuationBox(): string {
    const v = r!.ratios?.valuation
    if (!v) return ''
    const irr = v.irrValid ? fmtPct(v.irr) : 'N/A'
    return `
      <div style="margin-bottom:28px;padding:10px 14px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;page-break-inside:avoid;">
        <h3 style="font-size:10px;font-weight:700;color:#1e3a5f;margin:0 0 8px;">Valuation Summary</h3>
        <div style="display:flex;gap:40px;font-size:9px;">
          <div><span style="color:#64748b;">NPV</span><br><strong>${fmt(v.npv)}</strong></div>
          <div><span style="color:#64748b;">IRR</span><br><strong>${irr}</strong></div>
          <div><span style="color:#64748b;">Terminal Value</span><br><strong>${fmt(v.terminalValue)}</strong></div>
          <div><span style="color:#64748b;">Discounted Value</span><br><strong>${fmt(v.discountedValue)}</strong></div>
        </div>
      </div>`
  }

  const yrs = ratiosYears.value
  const now = new Date().toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' })
  const planName = planStore.activePlan?.name ?? ''

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Full Financial Report</title>
  <style>
    @page { size: A4 landscape; margin: 10mm 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; background: #fff; }
    .header { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:18px; padding-bottom:6px; border-bottom:3px solid #1e3a5f; }
    .header h1 { font-size:15px; font-weight:800; color:#1e3a5f; }
    .header .meta { font-size:8.5px; color:#64748b; text-align:right; }
    @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
    .report-copyright { position:fixed; bottom:0; left:0; right:0; text-align:center; font-size:7px; color:#94a3b8; padding:2px 0; border-top:1px solid #e2e8f0; background:#fff; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Full Financial Report${planName ? ` — ${planName}` : ''}</h1>
    <div class="meta">Generated ${now}</div>
  </div>

  ${buildRevenueTable()}

  ${buildPivotTable('P&L Statement', pnlRows.value, pnlYears.value.map((y) => y.year), 'y')}

  ${buildPivotTable('Financial Plan — Funding', fiplanRows.value, yrs, 'y')}

  ${buildPivotTable('Financial Plan — Cash Flow Statement', cashFlowRows.value, yrs, 'y')}

  ${buildPivotTable('Functional P&L (Anglo-Saxon)', pnlCashRows.value, pnlCashYears.value.map((y) => y.year), 'y')}

  ${buildPivotTable(
    'Balance Sheet (Condensed)',
    bsheetRows.value,
    bsheetCols.value.map((yr, i) => (i === 0 ? 'Opening' : yr)),
    'c',
  )}

  ${buildPivotTable('Key Ratios', ratiosRows.value, yrs, 'y')}

  ${buildValuationBox()}

  ${buildPivotTable('Working Capital Requirement', wcrRows.value, yrs, 'y')}

  ${buildCashSummaryTable()}

  <div class="report-copyright">© 2026 Ascenda</div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=1200,height=900')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.addEventListener('load', () => { win.focus(); win.print() })
}

// ── DEV audit trail ───────────────────────────────────────────────────────────
function downloadFullReportAuditTrail() {
  const r = reportStore.fullReport
  if (!r) return
  const payload = {
    _meta: {
      exportedAt: new Date().toISOString(),
      source: 'FullReportView audit trail (DEV)',
    },
    revenue: r.revenue,
    pnl: {
      years: r.pnl.years,
    },
    fiplan: r.fiplan,
    pnlCash: {
      years: r.pnlCash.years,
    },
    bsheet: {
      condensed: r.bsheet.condensed,
      analysis: r.bsheet.analysis,
      equity: r.bsheet.equity,
      charts: r.bsheet.charts,
    },
    ratios: r.ratios,
    wcr: {
      summary: r.wcr.summary,
      adjusted: r.wcr.adjusted,
      fiscalSocial: r.wcr.fiscalSocial,
      effectiveDso: r.wcr.effectiveDso,
      effectiveDpo: r.wcr.effectiveDpo,
    },
    cash: {
      years: r.cash.years.map((y) => ({
        yearIndex: y.yearIndex,
        netCashFlow: y.netCashFlow,
        openingBalance: y.openingBalance,
        closingBalance: y.closingBalance,
        revenueTotals: y.revenue.total,
        operatingTotals: y.operating.total,
      })),
    },
    budget1: {
      yearIndex: r.budget1.yearIndex,
      rows: r.budget1.rows,
    },
    budget2: {
      quarterly: r.budget2.quarterly,
    },
    warnings: r.warnings,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `full-report-audit-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <PageContainer>
    <PageHeader>
      <template #title>
        <h1 class="text-lg sm:text-xl md:text-2xl">Full Financial Report</h1>
      </template>
      <template #actions>
        <div class="flex items-center gap-3">
          <!-- DEV ONLY — remove before production -->
          <button
            v-if="reportStore.fullReport"
            title="DEV: download full report audit trail as JSON"
            @click="downloadFullReportAuditTrail"
            style="display:inline-flex; align-items:center; gap:6px; padding:5px 12px; font-size:0.72rem; font-weight:600; color:#92400e; background:#fef3c7; border:1px dashed #f59e0b; border-radius:6px; cursor:pointer; letter-spacing:0.04em"
          >
            <span>⬇ DEV</span>
            <span style="font-weight:400; color:#b45309">audit trail</span>
          </button>
          <Button label="Export PDF" icon="pi pi-download" @click="exportPDF" />
          <Button
            :label="generating ? '…' : (settingsStore.config?.language === 'fr' ? 'Télécharger le dossier' : 'Download Report')"
            icon="pi pi-file-word"
            :disabled="generating"
            :class="isPro ? 'p-button-success' : 'p-button-secondary'"
            @click="exportDocx"
          />
        </div>
      </template>
    </PageHeader>

    <!-- Warnings Banner -->
    <KSection v-if="criticalWarnings.length > 0">
      <Message
        v-for="warning in criticalWarnings"
        :key="warning.field"
        severity="error"
        :text="warning.message"
        class="w-full mb-2"
      />
    </KSection>

    <KSection v-if="reportStore.loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </KSection>

    <div v-else-if="reportStore.fullReport" class="space-y-4">

      <!-- ── Revenue Summary ─────────────────────────────────────────────── -->
      <Fieldset
        :legend="`Revenue Summary (${allWarnings.filter(w => w.module === 'revenue').length} warnings)`"
        :toggleable="true" :collapsed="!expandedSections.revenue"
        @toggle="toggleSection('revenue')"
      >
        <DataTable :value="reportStore.fullReport?.revenue?.totals ?? []" size="small" class="p-datatable-sm">
          <Column field="year" header="Year" />
          <Column header="Total Turnover">
            <template #body="{ data }">{{ formatUnit(Number(data.totalTurnover), 0) }}</template>
          </Column>
          <Column header="COGS">
            <template #body="{ data }">{{ formatUnit(Number(data.totalCogs), 0) }}</template>
          </Column>
          <Column header="Gross Margin">
            <template #body="{ data }">{{ formatUnit(Number(data.totalGrossMargin), 0) }}</template>
          </Column>
          <Column header="Margin %">
            <template #body="{ data }">{{ pct(Number(data.grossMarginPct)) }}</template>
          </Column>
          <Column header="Unit Sales">
            <template #body="{ data }">{{ Number(data.totalUnitSales).toLocaleString(getLocale()) }}</template>
          </Column>
        </DataTable>
      </Fieldset>

      <!-- ── P&L Statement ───────────────────────────────────────────────── -->
      <Fieldset
        :legend="`P&L Statement (${allWarnings.filter(w => w.module === 'pnl').length} warnings)`"
        :toggleable="true" :collapsed="!expandedSections.pnl"
        @toggle="toggleSection('pnl')"
      >
        <DataTable :value="pnlRows" size="small" class="p-datatable-sm">
          <Column header="Line Item">
            <template #body="{ data }">
              <div class="inline-flex items-center gap-1">
                <span :class="[data.bold ? 'font-semibold' : '', data.indent ? 'pl-4 text-gray-500' : '']">{{ data.label }}</span>
                <i v-if="data.tooltip" class="pi pi-info-circle text-xs text-blue-400 cursor-help" v-tooltip.right="{ value: data.tooltip, showDelay: 100 }" />
              </div>
            </template>
          </Column>
          <Column v-for="(yr, idx) in pnlYears" :key="yr.year" :header="`${yr.year}`">
            <template #body="{ data }">
              <span :class="(data[`y${idx}`] as number) < 0 ? 'text-red-600' : ''">
                {{ formatUnit(data[`y${idx}`] as number ?? 0, 0) }}
              </span>
            </template>
          </Column>
        </DataTable>
      </Fieldset>

      <!-- ── Financial Plan ─────────────────────────────────────────────── -->
      <Fieldset
        :legend="`Financial Plan (${allWarnings.filter(w => w.module === 'fiplan').length} warnings)`"
        :toggleable="true" :collapsed="!expandedSections.fiplan"
        @toggle="toggleSection('fiplan')"
      >
        <p class="text-sm font-semibold text-gray-700 mb-2">Funding Plan</p>
        <DataTable :value="fiplanRows" size="small" class="p-datatable-sm mb-4">
          <Column header="Line Item">
            <template #body="{ data }">
              <span v-if="(data as any).isHeader" class="text-xs font-bold uppercase text-gray-500 tracking-wide">{{ data.label }}</span>
              <div v-else class="inline-flex items-center gap-1">
                <span :class="[data.bold ? 'font-semibold' : '', data.indent ? 'pl-4 text-gray-500' : '']">{{ data.label }}</span>
                <i v-if="data.tooltip" class="pi pi-info-circle text-xs text-blue-400 cursor-help" v-tooltip.right="{ value: data.tooltip, showDelay: 100 }" />
              </div>
            </template>
          </Column>
          <Column v-for="(yr, idx) in ratiosYears" :key="yr" :header="`${yr}`">
            <template #body="{ data }">
              <span v-if="!(data as any).isHeader" :class="(data[`y${idx}`] as number) < 0 ? 'text-red-600' : ''">
                {{ data.bold ? formatUnit(data[`y${idx}`] as number ?? 0, 0) : formatUnit(data[`y${idx}`] as number ?? 0, 0) }}
              </span>
            </template>
          </Column>
        </DataTable>

        <p class="text-sm font-semibold text-gray-700 mb-2">Cash Flow Statement</p>
        <DataTable :value="cashFlowRows" size="small" class="p-datatable-sm">
          <Column header="Line Item">
            <template #body="{ data }">
              <div class="inline-flex items-center gap-1">
                <span :class="[data.bold ? 'font-semibold' : '', data.indent ? 'pl-4 text-gray-500' : '']">{{ data.label }}</span>
                <i v-if="data.tooltip" class="pi pi-info-circle text-xs text-blue-400 cursor-help" v-tooltip.right="{ value: data.tooltip, showDelay: 100 }" />
              </div>
            </template>
          </Column>
          <Column v-for="(yr, idx) in ratiosYears" :key="yr" :header="`${yr}`">
            <template #body="{ data }">
              <span :class="(data[`y${idx}`] as number) < 0 ? 'text-red-600' : ''">
                {{ formatUnit(data[`y${idx}`] as number ?? 0, 0) }}
              </span>
            </template>
          </Column>
        </DataTable>
      </Fieldset>

      <!-- ── Functional P&L ─────────────────────────────────────────────── -->
      <Fieldset
        :legend="`Functional P&L (${allWarnings.filter(w => w.module === 'pnlcash').length} warnings)`"
        :toggleable="true" :collapsed="!expandedSections.pnlCash"
        @toggle="toggleSection('pnlCash')"
      >
        <DataTable :value="pnlCashRows" size="small" class="p-datatable-sm">
          <Column header="Line Item">
            <template #body="{ data }">
              <div class="inline-flex items-center gap-1">
                <span :class="[data.bold ? 'font-semibold' : '', data.indent ? 'pl-4 text-gray-500' : '']">{{ data.label }}</span>
                <i v-if="data.tooltip" class="pi pi-info-circle text-xs text-blue-400 cursor-help" v-tooltip.right="{ value: data.tooltip, showDelay: 100 }" />
              </div>
            </template>
          </Column>
          <Column v-for="(yr, idx) in pnlCashYears" :key="yr.year" :header="`${yr.year}`">
            <template #body="{ data }">
              <span :class="(data[`y${idx}`] as number) < 0 ? 'text-red-600' : ''">
                {{ formatUnit(data[`y${idx}`] as number ?? 0, 0) }}
              </span>
            </template>
          </Column>
        </DataTable>
      </Fieldset>

      <!-- ── Balance Sheet ──────────────────────────────────────────────── -->
      <Fieldset
        :legend="`Balance Sheet (${allWarnings.filter(w => w.module === 'bsheet').length} warnings)`"
        :toggleable="true" :collapsed="!expandedSections.bsheet"
        @toggle="toggleSection('bsheet')"
      >
        <DataTable :value="bsheetRows" size="small" class="p-datatable-sm">
          <Column header="Line Item">
            <template #body="{ data }">
              <span v-if="(data as any).isHeader" class="text-xs font-bold uppercase text-gray-500 tracking-wide">{{ data.label }}</span>
              <div v-else class="inline-flex items-center gap-1">
                <span :class="[data.bold ? 'font-semibold' : '', data.indent ? 'pl-4 text-gray-500' : '']">{{ data.label }}</span>
                <i v-if="data.tooltip" class="pi pi-info-circle text-xs text-blue-400 cursor-help" v-tooltip.right="{ value: data.tooltip, showDelay: 100 }" />
              </div>
            </template>
          </Column>
          <Column
            v-for="(yr, idx) in bsheetCols"
            :key="idx"
            :header="idx === 0 ? 'Opening' : `${yr}`"
          >
            <template #body="{ data }">
              <span v-if="!(data as any).isHeader" :class="(data[`c${idx}`] as number) < 0 ? 'text-red-600' : ''">
                {{ formatUnit(data[`c${idx}`] as number ?? 0, 0) }}
              </span>
            </template>
          </Column>
        </DataTable>
      </Fieldset>

      <!-- ── Ratios ─────────────────────────────────────────────────────── -->
      <Fieldset
        :legend="`Ratios (${allWarnings.filter(w => w.module === 'ratios').length} warnings)`"
        :toggleable="true" :collapsed="!expandedSections.ratios"
        @toggle="toggleSection('ratios')"
      >
        <DataTable :value="ratiosRows" size="small" class="p-datatable-sm">
          <Column header="Indicator">
            <template #body="{ data }">
              <div class="inline-flex items-center gap-1">
                <span :class="data.bold ? 'font-semibold' : ''">{{ data.label }}</span>
                <i v-if="data.tooltip" class="pi pi-info-circle text-xs text-blue-400 cursor-help" v-tooltip.right="{ value: data.tooltip, showDelay: 100 }" />
              </div>
            </template>
          </Column>
          <Column v-for="(yr, idx) in ratiosYears" :key="yr" :header="`${yr}`">
            <template #body="{ data }">
              {{ typeof data[`y${idx}`] === 'string'
                  ? data[`y${idx}`]
                  : formatUnit(data[`y${idx}`] as number ?? 0, 0) }}
            </template>
          </Column>
        </DataTable>

        <!-- Valuation box -->
        <div v-if="reportStore.fullReport.ratios.valuation" class="mt-4 p-3 bg-gray-50 rounded text-sm grid grid-cols-3 gap-4">
          <div>
            <span class="text-gray-500">NPV</span>
            <p class="font-semibold">{{ formatUnit(reportStore.fullReport.ratios.valuation.npv, 0) }}</p>
          </div>
          <div>
            <span class="text-gray-500">IRR</span>
            <p class="font-semibold">{{ reportStore.fullReport.ratios.valuation.irrValid ? pct(reportStore.fullReport.ratios.valuation.irr) : 'N/A' }}</p>
          </div>
          <div>
            <span class="text-gray-500">Discounted Value</span>
            <p class="font-semibold">{{ formatUnit(reportStore.fullReport.ratios.valuation.discountedValue, 0) }}</p>
          </div>
        </div>
      </Fieldset>

      <!-- ── Working Capital ────────────────────────────────────────────── -->
      <Fieldset
        :legend="`Working Capital Requirement (${allWarnings.filter(w => w.module === 'wcr').length} warnings)`"
        :toggleable="true" :collapsed="!expandedSections.wcr"
        @toggle="toggleSection('wcr')"
      >
        <div class="flex gap-6 text-sm text-gray-600 mb-3">
          <span>DSO: <strong>{{ fmtN(reportStore.fullReport.wcr.effectiveDso, 0) }} days</strong></span>
          <span>DPO: <strong>{{ fmtN(reportStore.fullReport.wcr.effectiveDpo, 0) }} days</strong></span>
        </div>
        <DataTable :value="wcrRows" size="small" class="p-datatable-sm">
          <Column header="Line Item">
            <template #body="{ data }">
              <div class="inline-flex items-center gap-1">
                <span :class="[data.bold ? 'font-semibold' : '', data.indent ? 'pl-4 text-gray-500' : '']">{{ data.label }}</span>
                <i v-if="data.tooltip" class="pi pi-info-circle text-xs text-blue-400 cursor-help" v-tooltip.right="{ value: data.tooltip, showDelay: 100 }" />
              </div>
            </template>
          </Column>
          <Column v-for="(yr, idx) in ratiosYears" :key="yr" :header="`${yr}`">
            <template #body="{ data }">
              <span :class="(data[`y${idx}`] as number) < 0 ? 'text-red-600' : ''">
                {{ formatUnit(data[`y${idx}`] as number ?? 0, 0) }}
              </span>
            </template>
          </Column>
        </DataTable>
      </Fieldset>

      <!-- ── Cash Flow (36-month summary) ──────────────────────────────── -->
      <Fieldset
        :legend="`Cash Flow (${allWarnings.filter(w => w.module === 'cash').length} warnings)`"
        :toggleable="true" :collapsed="!expandedSections.cash"
        @toggle="toggleSection('cash')"
      >
        <DataTable :value="cashSummaryRows" size="small" class="p-datatable-sm">
          <Column field="label" header="Period" />
          <Column header="Revenue">
            <template #body="{ data }">{{ formatUnit((data as any).revenue, 0) }}</template>
          </Column>
          <Column header="Operating Out">
            <template #body="{ data }">
              <span class="text-red-600">{{ formatUnit((data as any).operating, 0) }}</span>
            </template>
          </Column>
          <Column header="Net Cash Flow">
            <template #body="{ data }">
              <span :class="(data as any).netCash < 0 ? 'text-red-600' : 'text-green-700'">
                {{ formatUnit((data as any).netCash, 0) }}
              </span>
            </template>
          </Column>
          <Column header="Closing Balance (Dec)">
            <template #body="{ data }">
              <span :class="(data as any).closingBalance < 0 ? 'text-red-600 font-semibold' : 'font-semibold'">
                {{ formatUnit((data as any).closingBalance, 0) }}
              </span>
            </template>
          </Column>
        </DataTable>
      </Fieldset>

      <!-- ── Budget ─────────────────────────────────────────────────────── -->
      <Fieldset
        :legend="`Budget (${allWarnings.filter(w => w.module === 'budget').length} warnings)`"
        :toggleable="true" :collapsed="!expandedSections.budget"
        @toggle="toggleSection('budget')"
      >
        <p class="text-sm font-semibold text-gray-700 mb-2">Year 1 — Key Totals</p>
        <DataTable :value="budget1Rows" size="small" class="p-datatable-sm mb-4">
          <Column header="Line Item">
            <template #body="{ data }">
              <div class="inline-flex items-center gap-1">
                <span class="font-semibold">{{ data.label }}</span>
                <i v-if="BUDGET_LINE_TOOLTIPS[data.lineId]" class="pi pi-info-circle text-xs text-blue-400 cursor-help" v-tooltip.right="{ value: BUDGET_LINE_TOOLTIPS[data.lineId], showDelay: 100 }" />
              </div>
            </template>
          </Column>
          <Column header="Annual Total">
            <template #body="{ data }">{{ formatUnit(Number(data.annualTotal), 0) }}</template>
          </Column>
        </DataTable>

        <p class="text-sm font-semibold text-gray-700 mb-2">Year 2 — Quarterly</p>
        <DataTable :value="budget2Rows" size="small" class="p-datatable-sm">
          <Column header="Line Item">
            <template #body="{ data }">
              <div class="inline-flex items-center gap-1">
                <span :class="data.isTotal ? 'font-semibold' : ''">{{ data.label }}</span>
                <i v-if="BUDGET_LINE_TOOLTIPS[data.lineId]" class="pi pi-info-circle text-xs text-blue-400 cursor-help" v-tooltip.right="{ value: BUDGET_LINE_TOOLTIPS[data.lineId], showDelay: 100 }" />
              </div>
            </template>
          </Column>
          <Column
            v-for="(col, idx) in budget2Cols"
            :key="idx"
            :header="col"
          >
            <template #body="{ data }">
              <span :class="[data.isTotal ? 'font-semibold' : '', Number(data.values[idx]) < 0 ? 'text-red-600' : '']">
                {{ formatUnit(Number(data.values[idx] ?? 0), 0) }}
              </span>
            </template>
          </Column>
        </DataTable>
      </Fieldset>

    </div>

    <KSection v-else class="text-center py-12 text-gray-500">
      No report data available. Please configure the scenario.
    </KSection>
  </PageContainer>
</template>

<style scoped>
:deep(.p-fieldset-legend) {
  background-color: #f3f4f6;
}
:deep(.p-fieldset) {
  border-color: #e5e7eb;
}
:deep(.p-datatable .p-datatable-thead > tr > th) {
  background-color: #f9fafb;
  font-size: 0.75rem;
  white-space: nowrap;
}
</style>
