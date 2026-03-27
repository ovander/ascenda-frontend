<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import type { ChartData } from '@/types'
import { useRatiosStore } from '@/features/ratios/stores/ratiosStore'
import { useYearHeaders } from '@/composables/useYearHeaders'
import { useDecimal } from '@/composables/useDecimal'
import { useDisplayUnitStore } from '@/stores/displayUnit'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Card from 'primevue/card'
import Message from 'primevue/message'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Select from 'primevue/select'
import { Bar } from 'vue-chartjs'
import '@/plugins/chartjs'
import KChart from '@/components/common/KChart.vue'
import KFormLegend from '@/components/common/KFormLegend.vue'

defineProps<{ planId?: string; sid?: string }>()

const ratiosStore = useRatiosStore()
const { yearHeaders } = useYearHeaders()
const { formatUnit, formatPercent, getLocale, getUnitLabel } = useDecimal()
const displayUnitStore = useDisplayUnitStore()
const unitLabel = computed(() => getUnitLabel())

onMounted(async () => {
  await ratiosStore.fetchReport()
})

// ── Value formatter ──────────────────────────────────────────────────────────
// Fractions stored as 0-1 use 'percent' (formatPercent already multiplies ×100).
// Absolute amounts use 'currency'. Headcount is 'integer'. Coverage/rotation
// metrics use 'multiple' or 'days'.
type RowFormat = 'currency' | 'percent' | 'integer' | 'multiple' | 'days'

function formatValue(format: RowFormat, value: number | undefined): string {
  if (value === undefined || value === null) return '—'
  switch (format) {
    case 'currency':  return formatUnit(value, 0)
    case 'percent':   return formatPercent(value)          // ×100 + " %"
    case 'integer':   return Math.round(value).toLocaleString(getLocale())
    case 'multiple':  return value.toFixed(1) + '\u00D7'  // e.g. 52.3×
    case 'days':      return value.toFixed(0) + '\u00A0j' // e.g. 126 j
  }
}

// ── Tooltip maps ─────────────────────────────────────────────────────────────
const SALES_TOOLTIPS: Record<string, string> = {
  'Sales':          'Total net revenue from all product and service lines for the year.',
  'Growth Rate':    'Year-over-year revenue growth rate. Not available for year 1 (no prior baseline).',
  'Export Sales':   'Revenue generated from international or export markets.',
  'Export %':       'Export sales as a percentage of total revenue.',
  'COGS':           'Cost of Goods Sold — direct costs of producing or delivering products/services. Flows from revenue module margin assumptions.',
  'COGS %':         'Cost of Goods Sold as a percentage of revenue. Complement of Gross Margin %.',
  'Gross Margin %': 'Revenue minus COGS divided by revenue. The primary top-line efficiency indicator.',
}

const OPERATIONAL_TOOLTIPS: Record<string, string> = {
  'Headcount':           'Total headcount in Full-Time Equivalents (FTE) across all staff categories at year-end.',
  'Sales / Staff':       'Revenue per FTE — productivity and efficiency indicator. Higher is better.',
  'Payroll Expenses':    'Total gross payroll cost across all staff categories (salaries + incentives).',
  'Payroll %':           'Payroll as a percentage of revenue — critical cost-structure metric, especially for service businesses.',
  'Capex':               'Total capital expenditure for the year across all asset categories from the Capex module.',
  'Capex %':             'Capital expenditure as a percentage of revenue — investment intensity indicator.',
  'Depreciation':        'Annual depreciation charge on all depreciable fixed assets. Flows from the Capex module.',
  'External Expenses':   'Third-party costs excluding payroll — subcontracting, professional services, and other externally-sourced costs.',
  'Advertising & Promo': 'Total advertising, communications, trade show, and promotional spend from the OPEX module.',
  'Ad & Promo %':        'Advertising & promotion spend as a percentage of revenue.',
}

const PROFITABILITY_TOOLTIPS: Record<string, string> = {
  'Added Value':   'Revenue minus purchases from third parties — the value created by the company\'s own resources and activities.',
  'Added Value %': 'Added value as a percentage of revenue. Measures vertical integration; higher means less reliance on external inputs.',
  'EBITDA':        'Earnings Before Interest, Taxes, Depreciation & Amortisation. Operating profit before non-cash charges and financing costs.',
  'EBITDA %':      'EBITDA as a percentage of revenue. The most widely used operating margin for business valuation and benchmarking.',
  'Net Profit':    'Bottom-line earnings after all operating costs, depreciation, interest, and taxes.',
  'Net Profit %':  'Net profit as a percentage of revenue — the ultimate measure of bottom-line profitability.',
  'Cash Flow':     'Net profit plus depreciation. Approximates operational cash generation before capex and working capital movements.',
  'Cash Flow %':   'Cash flow (net profit + depreciation) as a percentage of revenue.',
  'Free Cash Flow':'Cash flow minus capital expenditure — the cash genuinely available to investors or for reinvestment after maintaining/growing assets.',
  'FCF %':         'Free cash flow as a percentage of revenue. Negative in heavy investment phases is expected.',
  'Cash at EOY':   'Cash and equivalents at the end of the forecast year. Flows from the balance sheet.',
}

const EQUITY_TOOLTIPS: Record<string, string> = {
  'Total Equity EOY':    'Total shareholders\' equity at year-end: share capital + retained earnings + current net profit.',
  'Financial Return':    'Net profit divided by total equity (ROE). Measures the return earned on shareholders\' investment.',
  'Equity / Assets':     'Total equity as a percentage of total assets — financial autonomy ratio. Higher means less reliance on debt.',
  'LT Loans':            'Outstanding long-term financial debt at year-end. Flows from the Financial Plan module.',
  'LT Loans / Equity':   'Long-term debt as a percentage of equity — gearing ratio. Above 100% signals elevated financial leverage.',
  'Cash Flow / Loans':   'Annual cash flow divided by long-term debt outstanding — debt coverage ratio. Target ≥ 1× means debt could be repaid within the year from cash flow.',
  'Fin. Exp / EBITDA':   'Financial expenses (interest) as a percentage of EBITDA — debt service burden. Above ~30–33% is generally considered elevated.',
  'WCR (currency)':      'Working Capital Requirement in k€ — net operational funding need: inventory + receivables minus trade payables.',
  'WCR Rotation (days)': 'Days of annual sales tied up in working capital. Lower is better; negative means suppliers fund the business cycle.',
}

// ── Table rows ───────────────────────────────────────────────────────────────
const salesMetrics = computed(() => {
  if (!ratiosStore.report) return []
  const r = ratiosStore.report.sales
  const t = SALES_TOOLTIPS
  return [
    { label: 'Sales',           values: [...r.sales],          format: 'currency' as RowFormat, tooltip: t['Sales'] },
    { label: 'Growth Rate',     values: [...r.growthRate],     format: 'percent'  as RowFormat, tooltip: t['Growth Rate'] },
    { label: 'Export Sales',    values: [...r.exportSales],    format: 'currency' as RowFormat, tooltip: t['Export Sales'] },
    { label: 'Export %',        values: [...r.exportPct],      format: 'percent'  as RowFormat, tooltip: t['Export %'] },
    { label: 'COGS',            values: [...r.cogs],           format: 'currency' as RowFormat, tooltip: t['COGS'] },
    { label: 'COGS %',          values: [...r.cogsPct],        format: 'percent'  as RowFormat, tooltip: t['COGS %'] },
    { label: 'Gross Margin %',  values: [...r.grossMarginPct], format: 'percent'  as RowFormat, tooltip: t['Gross Margin %'] },
  ]
})

const operationalMetrics = computed(() => {
  if (!ratiosStore.report) return []
  const r = ratiosStore.report.operational
  const t = OPERATIONAL_TOOLTIPS
  return [
    { label: 'Headcount',           values: [...r.staffHeadcount],    format: 'integer'  as RowFormat, tooltip: t['Headcount'] },
    { label: 'Sales / Staff',       values: [...r.salesPerStaff],     format: 'currency' as RowFormat, tooltip: t['Sales / Staff'] },
    { label: 'Payroll Expenses',    values: [...r.payrollExpenses],   format: 'currency' as RowFormat, tooltip: t['Payroll Expenses'] },
    { label: 'Payroll %',           values: [...r.payrollPct],        format: 'percent'  as RowFormat, tooltip: t['Payroll %'] },
    { label: 'Capex',               values: [...r.capitalExpenditure],format: 'currency' as RowFormat, tooltip: t['Capex'] },
    { label: 'Capex %',             values: [...r.capexPct],          format: 'percent'  as RowFormat, tooltip: t['Capex %'] },
    { label: 'Depreciation',        values: [...r.depreciation],      format: 'currency' as RowFormat, tooltip: t['Depreciation'] },
    { label: 'External Expenses',   values: [...r.externalExpenses],  format: 'currency' as RowFormat, tooltip: t['External Expenses'] },
    { label: 'Advertising & Promo', values: [...r.advertisingPromo],  format: 'currency' as RowFormat, tooltip: t['Advertising & Promo'] },
    { label: 'Ad & Promo %',        values: [...r.adPromoPct],        format: 'percent'  as RowFormat, tooltip: t['Ad & Promo %'] },
  ]
})

const profitabilityMetrics = computed(() => {
  if (!ratiosStore.report) return []
  const r = ratiosStore.report.profitability
  const t = PROFITABILITY_TOOLTIPS
  return [
    { label: 'Added Value',    values: [...r.addedValue],              format: 'currency' as RowFormat, tooltip: t['Added Value'] },
    { label: 'Added Value %',  values: [...r.addedValuePct],           format: 'percent'  as RowFormat, tooltip: t['Added Value %'] },
    { label: 'EBITDA',         values: [...r.ebitda],                  format: 'currency' as RowFormat, tooltip: t['EBITDA'] },
    { label: 'EBITDA %',       values: [...r.ebitdaPct],               format: 'percent'  as RowFormat, tooltip: t['EBITDA %'] },
    { label: 'Net Profit',     values: [...r.netProfit],               format: 'currency' as RowFormat, tooltip: t['Net Profit'] },
    { label: 'Net Profit %',   values: [...r.netProfitPct],            format: 'percent'  as RowFormat, tooltip: t['Net Profit %'] },
    { label: 'Cash Flow',      values: [...r.cashFlow],                format: 'currency' as RowFormat, tooltip: t['Cash Flow'] },
    { label: 'Cash Flow %',    values: [...r.cashFlowPct],             format: 'percent'  as RowFormat, tooltip: t['Cash Flow %'] },
    { label: 'Free Cash Flow', values: [...(r.freeCashFlow ?? [])],    format: 'currency' as RowFormat, tooltip: t['Free Cash Flow'] },
    { label: 'FCF %',          values: [...(r.freeCashFlowPct ?? [])], format: 'percent'  as RowFormat, tooltip: t['FCF %'] },
    { label: 'Cash at EOY',    values: [...r.cashAtEoy],               format: 'currency' as RowFormat, tooltip: t['Cash at EOY'] },
  ]
})

const equityMetrics = computed(() => {
  if (!ratiosStore.report) return []
  const r = ratiosStore.report.equityLeverage
  const t = EQUITY_TOOLTIPS
  return [
    { label: 'Total Equity EOY',    values: [...r.totalEquityEoy],  format: 'currency' as RowFormat, tooltip: t['Total Equity EOY'] },
    { label: 'Financial Return',    values: [...r.financialReturn], format: 'percent'  as RowFormat, tooltip: t['Financial Return'] },
    { label: 'Equity / Assets',     values: [...r.equityToAssets],  format: 'percent'  as RowFormat, tooltip: t['Equity / Assets'] },
    { label: 'LT Loans',            values: [...r.ltLoans],         format: 'currency' as RowFormat, tooltip: t['LT Loans'] },
    { label: 'LT Loans / Equity',   values: [...r.ltLoansToEquity], format: 'percent'  as RowFormat, tooltip: t['LT Loans / Equity'] },
    { label: 'Cash Flow / Loans',   values: [...r.cashFlowToLoans], format: 'multiple' as RowFormat, tooltip: t['Cash Flow / Loans'] },
    { label: 'Fin. Exp / EBITDA',   values: [...r.finExpToEbitda],  format: 'percent'  as RowFormat, tooltip: t['Fin. Exp / EBITDA'] },
    { label: 'WCR (currency)',       values: [...(r.wcr ?? [])],     format: 'currency' as RowFormat, tooltip: t['WCR (currency)'] },
    { label: 'WCR Rotation (days)', values: [...r.wcrRotationDays], format: 'days'     as RowFormat, tooltip: t['WCR Rotation (days)'] },
  ]
})

const valuationMetrics = computed(() => ratiosStore.report?.valuation ?? null)

// ── DEV audit trail ──────────────────────────────────────────────────────────
function downloadAuditTrail() {
  if (!ratiosStore.report) return
  const payload = {
    _meta: {
      exportedAt: new Date().toISOString(),
      source: 'RatiosView audit trail (DEV)',
    },
    report: ratiosStore.report,
    derivedCharts: {
      marginCascadeChart: marginCascadeChart.value,
      profitabilityChart: profitabilityChart.value,
      equityRatiosChart: equityRatiosChart.value,
      coverageChart: coverageChart.value,
      salesMarginsChart: salesMarginsChart.value,
    },
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ratios-audit-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Charts ───────────────────────────────────────────────────────────────────
// All percent fields are fractions (0-1): multiply ×100 so y-axis reads 0–100.
// The old leverageChart mixed incompatible scales (ratios 0–0.02 vs multiples
// 27–52); split into two charts: equity ratios (%) and debt coverage (×).

const yearLabels = computed<string[]>(() =>
  ratiosStore.report?.years.map(y => `Year ${y}`) ?? []
)

// ── P&L Year-over-Year Bridge waterfall ──────────────────────────────────────
const yoyPairIndex = ref(0)   // 0 = Y1→Y2, 1 = Y2→Y3, …

const yoyPairOptions = computed(() => {
  const yrs = ratiosStore.report?.years ?? []
  return yrs.slice(0, -1).map((y, i) => ({
    label: `Y${y} → Y${yrs[i + 1]}`,
    value: i,
  }))
})

const yoyBridgeData = computed<any>(() => {
  const r = ratiosStore.report
  if (!r || r.profitability.ebitda.length < 2) return null
  const i  = yoyPairIndex.value
  const factor = displayUnitStore.factor
  const p  = r.profitability
  const s  = r.sales
  const op = r.operational

  const n0 = i;  const n1 = i + 1

  const ebitda0 = p.ebitda[n0] / factor;  const ebitda1 = p.ebitda[n1] / factor

  // Deltas that affect EBITDA — positive = helpful, negative = harmful
  const revDelta     = (s.sales[n1]              - s.sales[n0])              / factor
  const cogsDelta    = -(Math.abs(s.cogs[n1])    - Math.abs(s.cogs[n0]))     / factor   // cost ↑ = bad
  const payrollDelta = -(op.payrollExpenses[n1]  - op.payrollExpenses[n0])   / factor
  const extDelta     = -(op.externalExpenses[n1] - op.externalExpenses[n0])  / factor
  const adDelta      = -(op.advertisingPromo[n1] - op.advertisingPromo[n0])  / factor

  // Residual: everything else (depreciation Δ, other OPEX Δ, rounding)
  const explainedDelta = revDelta + cogsDelta + payrollDelta + extDelta + adDelta
  const residual       = (ebitda1 - ebitda0) - explainedDelta

  const C_POS = 'rgba(16,185,129,0.75)';  const CB_POS = 'rgb(5,150,105)'
  const C_NEG = 'rgba(239,68,68,0.72)';   const CB_NEG = 'rgb(220,38,38)'
  const C_SUB = 'rgba(99,102,241,0.85)';  const CB_SUB = 'rgb(79,70,229)'

  type Bar = { label: string; range: [number,number]; bg: string; border: string }
  function bar(label: string, start: number, end: number, sub = false): Bar {
    const pos = end >= start
    return {
      label,
      range: [start, end],
      bg:     sub ? C_SUB : pos ? C_POS : C_NEG,
      border: sub ? CB_SUB : pos ? CB_POS : CB_NEG,
    }
  }

  const bars: Bar[] = []
  bars.push(bar(`EBITDA Y${r.years[n0]}`, 0, ebitda0, true))

  let cursor = ebitda0
  const addDelta = (label: string, delta: number) => {
    if (Math.abs(delta) < 0.005) return   // skip negligible
    bars.push(bar(label, cursor, cursor + delta))
    cursor += delta
  }

  addDelta('Revenue Δ',     revDelta)
  addDelta('COGS Δ',        cogsDelta)
  addDelta('Payroll Δ',     payrollDelta)
  addDelta('External Exp Δ',extDelta)
  addDelta('Ad & Promo Δ',  adDelta)
  if (Math.abs(residual) >= 0.005) addDelta('Other Δ', residual)

  bars.push(bar(`EBITDA Y${r.years[n1]}`, 0, ebitda1, true))

  return {
    labels: bars.map(b => b.label),
    datasets: [{
      label: unitLabel.value,
      data:            bars.map(b => b.range),
      backgroundColor: bars.map(b => b.bg),
      borderColor:     bars.map(b => b.border),
      borderWidth: 1.5,
      borderSkipped: false,
    }],
  }
})

const yoyBridgeOptions = computed<any>(() => {
  const unit = unitLabel.value
  const decimals = displayUnitStore.decimals
  return {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const raw = ctx.raw
          if (Array.isArray(raw)) {
            const diff = raw[1] - raw[0]
            const sign = diff >= 0 ? '+' : ''
            return `${sign}${diff.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${unit}`
          }
          return `${Number(raw).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${unit}`
        },
      },
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    y: {
      grid: { color: 'rgba(0,0,0,0.06)' },
      ticks: {
        callback: (v: any) =>
          Number(v).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
      },
    },
  },
  }
})

const profitabilityChart = computed<ChartData | null>(() => {
  const p = ratiosStore.report?.profitability
  if (!p) return null
  const pct = (v: number) => v * 100
  return {
    labels: yearLabels.value,
    datasets: [
      { label: 'EBITDA %',         data: p.ebitdaPct.map(pct) },
      { label: 'Net Profit %',     data: p.netProfitPct.map(pct) },
      { label: 'Cash Flow %',      data: p.cashFlowPct.map(pct) },
      { label: 'Free Cash Flow %', data: (p.freeCashFlowPct ?? []).map(pct) },
    ],
  }
})

// Equity-structure ratios — all expressed as % (×100)
const equityRatiosChart = computed<ChartData | null>(() => {
  const e = ratiosStore.report?.equityLeverage
  if (!e) return null
  const pct = (v: number) => v * 100
  return {
    labels: yearLabels.value,
    datasets: [
      { label: 'Equity / Assets %',   data: e.equityToAssets.map(pct) },
      { label: 'Financial Return %',  data: e.financialReturn.map(pct) },
      { label: 'LT Loans / Equity %', data: e.ltLoansToEquity.map(pct) },
    ],
  }
})

// Debt coverage — Cash Flow / Loans is a coverage multiple (×); WCR in days
// Different units so show only cashFlowToLoans here (most actionable)
const coverageChart = computed<ChartData | null>(() => {
  const e = ratiosStore.report?.equityLeverage
  if (!e) return null
  return {
    labels: yearLabels.value,
    datasets: [
      { label: 'Cash Flow / Loans (×)', data: [...e.cashFlowToLoans] },
      { label: 'WCR Rotation (days)',    data: [...e.wcrRotationDays] },
    ],
  }
})

// Margin cascade: Gross Margin → Added Value → EBITDA → Net Profit → Cash Flow
// All expressed as % of sales (fractions ×100). Y-axis is capped at 100 (yMax=100)
// so the chart stays in the conventional 0-100% range. Loss-making years (negative
// EBITDA/profit) will still render below the zero baseline.
const marginCascadeChart = computed<ChartData | null>(() => {
  const s = ratiosStore.report?.sales
  const p = ratiosStore.report?.profitability
  if (!s || !p) return null
  const pct = (v: number) => v * 100
  return {
    labels: yearLabels.value,
    datasets: [
      {
        label: 'Gross Margin %',
        data: s.grossMarginPct.map(pct),
        type: 'line', borderColor: 'rgb(59,130,246)',  backgroundColor: 'rgba(59,130,246,0.08)',
      },
      {
        label: 'Added Value %',
        data: p.addedValuePct.map(pct),
        type: 'line', borderColor: 'rgb(16,185,129)',  backgroundColor: 'rgba(16,185,129,0.08)',
      },
      {
        label: 'EBITDA %',
        data: p.ebitdaPct.map(pct),
        type: 'line', borderColor: 'rgb(245,158,11)',  backgroundColor: 'rgba(245,158,11,0.08)',
      },
      {
        label: 'Net Profit %',
        data: p.netProfitPct.map(pct),
        type: 'line', borderColor: 'rgb(99,102,241)',  backgroundColor: 'rgba(99,102,241,0.08)',
      },
      {
        label: 'Cash Flow %',
        data: p.cashFlowPct.map(pct),
        type: 'line', borderColor: 'rgb(20,184,166)',  backgroundColor: 'rgba(20,184,166,0.08)',
      },
    ],
  }
})

const salesMarginsChart = computed<ChartData | null>(() => {
  const s = ratiosStore.report?.sales
  if (!s) return null
  const factor = displayUnitStore.factor
  const pct = (v: number) => v * 100
  return {
    labels: yearLabels.value,
    datasets: [
      { label: 'Sales',          data: s.sales.map(v => v / factor), type: 'bar' },
      { label: 'Gross Margin %', data: s.grossMarginPct.map(pct),    type: 'line' },
      { label: 'COGS %',         data: s.cogsPct.map(pct),           type: 'line' },
    ],
  }
})
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-3xl font-bold text-gray-800">Financial Ratios & KPIs</h1>
      <!-- DEV ONLY — remove before production -->
      <button
        v-if="ratiosStore.report"
        title="DEV: download full ratios audit trail as JSON"
        @click="downloadAuditTrail"
        style="display:inline-flex; align-items:center; gap:6px; padding:5px 12px; font-size:0.72rem; font-weight:600; color:#92400e; background:#fef3c7; border:1px dashed #f59e0b; border-radius:6px; cursor:pointer; letter-spacing:0.04em"
      >
        <span>⬇ DEV</span>
        <span style="font-weight:400; color:#b45309">audit trail</span>
      </button>
    </div>

    <KFormLegend
      description="Key financial ratios and performance indicators derived from your model. All metrics are fully computed — no inputs required here. Ratios expressed as percentages unless noted. Valuation metrics (NPV, IRR, EV) use the Discount Rate from Configuration."
      :extras="[
        { icon: 'pi-chart-line', text: 'Valuation tab shows NPV, IRR, Payback, and Enterprise Value based on your discount rate' },
        { color: '#dcfce7', text: 'All values are read-only — adjust assumptions in Settings or other modules' },
      ]"
    />

    <Tabs value="0" class="w-full">
      <TabList>
        <Tab value="0">
          <span>Sales & Margins</span>
        </Tab>
        <Tab value="1">
          <span>Operational KPIs</span>
        </Tab>
        <Tab value="2">
          <span>Profitability</span>
        </Tab>
        <Tab value="3">
          <span>Equity & Leverage</span>
        </Tab>
        <Tab value="4">
          <span>Valuation</span>
        </Tab>
        <Tab value="5">
          <span>Charts</span>
        </Tab>
      </TabList>

      <TabPanels>
        <!-- Sales & Margins -->
        <TabPanel value="0">
          <Card>
            <template #content>
              <div v-if="ratiosStore.loading" class="text-center py-8 text-gray-500">
                Loading ratios...
              </div>
              <div v-else-if="ratiosStore.error" class="text-center py-8">
                <Message severity="error">{{ ratiosStore.error }}</Message>
              </div>
              <div v-else>
                <DataTable :value="salesMetrics" :loading="ratiosStore.loading" stripedRows showGridlines scrollable class="p-datatable-sm">
                  <Column field="label" header="Metric" frozen class="min-w-[220px] font-medium">
                    <template #body="{ data }">
                      <span class="inline-flex items-center gap-1 font-medium">
                        {{ data.label }}
                        <i
                          v-if="data.tooltip"
                          class="pi pi-info-circle text-xs text-blue-400 cursor-help"
                          v-tooltip.right="{ value: data.tooltip, showDelay: 100 }"
                        ></i>
                      </span>
                    </template>
                  </Column>
                  <Column
                    v-for="(year, idx) in yearHeaders"
                    :key="idx"
                    :header="year"
                    class="text-right min-w-[110px]"
                    headerClass="text-right"
                  >
                    <template #body="{ data }">
                      <span class="block text-right">{{ formatValue(data.format, data.values?.[idx]) }}</span>
                    </template>
                  </Column>
                </DataTable>
              </div>
            </template>
          </Card>
        </TabPanel>

        <!-- Operational KPIs -->
        <TabPanel value="1">
          <Card>
            <template #content>
              <div v-if="ratiosStore.loading" class="text-center py-8 text-gray-500">
                Loading operational KPIs...
              </div>
              <div v-else-if="ratiosStore.error" class="text-center py-8">
                <Message severity="error">{{ ratiosStore.error }}</Message>
              </div>
              <div v-else>
                <DataTable
                  :value="operationalMetrics"
                  :loading="ratiosStore.loading"
                  stripedRows showGridlines scrollable
                  class="p-datatable-sm"
                >
                  <Column field="label" header="Metric" frozen class="min-w-[220px] font-medium">
                    <template #body="{ data }">
                      <span class="inline-flex items-center gap-1 font-medium">
                        {{ data.label }}
                        <i
                          v-if="data.tooltip"
                          class="pi pi-info-circle text-xs text-blue-400 cursor-help"
                          v-tooltip.right="{ value: data.tooltip, showDelay: 100 }"
                        ></i>
                      </span>
                    </template>
                  </Column>
                  <Column
                    v-for="(year, idx) in yearHeaders"
                    :key="idx"
                    :header="year"
                    class="text-right min-w-[110px]"
                    headerClass="text-right"
                  >
                    <template #body="{ data }">
                      <span class="block text-right">{{ formatValue(data.format, data.values?.[idx]) }}</span>
                    </template>
                  </Column>
                </DataTable>
              </div>
            </template>
          </Card>
        </TabPanel>

        <!-- Profitability -->
        <TabPanel value="2">
          <Card>
            <template #content>
              <div v-if="ratiosStore.loading" class="text-center py-8 text-gray-500">
                Loading profitability metrics...
              </div>
              <div v-else-if="ratiosStore.error" class="text-center py-8">
                <Message severity="error">{{ ratiosStore.error }}</Message>
              </div>
              <div v-else>
                <DataTable
                  :value="profitabilityMetrics"
                  :loading="ratiosStore.loading"
                  stripedRows showGridlines scrollable
                  class="p-datatable-sm"
                >
                  <Column field="label" header="Metric" frozen class="min-w-[220px] font-medium">
                    <template #body="{ data }">
                      <span class="inline-flex items-center gap-1 font-medium">
                        {{ data.label }}
                        <i
                          v-if="data.tooltip"
                          class="pi pi-info-circle text-xs text-blue-400 cursor-help"
                          v-tooltip.right="{ value: data.tooltip, showDelay: 100 }"
                        ></i>
                      </span>
                    </template>
                  </Column>
                  <Column
                    v-for="(year, idx) in yearHeaders"
                    :key="idx"
                    :header="year"
                    class="text-right min-w-[110px]"
                    headerClass="text-right"
                  >
                    <template #body="{ data }">
                      <span class="block text-right">{{ formatValue(data.format, data.values?.[idx]) }}</span>
                    </template>
                  </Column>
                </DataTable>
              </div>
            </template>
          </Card>
        </TabPanel>

        <!-- Equity & Leverage -->
        <TabPanel value="3">
          <Card>
            <template #content>
              <div v-if="ratiosStore.loading" class="text-center py-8 text-gray-500">
                Loading equity and leverage metrics...
              </div>
              <div v-else-if="ratiosStore.error" class="text-center py-8">
                <Message severity="error">{{ ratiosStore.error }}</Message>
              </div>
              <div v-else>
                <DataTable :value="equityMetrics" :loading="ratiosStore.loading" stripedRows showGridlines scrollable class="p-datatable-sm">
                  <Column field="label" header="Metric" frozen class="min-w-[220px] font-medium">
                    <template #body="{ data }">
                      <span class="inline-flex items-center gap-1 font-medium">
                        {{ data.label }}
                        <i
                          v-if="data.tooltip"
                          class="pi pi-info-circle text-xs text-blue-400 cursor-help"
                          v-tooltip.right="{ value: data.tooltip, showDelay: 100 }"
                        ></i>
                      </span>
                    </template>
                  </Column>
                  <Column
                    v-for="(year, idx) in yearHeaders"
                    :key="idx"
                    :header="year"
                    class="text-right min-w-[110px]"
                    headerClass="text-right"
                  >
                    <template #body="{ data }">
                      <span class="block text-right">{{ formatValue(data.format, data.values?.[idx]) }}</span>
                    </template>
                  </Column>
                </DataTable>
              </div>
            </template>
          </Card>
        </TabPanel>

        <!-- Valuation -->
        <TabPanel value="4">
          <div v-if="ratiosStore.loading" class="text-center py-8 text-gray-500">
            Loading valuation metrics...
          </div>
          <div v-else-if="ratiosStore.error" class="text-center py-8">
            <Message severity="error">{{ ratiosStore.error }}</Message>
          </div>
          <div v-else-if="valuationMetrics" style="display:flex; flex-wrap:wrap; gap:1.5rem; margin-top:0.5rem">
            <!-- NPV Card -->
            <div style="flex:1; min-width:200px; border-radius:12px; padding:24px; background:linear-gradient(135deg,#eff6ff,#dbeafe); border:1px solid #bfdbfe; box-shadow:0 1px 3px rgba(0,0,0,0.08)">
              <p style="color:#1d4ed8; font-weight:600; font-size:0.8rem; margin:0 0 10px; display:flex; align-items:center; gap:6px">
                Net Present Value (NPV)
                <i class="pi pi-info-circle" style="font-size:0.75rem; color:#93c5fd; cursor:help"
                   v-tooltip.right="{ value: 'Sum of all forecast Free Cash Flows discounted at the rate set in Configuration. Positive NPV means the project creates value above the cost of capital.', showDelay: 100 }"></i>
              </p>
              <p style="color:#1e3a8a; font-size:1.6rem; font-weight:700; margin:0; line-height:1.2">{{ formatUnit(valuationMetrics.npv, 0) }}</p>
              <p style="color:#3b82f6; font-size:0.75rem; margin:10px 0 0">
                Σ FCF / (1+r)ⁿ · r = {{ (valuationMetrics.discountRate * 100).toFixed(1) }}%
              </p>
            </div>

            <!-- Terminal Value Card -->
            <div style="flex:1; min-width:200px; border-radius:12px; padding:24px; background:linear-gradient(135deg,#fff7ed,#fed7aa); border:1px solid #fdba74; box-shadow:0 1px 3px rgba(0,0,0,0.08)">
              <p style="color:#c2410c; font-weight:600; font-size:0.8rem; margin:0 0 10px; display:flex; align-items:center; gap:6px">
                Terminal Value
                <i class="pi pi-info-circle" style="font-size:0.75rem; color:#fb923c; cursor:help"
                   v-tooltip.right="{ value: 'Estimated value of all cash flows beyond the 5-year forecast horizon, computed as a perpetuity: FCF₅ ÷ r, then discounted back to today. Capture long-term business value not shown in the explicit forecast window.', showDelay: 100 }"></i>
              </p>
              <p style="color:#7c2d12; font-size:1.6rem; font-weight:700; margin:0; line-height:1.2">{{ formatUnit(valuationMetrics.terminalValue ?? 0, 0) }}</p>
              <p style="color:#ea580c; font-size:0.75rem; margin:10px 0 0">FCF₅ / r · (1+r)⁻⁵ (perpetuity)</p>
            </div>

            <!-- IRR Card -->
            <div style="flex:1; min-width:200px; border-radius:12px; padding:24px; background:linear-gradient(135deg,#f0fdf4,#dcfce7); border:1px solid #bbf7d0; box-shadow:0 1px 3px rgba(0,0,0,0.08)">
              <p style="color:#15803d; font-weight:600; font-size:0.8rem; margin:0 0 10px; display:flex; align-items:center; gap:6px">
                Internal Rate of Return (IRR)
                <i class="pi pi-info-circle" style="font-size:0.75rem; color:#4ade80; cursor:help"
                   v-tooltip.right="{ value: 'The discount rate that makes NPV = 0. If IRR > your cost of capital (discount rate), the project is financially attractive. Computed via Newton–Raphson iteration on the free cash flow stream.', showDelay: 100 }"></i>
              </p>
              <p style="color:#14532d; font-size:1.6rem; font-weight:700; margin:0; line-height:1.2">
                {{ valuationMetrics.irrValid ? (valuationMetrics.irr * 100).toFixed(1) + '%' : 'N/A' }}
              </p>
              <p style="color:#16a34a; font-size:0.75rem; margin:10px 0 0">
                {{ valuationMetrics.irrValid ? 'Newton convergence ✓' : 'Does not converge with this data' }}
              </p>
            </div>

            <!-- Enterprise Value Card -->
            <div style="flex:1; min-width:200px; border-radius:12px; padding:24px; background:linear-gradient(135deg,#faf5ff,#f3e8ff); border:1px solid #e9d5ff; box-shadow:0 1px 3px rgba(0,0,0,0.08)">
              <p style="color:#7e22ce; font-weight:600; font-size:0.8rem; margin:0 0 10px; display:flex; align-items:center; gap:6px">
                Enterprise Value (NPV + TV)
                <i class="pi pi-info-circle" style="font-size:0.75rem; color:#c084fc; cursor:help"
                   v-tooltip.right="{ value: 'Total value of the business: explicit NPV of forecast FCFs plus the discounted Terminal Value. Represents what an investor would theoretically pay today for all future cash flows. Implied P/E shown below for cross-check.', showDelay: 100 }"></i>
              </p>
              <p style="color:#3b0764; font-size:1.6rem; font-weight:700; margin:0; line-height:1.2">{{ formatUnit(valuationMetrics.discountedValue, 0) }}</p>
              <p style="color:#9333ea; font-size:0.75rem; margin:10px 0 0">
                Implied P/E: {{ Number(valuationMetrics.peMultiple).toFixed(1) }}×
              </p>
            </div>
          </div>
        </TabPanel>

        <!-- Charts -->
        <TabPanel value="5">
          <Card>
            <template #content>
              <div class="space-y-8">
                <!-- Margin Cascade (0–100 % of revenue) -->
                <div class="border rounded-lg p-6 bg-gray-50">
                  <KChart
                    :data="marginCascadeChart"
                    type="line"
                    height="360px"
                    title="Margin Cascade — % of Revenue (Gross Margin → Added Value → EBITDA → Net Profit → Cash Flow)"
                    :loading="ratiosStore.loading"
                    :yMax="100"
                  />
                </div>

                <div class="border rounded-lg p-6 bg-gray-50">
                  <KChart
                    :data="profitabilityChart"
                    type="line"
                    height="320px"
                    title="Profitability Trend"
                    :loading="ratiosStore.loading"
                  />
                </div>

                <div class="border rounded-lg p-6 bg-gray-50">
                  <KChart
                    :data="equityRatiosChart"
                    type="line"
                    height="320px"
                    title="Equity Structure (%)"
                    :loading="ratiosStore.loading"
                  />
                </div>

                <div class="border rounded-lg p-6 bg-gray-50">
                  <KChart
                    :data="coverageChart"
                    type="line"
                    height="320px"
                    title="Coverage & WCR (× and days)"
                    :loading="ratiosStore.loading"
                  />
                </div>

                <div class="border rounded-lg p-6 bg-gray-50">
                  <KChart
                    :key="`ratios-salesmargins-${unitLabel}`"
                    :data="salesMarginsChart"
                    type="combo"
                    height="320px"
                    title="Sales & Margins Evolution"
                    :loading="ratiosStore.loading"
                  />
                </div>

                <!-- P&L YoY Bridge -->
                <div class="border rounded-lg p-6 bg-gray-50">
                  <div class="flex items-center justify-between mb-1">
                    <h3 class="text-base font-semibold text-gray-700">EBITDA Year-over-Year Bridge</h3>
                    <Select
                      v-model="yoyPairIndex"
                      :options="yoyPairOptions"
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Select period"
                      class="w-36"
                      size="small"
                    />
                  </div>
                  <p class="text-xs text-gray-400 mb-3">
                    What drove the change in EBITDA between two consecutive years. Positive bars improve EBITDA; negative bars reduce it.
                  </p>
                  <div class="flex items-center gap-5 mb-3 text-xs text-gray-500">
                    <span class="flex items-center gap-1.5"><span class="inline-block w-3 h-3 rounded-sm bg-emerald-500"></span> Positive impact</span>
                    <span class="flex items-center gap-1.5"><span class="inline-block w-3 h-3 rounded-sm bg-red-500"></span> Negative impact</span>
                    <span class="flex items-center gap-1.5"><span class="inline-block w-3 h-3 rounded-sm bg-indigo-500"></span> EBITDA level</span>
                  </div>
                  <div v-if="ratiosStore.loading" class="flex justify-center py-10">
                    <span class="text-gray-400 animate-pulse text-sm">Loading…</span>
                  </div>
                  <div v-else-if="!yoyBridgeData" class="flex justify-center py-10 text-gray-400 text-sm">
                    At least 2 years of data required.
                  </div>
                  <div v-else style="height: 360px; position: relative">
                    <Bar :key="unitLabel" :data="yoyBridgeData" :options="yoyBridgeOptions" />
                  </div>
                </div>

              </div>
            </template>
          </Card>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<style scoped>
:deep(.p-tabs) {
  @apply border-0;
}

:deep(.p-tabs .p-tablist) {
  @apply border-b border-gray-300;
}

:deep(.p-tabs .p-tab) {
  @apply px-4 py-2;
}
</style>
