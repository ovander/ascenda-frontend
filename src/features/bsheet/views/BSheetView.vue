<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUiStore } from '@/stores/ui'
import { useBSheetStore } from '@/features/bsheet/stores/bsheetStore'
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
import type { ChartData } from '@/types'
import ShowOn from '@/components/common/ShowOn.vue'
import KpiGrid from '@/components/common/KpiGrid.vue'
import type { KpiItem } from '@/components/common/KpiGrid.vue'

defineProps<{ planId?: string; sid?: string }>()

const { t } = useI18n()
const bsheetStore = useBSheetStore()
const uiStore = useUiStore()
const { yearHeaders } = useYearHeaders()
const { formatUnit, getUnitLabel } = useDecimal()
const displayUnitStore = useDisplayUnitStore()
const unitLabel = computed(() => getUnitLabel())

// BSheet has 6 data points: index 0 = opening balance, 1-5 = forecast years
const bsheetHeaders = computed(() => ['Opening', ...yearHeaders.value])

// View mode toggle: 'table' (default) or 'chart'
const viewMode = ref<'table' | 'chart'>('table')

onMounted(async () => {
  await bsheetStore.fetchReport()
})

// ── Chart data derived from BSheetCharts ─────────────────────────────────
const assetStructureChart = computed<ChartData | null>(() => {
  if (!bsheetStore.report?.charts) return null
  const c = bsheetStore.report.charts
  const factor = displayUnitStore.factor
  return {
    labels: c.years.map(String),
    datasets: [
      { label: 'Capital Employed', data: c.capitalEmployed.map(v => Number(v) / factor) },
      { label: 'WC Employed', data: c.wcEmployed.map(v => Number(v) / factor) },
    ],
  }
})

const liabilityChart = computed<ChartData | null>(() => {
  if (!bsheetStore.report?.charts) return null
  const c = bsheetStore.report.charts
  const factor = displayUnitStore.factor
  return {
    labels: c.years.map(String),
    datasets: [
      { label: 'Capital Invested', data: c.capitalInvested.map(v => Number(v) / factor) },
      { label: 'WC Invested', data: c.wcInvested.map(v => Number(v) / factor) },
    ],
  }
})

// ── DEV helpers ───────────────────────────────────────────────────────────
const isDev = import.meta.env.DEV

/** Downloads the full balance sheet report as a timestamped JSON audit trail. */
function downloadDevJSON() {
  const r = bsheetStore.report
  const payload = {
    exported: new Date().toISOString(),
    headers: bsheetHeaders.value,
    report: r,
    // Pre-serialised table rows for quick human review
    audit: {
      detailed: detailedRows.value,
      condensed: condensedRows.value,
      analysis: analysisRows.value,
      capitalEmployed: capitalEmployedRows.value,
      balanceCheck: balanceCheck.value.map((ok, i) => ({
        period: bsheetHeaders.value[i],
        balanced: ok,
      })),
    },
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = `bsheet-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ── Helper: build a labeled row with a 6-element number array ─────────────
function row(
  label: string,
  values: number[],
  opts: { isAggregate?: boolean; isHeader?: boolean; tooltip?: string } = {},
) {
  return { label, values, ...opts }
}

// ── Tooltip maps per tab ───────────────────────────────────────────────────
const DETAILED_TOOLTIPS: Record<string, string> = {
  'Noncurrent Assets':   'Fixed tangible assets (equipment, buildings) net of accumulated depreciation, plus intangible assets. Flows from the Capex module.',
  'Inventory':           'Raw materials and finished goods held at cost. Computed from Days Inventory Outstanding × Cost of Sales.',
  'Accounts Receivable': 'Amounts owed by customers not yet collected. Computed from Days Sales Outstanding (DSO) applied to annual revenue.',
  'Cash':                'Net cash and equivalents — the residual of operating cash flow, investing (capex), and financing activities.',
  'Total Assets':        'Sum of all asset lines. Must equal Total Liabilities every period.',
  'Share Capital':       'Cumulative equity raised from shareholders through investment rounds. Flows from the Financial Plan module.',
  'Net Profit':          'Current-year net income or loss from the P&L. Feeds into retained earnings the following year.',
  'Retained Earnings':   'Accumulated prior-year profits and losses carried forward from year to year.',
  'Long-term Debt':      'Outstanding bank loans and financial debt with maturity beyond 12 months. Flows from the Financial Plan module.',
  'Trade Payables':      'Amounts owed to suppliers. Computed from Days Payable Outstanding (DPO) applied to Cost of Sales.',
  'Social & Tax Debts':  'Payroll taxes, social charges, and corporate tax liabilities outstanding at year-end.',
  'Other Payables':      'Residual short-term obligations not captured in trade payables or social/tax debts.',
  'Total Liabilities':   'Sum of all equity and liability lines. Must equal Total Assets — any gap signals a modelling error.',
}

const CONDENSED_TOOLTIPS: Record<string, string> = {
  'Noncurrent Assets': 'Long-term tangible and intangible assets net of depreciation.',
  'Current Assets':    'Short-term assets — inventory and accounts receivable combined.',
  'Cash':              'Liquidity position: cash and short-term equivalents.',
  'Total Assets':      'Sum of noncurrent assets, current assets, and cash.',
  'Equity':            'Total shareholders\' equity: share capital + retained earnings + current net profit.',
  'Long-term Debt':    'Non-current portion of financial debt (maturity > 12 months).',
  'Short-term Debt':   'Trade payables, social/tax debts, and other short-term obligations combined.',
  'Total Liabilities': 'Must equal Total Assets every period. Any mismatch signals a modelling error.',
}

const ANALYSIS_TOOLTIPS: Record<string, string> = {
  'Equity':             'Total shareholders\' equity (share capital + retained earnings + net profit).',
  'Long-term Debt':     'Non-current financial liabilities with maturity beyond 12 months.',
  'Permanent Capital':  'Long-term resources available to fund the business: Equity + Long-term Debt.',
  'Short-term Debt':    'Current liabilities — trade payables, social debts, and other short-term payables.',
  'Total Sources':      'Total capital available: Permanent Capital + Short-term Debt. Must equal Total Uses.',
  'Noncurrent Assets':  'Long-term tangible and intangible assets net of depreciation.',
  'Current Assets':     'Inventory and trade receivables combined.',
  'Cash':               'Liquid assets held at year-end.',
  'Total Uses':         'Total assets employed (noncurrent + current + cash). Must equal Total Sources.',
  'Working Capital':    'Permanent Capital minus Noncurrent Assets. Positive value means long-term resources exceed fixed assets — the cushion available to fund day-to-day operations.',
  'WCR':                'Working Capital Requirement: Current Assets minus non-financial Current Liabilities (trade payables + social/tax debts). Represents the net operational funding need.',
  'WC − WCR':           'Working Capital minus WCR. Positive = cash surplus after operational needs are funded; negative = cash shortfall.',
  'Net Debt':           'Financial debt minus cash. Negative value means a net cash position (more cash than debt).',
}

const CAPITAL_TOOLTIPS: Record<string, string> = {
  'Capital Employed':  'Noncurrent assets plus WCR — the total operational assets the business has deployed. Represents how much capital is tied up in running the business.',
  'Capital Invested':  'Equity plus net financial debt — the total capital provided by shareholders and lenders to fund the business.',
  'WC Employed':       'Working capital requirement from the asset side: inventory + receivables − trade payables. Represents operational funding absorbed by the business cycle.',
  'WC Invested':       'Net working capital funded by equity and financial debt. Mirrors WC Employed in a balanced sheet.',
}

// ── Balance check: assets = liabilities for all 6 time points ────────────
const balanceCheck = computed(() => {
  if (!bsheetStore.report?.detailed) return []
  const { detailed } = bsheetStore.report
  return Array.from({ length: 6 }, (_, i) => {
    const assets = Number(detailed.assets.totalAssets[i] ?? 0)
    const liabs  = Number(detailed.liabilities.totalLiabilities[i] ?? 0)
    return Math.abs(assets - liabs) < 0.01
  })
})

// ── Detailed balance sheet rows ───────────────────────────────────────────
const detailedRows = computed(() => {
  if (!bsheetStore.report?.detailed) return []
  const a = bsheetStore.report.detailed.assets
  const l = bsheetStore.report.detailed.liabilities
  const t = DETAILED_TOOLTIPS
  return [
    row('ASSETS',               [],                    { isHeader: true }),
    row('Noncurrent Assets',    a.noncurrentAssets,    { tooltip: t['Noncurrent Assets'] }),
    row('Inventory',            a.inventory,           { tooltip: t['Inventory'] }),
    row('Accounts Receivable',  a.accountsReceivable,  { tooltip: t['Accounts Receivable'] }),
    row('Cash',                 a.cash,                { tooltip: t['Cash'] }),
    row('Total Assets',         a.totalAssets,         { isAggregate: true, tooltip: t['Total Assets'] }),
    row('LIABILITIES',          [],                    { isHeader: true }),
    row('Share Capital',        l.shareCapital,        { tooltip: t['Share Capital'] }),
    row('Net Profit',           l.netProfit,           { tooltip: t['Net Profit'] }),
    row('Retained Earnings',    l.retainedEarnings,    { tooltip: t['Retained Earnings'] }),
    row('Long-term Debt',       l.longTermDebt,        { tooltip: t['Long-term Debt'] }),
    row('Trade Payables',       l.tradePayables,       { tooltip: t['Trade Payables'] }),
    row('Social & Tax Debts',   l.socialTaxDebts,      { tooltip: t['Social & Tax Debts'] }),
    row('Other Payables',       l.otherPayables,       { tooltip: t['Other Payables'] }),
    row('Total Liabilities',    l.totalLiabilities,    { isAggregate: true, tooltip: t['Total Liabilities'] }),
  ]
})

// ── Condensed balance sheet rows ─────────────────────────────────────────
const condensedRows = computed(() => {
  if (!bsheetStore.report?.condensed) return []
  const a = bsheetStore.report.condensed.assets
  const l = bsheetStore.report.condensed.liabilities
  const t = CONDENSED_TOOLTIPS
  return [
    row('ASSETS',              [], { isHeader: true }),
    row('Noncurrent Assets',   a.noncurrentAssets, { tooltip: t['Noncurrent Assets'] }),
    row('Current Assets',      a.currentAssets,    { tooltip: t['Current Assets'] }),
    row('Cash',                a.cash,             { tooltip: t['Cash'] }),
    row('Total Assets',        a.total,            { isAggregate: true, tooltip: t['Total Assets'] }),
    row('LIABILITIES',         [], { isHeader: true }),
    row('Equity',              l.equity,           { tooltip: t['Equity'] }),
    row('Long-term Debt',      l.longTermDebt,     { tooltip: t['Long-term Debt'] }),
    row('Short-term Debt',     l.shortTermDebt,    { tooltip: t['Short-term Debt'] }),
    row('Total Liabilities',   l.total,            { isAggregate: true, tooltip: t['Total Liabilities'] }),
  ]
})

// ── BS Analysis rows ──────────────────────────────────────────────────────
const analysisRows = computed(() => {
  if (!bsheetStore.report?.analysis) return []
  const an = bsheetStore.report.analysis
  const t = ANALYSIS_TOOLTIPS
  return [
    row('SOURCES',            [], { isHeader: true }),
    row('Equity',             an.equity,           { tooltip: t['Equity'] }),
    row('Long-term Debt',     an.longTermDebt,     { tooltip: t['Long-term Debt'] }),
    row('Permanent Capital',  an.permanentCapital, { isAggregate: true, tooltip: t['Permanent Capital'] }),
    row('Short-term Debt',    an.shortTermDebt,    { tooltip: t['Short-term Debt'] }),
    row('Total Sources',      an.totalSources,     { isAggregate: true, tooltip: t['Total Sources'] }),
    row('USES',               [], { isHeader: true }),
    row('Noncurrent Assets',  an.noncurrentAssets, { tooltip: t['Noncurrent Assets'] }),
    row('Current Assets',     an.currentAssets,    { tooltip: t['Current Assets'] }),
    row('Cash',               an.cash,             { tooltip: t['Cash'] }),
    row('Total Uses',         an.totalUses,        { isAggregate: true, tooltip: t['Total Uses'] }),
    row('METRICS',            [], { isHeader: true }),
    row('Working Capital',    an.workingCapital,   { tooltip: t['Working Capital'] }),
    row('WCR',                an.wcr,              { tooltip: t['WCR'] }),
    row('WC − WCR',           an.wcMinusWcr,       { tooltip: t['WC − WCR'] }),
    row('Net Debt',           an.netDebt,          { tooltip: t['Net Debt'] }),
  ]
})

// ── Capital employed rows ─────────────────────────────────────────────────
const capitalEmployedRows = computed(() => {
  if (!bsheetStore.report?.capital) return []
  const cap = bsheetStore.report.capital
  const wc  = bsheetStore.report.workingCapital
  const t   = CAPITAL_TOOLTIPS
  return [
    row('Capital Employed',  cap.employed, { tooltip: t['Capital Employed'] }),
    row('Capital Invested',  cap.invested, { tooltip: t['Capital Invested'] }),
    row('WC Employed',       wc.employed,  { tooltip: t['WC Employed'] }),
    row('WC Invested',       wc.invested,  { tooltip: t['WC Invested'] }),
  ]
})

// ── Chart data (derived from report — no separate fetch needed) ───────────
function toChartData(
  labels: string[],
  datasets: { label: string; data: number[] }[],
) {
  return { labels, datasets }
}

const condensedBsChart = computed(() => {
  if (!bsheetStore.report?.condensed) return null
  const a = bsheetStore.report.condensed.assets
  const factor = displayUnitStore.factor
  const sc = (arr: any[]) => arr.map(v => Number(v) / factor)
  return toChartData(bsheetHeaders.value, [
    { label: 'Noncurrent Assets', data: sc(a.noncurrentAssets) },
    { label: 'Current Assets',    data: sc(a.currentAssets) },
    { label: 'Cash',              data: sc(a.cash) },
  ])
})

const workingCapitalChart = computed(() => {
  if (!bsheetStore.report?.analysis) return null
  const an = bsheetStore.report.analysis
  const factor = displayUnitStore.factor
  const sc = (arr: any[]) => arr.map(v => Number(v) / factor)
  return toChartData(bsheetHeaders.value, [
    { label: 'Working Capital', data: sc(an.workingCapital) },
    { label: 'WCR',             data: sc(an.wcr) },
    { label: 'WC − WCR',        data: sc(an.wcMinusWcr) },
  ])
})

const assetsEvolutionChart = computed(() => {
  if (!bsheetStore.report?.detailed) return null
  const a = bsheetStore.report.detailed.assets
  const factor = displayUnitStore.factor
  const sc = (arr: any[]) => arr.map(v => Number(v) / factor)
  return toChartData(bsheetHeaders.value, [
    { label: 'Noncurrent Assets',   data: sc(a.noncurrentAssets) },
    { label: 'Inventory',           data: sc(a.inventory) },
    { label: 'Accounts Receivable', data: sc(a.accountsReceivable) },
    { label: 'Cash',                data: sc(a.cash) },
  ])
})

const fundingMixChart = computed(() => {
  if (!bsheetStore.report?.condensed) return null
  const l = bsheetStore.report.condensed.liabilities
  const factor = displayUnitStore.factor
  const sc = (arr: any[]) => arr.map(v => Number(v) / factor)
  return toChartData(bsheetHeaders.value, [
    { label: 'Equity',          data: sc(l.equity) },
    { label: 'Long-term Debt',  data: sc(l.longTermDebt) },
    { label: 'Short-term Debt', data: sc(l.shortTermDebt) },
  ])
})

function getRowClasses(row: any) {
  const classes: string[] = []
  if (row.isHeader)    classes.push('bg-gray-200 font-bold text-gray-800')
  if (row.isAggregate) classes.push('font-semibold bg-gray-100')
  return classes.join(' ')
}

// ── Waterfall charts ──────────────────────────────────────────────────────
// bsheetHeaders has 6 entries: Opening (index 0) + 5 forecast years (index 1-5)
const wfYearIndex = ref(1)   // default to first forecast year (index 1)

const wfYearOptions = computed(() =>
  bsheetHeaders.value.map((h, i) => ({ label: h, value: i })),
)

// Colour helpers
const C_POS     = 'rgba(16,185,129,0.75)'
const C_NEG     = 'rgba(239,68,68,0.72)'
const C_SUB     = 'rgba(99,102,241,0.85)'
const CB_POS    = 'rgb(5,150,105)'
const CB_NEG    = 'rgb(220,38,38)'
const CB_SUB    = 'rgb(79,70,229)'

function buildWfBar(
  label: string,
  start: number,
  end: number,
  isSubtotal = false,
) {
  const isPositive = end >= start
  return {
    label,
    range: [start, end] as [number, number],
    bg:     isSubtotal ? C_SUB  : isPositive ? C_POS : C_NEG,
    border: isSubtotal ? CB_SUB : isPositive ? CB_POS : CB_NEG,
  }
}

function toWfChartData(bars: ReturnType<typeof buildWfBar>[], unit: string) {
  return {
    labels: bars.map(b => b.label),
    datasets: [{
      label: unit,
      data:            bars.map(b => b.range),
      backgroundColor: bars.map(b => b.bg),
      borderColor:     bars.map(b => b.border),
      borderWidth: 1.5,
      borderSkipped: false,
    }],
  }
}

// Assets build-up waterfall
const assetsWfData = computed<any>(() => {
  const r = bsheetStore.report
  if (!r?.detailed) return null
  const i = wfYearIndex.value
  const factor = displayUnitStore.factor
  const a = r.detailed.assets

  const nca  = Number(a.noncurrentAssets[i]   ?? 0) / factor
  const inv  = Number(a.inventory[i]           ?? 0) / factor
  const ar   = Number(a.accountsReceivable[i]  ?? 0) / factor
  const cash = Number(a.cash[i]                ?? 0) / factor
  const tot  = Number(a.totalAssets[i]         ?? 0) / factor

  let cursor = 0
  const bars = []

  bars.push(buildWfBar('Noncurrent Assets', cursor, cursor + nca))
  cursor += nca

  bars.push(buildWfBar('Inventory', cursor, cursor + inv))
  cursor += inv

  bars.push(buildWfBar('Accounts Receivable', cursor, cursor + ar))
  cursor += ar

  bars.push(buildWfBar('Cash', cursor, cursor + cash))

  bars.push(buildWfBar('Total Assets', 0, tot, true))

  return toWfChartData(bars, unitLabel.value)
})

// Liabilities & Equity build-up waterfall
const liabsWfData = computed<any>(() => {
  const r = bsheetStore.report
  if (!r?.detailed) return null
  const i  = wfYearIndex.value
  const factor = displayUnitStore.factor
  const l  = r.detailed.liabilities

  const sc  = Number(l.shareCapital[i]      ?? 0) / factor
  const re  = Number(l.retainedEarnings[i]  ?? 0) / factor
  const np  = Number(l.netProfit[i]         ?? 0) / factor
  const ltd = Number(l.longTermDebt[i]      ?? 0) / factor
  const tp  = Number(l.tradePayables[i]     ?? 0) / factor
  const std = Number(l.socialTaxDebts[i]    ?? 0) / factor
  const op  = Number(l.otherPayables[i]     ?? 0) / factor
  const tot = Number(l.totalLiabilities[i]  ?? 0) / factor

  let cursor = 0
  const bars = []

  if (sc !== 0) {
    bars.push(buildWfBar('Share Capital', cursor, cursor + sc))
    cursor += sc
  }
  if (re !== 0) {
    bars.push(buildWfBar('Retained Earnings', cursor, cursor + re))
    cursor += re
  }
  if (np !== 0) {
    bars.push(buildWfBar('Net Profit', cursor, cursor + np))
    cursor += np
  }
  if (ltd !== 0) {
    bars.push(buildWfBar('Long-term Debt', cursor, cursor + ltd))
    cursor += ltd
  }
  if (tp !== 0) {
    bars.push(buildWfBar('Trade Payables', cursor, cursor + tp))
    cursor += tp
  }
  if (std !== 0) {
    bars.push(buildWfBar('Social & Tax Debts', cursor, cursor + std))
    cursor += std
  }
  if (op !== 0) {
    bars.push(buildWfBar('Other Payables', cursor, cursor + op))
    // cursor += op  (not needed — total is the anchor)
  }

  bars.push(buildWfBar('Total Liabilities', 0, tot, true))

  return toWfChartData(bars, unitLabel.value)
})

const wfOptions = computed<any>(() => {
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
          const val = Array.isArray(raw) ? raw[1] - raw[0] : Number(raw)
          return `${val.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${unit}`
        },
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 11 } },
    },
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

// ── Mobile KPI summary ────────────────────────────────────────────────────────
const bsheetMobileKpis = computed<KpiItem[]>(() => {
  if (!bsheetStore.report?.detailed) return []
  const a = bsheetStore.report.detailed.assets
  const l = bsheetStore.report.detailed.liabilities
  // Index 1 = Year 1 (index 0 is Opening)
  const totalAssets = Number(a.totalAssets[1] ?? 0)
  const cash        = Number(a.cash[1] ?? 0)
  const equity      = Number(l.shareCapital[1] ?? 0) + Number(l.retainedEarnings[1] ?? 0) + Number(l.netProfit[1] ?? 0)
  const ltDebt      = Number(l.longTermDebt[1] ?? 0)
  return [
    {
      id:       'total-assets',
      label:    'Total Assets (Y1)',
      value:    formatUnit(totalAssets),
      severity: 'neutral',
    },
    {
      id:       'cash',
      label:    'Cash (Y1)',
      value:    formatUnit(cash),
      severity: cash >= 0 ? 'positive' : 'negative',
    },
    {
      id:       'equity',
      label:    'Equity (Y1)',
      value:    formatUnit(equity),
      severity: equity >= 0 ? 'positive' : 'negative',
    },
    {
      id:       'lt-debt',
      label:    'LT Debt (Y1)',
      value:    formatUnit(ltDebt),
      severity: ltDebt > 0 ? 'negative' : 'positive',
    },
  ]
})
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-3xl font-bold text-gray-800">Balance Sheet</h1>

      <div class="flex items-center gap-3">
        <!-- Table / Chart toggle — tablet+ only (mobile shows KPI summary, not the full table/charts) -->
        <div v-if="!uiStore.isMobile" class="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
          <button
            @click="viewMode = 'table'"
            :class="viewMode === 'table'
              ? 'bg-gray-800 text-white px-3 py-1.5'
              : 'bg-white text-gray-600 hover:bg-gray-50 px-3 py-1.5'"
          >
            <i class="pi pi-table mr-1" />Table
          </button>
          <button
            @click="viewMode = 'chart'"
            :class="viewMode === 'chart'
              ? 'bg-gray-800 text-white px-3 py-1.5'
              : 'bg-white text-gray-600 hover:bg-gray-50 px-3 py-1.5'"
          >
            <i class="pi pi-chart-bar mr-1" />Chart
          </button>
        </div>

        <!-- DEV-ONLY: download full report + pre-built rows as JSON audit trail -->
        <div v-if="isDev" class="flex gap-2">
          <button
            :disabled="!bsheetStore.report"
            class="dev-btn"
            @click="downloadDevJSON"
          >
            <span class="dev-badge">DEV</span>
            ⬇ Download Audit JSON
          </button>
        </div>
      </div><!-- end toggle+dev wrapper -->
    </div>

    <KFormLegend
      v-if="!uiStore.isMobile"
      description="5-year projected balance sheet, fully computed from your inputs. Assets must equal Liabilities + Equity each year — any imbalance signals a modelling error. All amounts in thousands."
      :extras="[{ color: '#dcfce7', text: 'All cells are read-only — values flow from other modules' }]"
    />

    <!-- ── Mobile KPI summary ─────────────────────────────────────── -->
    <div v-if="uiStore.isMobile" class="space-y-4 mt-4" data-testid="bsheet-kpi-grid">
      <div v-if="bsheetStore.loading" class="text-center py-8 text-gray-400 text-sm">
        <i class="pi pi-spin pi-spinner mr-1" />Loading balance sheet…
      </div>
      <KpiGrid v-else-if="bsheetMobileKpis.length" :items="bsheetMobileKpis" />
      <p class="text-xs text-center text-gray-400">Full balance sheet available on tablet+</p>
    </div>

    <!-- ── Tablet + Desktop: charts + table tabs ──────────────────── -->
    <ShowOn from="tablet">
    <!-- ── Chart view ── -->
    <div v-if="viewMode === 'chart' && bsheetStore.report" class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
      <div class="bg-white rounded-lg border p-4">
        <h3 class="text-base font-semibold text-gray-700 mb-3">Capital Employed vs WC Employed</h3>
        <KChart
          :key="`bsheet-capemployed-${unitLabel}`"
          type="bar"
          :data="assetStructureChart"
          height="260px"
        />
      </div>
      <div class="bg-white rounded-lg border p-4">
        <h3 class="text-base font-semibold text-gray-700 mb-3">Capital Invested vs WC Invested</h3>
        <KChart
          :key="`bsheet-capinvested-${unitLabel}`"
          type="bar"
          :data="liabilityChart"
          height="260px"
        />
      </div>
    </div>

    <!-- ── Table view ── -->
    <Tabs v-if="viewMode === 'table'" value="0" class="w-full">
      <TabList>
        <Tab value="0"><span>{{ t('bsheet.tab.detailed') }}</span></Tab>
        <Tab value="1"><span>{{ t('bsheet.tab.condensed') }}</span></Tab>
        <Tab value="2"><span>{{ t('bsheet.tab.analysis') }}</span></Tab>
        <Tab value="3"><span>{{ t('bsheet.tab.capitalEmployed') }}</span></Tab>
        <Tab value="4"><span>{{ t('bsheet.tab.charts') }}</span></Tab>
      </TabList>

      <TabPanels>
        <!-- ── Detailed Balance Sheet ── -->
        <TabPanel value="0">
          <Card>
            <template #content>
              <div v-if="bsheetStore.loading" class="text-center py-8 text-gray-500">Loading balance sheet…</div>
              <div v-else-if="bsheetStore.error" class="text-center py-8">
                <Message severity="error">{{ bsheetStore.error }}</Message>
              </div>
              <div v-else>
                <!-- Balance check -->
                <div class="mb-4 flex flex-wrap gap-2">
                  <Message
                    v-for="(ok, i) in balanceCheck"
                    :key="i"
                    :severity="ok ? 'success' : 'error'"
                  >{{ bsheetHeaders[i] }}: {{ ok ? 'Balanced ✓' : 'Imbalance !' }}</Message>
                </div>

                <DataTable :value="detailedRows" stripedRows showGridlines scrollable class="p-datatable-sm">
                  <Column field="label" header="Line Item" frozen class="min-w-[220px]">
                    <template #body="{ data }">
                      <span class="inline-flex items-center gap-1" :class="getRowClasses(data)">
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
                    v-for="(hdr, idx) in bsheetHeaders"
                    :key="idx"
                    :header="hdr"
                    class="text-right min-w-[110px]"
                    headerClass="text-right"
                  >
                    <template #body="{ data }">
                      <span :class="[getRowClasses(data), 'block text-right']">
                        {{ data.values.length ? formatUnit(Number(data.values[idx] ?? 0)) : '' }}
                      </span>
                    </template>
                  </Column>
                </DataTable>
              </div>
            </template>
          </Card>
        </TabPanel>

        <!-- ── Condensed Balance Sheet ── -->
        <TabPanel value="1">
          <Card>
            <template #content>
              <div v-if="bsheetStore.loading" class="text-center py-8 text-gray-500">Loading…</div>
              <div v-else-if="bsheetStore.error" class="text-center py-8">
                <Message severity="error">{{ bsheetStore.error }}</Message>
              </div>
              <div v-else>
                <DataTable :value="condensedRows" stripedRows showGridlines scrollable class="p-datatable-sm">
                  <Column field="label" header="Line Item" frozen class="min-w-[220px]">
                    <template #body="{ data }">
                      <span class="inline-flex items-center gap-1" :class="getRowClasses(data)">
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
                    v-for="(hdr, idx) in bsheetHeaders"
                    :key="idx"
                    :header="hdr"
                    class="text-right min-w-[110px]"
                    headerClass="text-right"
                  >
                    <template #body="{ data }">
                      <span :class="[getRowClasses(data), 'block text-right font-medium']">
                        {{ data.values.length ? formatUnit(Number(data.values[idx] ?? 0)) : '' }}
                      </span>
                    </template>
                  </Column>
                </DataTable>
              </div>
            </template>
          </Card>
        </TabPanel>

        <!-- ── BS Analysis ── -->
        <TabPanel value="2">
          <Card>
            <template #content>
              <div v-if="bsheetStore.loading" class="text-center py-8 text-gray-500">Loading…</div>
              <div v-else-if="bsheetStore.error" class="text-center py-8">
                <Message severity="error">{{ bsheetStore.error }}</Message>
              </div>
              <div v-else>
                <DataTable :value="analysisRows" stripedRows showGridlines scrollable class="p-datatable-sm">
                  <Column field="label" header="Financial Metric" frozen class="min-w-[220px]">
                    <template #body="{ data }">
                      <span class="inline-flex items-center gap-1" :class="getRowClasses(data)">
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
                    v-for="(hdr, idx) in bsheetHeaders"
                    :key="idx"
                    :header="hdr"
                    class="text-right min-w-[110px]"
                    headerClass="text-right"
                  >
                    <template #body="{ data }">
                      <span :class="[getRowClasses(data), 'block text-right']">
                        {{ data.values.length ? formatUnit(Number(data.values[idx] ?? 0)) : '' }}
                      </span>
                    </template>
                  </Column>
                </DataTable>
              </div>
            </template>
          </Card>
        </TabPanel>

        <!-- ── Capital Employed ── -->
        <TabPanel value="3">
          <Card>
            <template #content>
              <div v-if="bsheetStore.loading" class="text-center py-8 text-gray-500">Loading…</div>
              <div v-else-if="bsheetStore.error" class="text-center py-8">
                <Message severity="error">{{ bsheetStore.error }}</Message>
              </div>
              <div v-else>
                <DataTable :value="capitalEmployedRows" stripedRows showGridlines scrollable class="p-datatable-sm">
                  <Column field="label" header="Capital Component" frozen class="min-w-[220px]">
                    <template #body="{ data }">
                      <span class="inline-flex items-center gap-1" :class="getRowClasses(data)">
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
                    v-for="(hdr, idx) in bsheetHeaders"
                    :key="idx"
                    :header="hdr"
                    class="text-right min-w-[110px]"
                    headerClass="text-right"
                  >
                    <template #body="{ data }">
                      <span class="block text-right">
                        {{ formatUnit(Number(data.values[idx] ?? 0)) }}
                      </span>
                    </template>
                  </Column>
                </DataTable>
              </div>
            </template>
          </Card>
        </TabPanel>

        <!-- ── Charts ── -->
        <TabPanel value="4">
          <Card>
            <template #content>
              <div class="space-y-8">
                <div class="border rounded-lg p-6 bg-gray-50">
                  <KChart
                    :key="`bsheet-condensed-${unitLabel}`"
                    :data="condensedBsChart"
                    type="stacked-bar"
                    height="320px"
                    title="Condensed Balance Sheet"
                    :loading="bsheetStore.loading"
                  />
                </div>

                <div class="border rounded-lg p-6 bg-gray-50">
                  <KChart
                    :key="`bsheet-wcap-${unitLabel}`"
                    :data="workingCapitalChart"
                    type="combo"
                    height="320px"
                    title="Working Capital Evolution"
                    :loading="bsheetStore.loading"
                  />
                </div>

                <div class="border rounded-lg p-6 bg-gray-50">
                  <KChart
                    :key="`bsheet-assets-${unitLabel}`"
                    :data="assetsEvolutionChart"
                    type="area"
                    height="320px"
                    title="Assets Evolution"
                    :loading="bsheetStore.loading"
                  />
                </div>

                <div class="border rounded-lg p-6 bg-gray-50">
                  <KChart
                    :key="`bsheet-funding-${unitLabel}`"
                    :data="fundingMixChart"
                    type="stacked-bar"
                    height="320px"
                    title="Funding Mix"
                    :loading="bsheetStore.loading"
                  />
                </div>

                <!-- Waterfall section -->
                <div class="border rounded-lg p-6 bg-gray-50">
                  <div class="flex items-center justify-between mb-1">
                    <h3 class="text-base font-semibold text-gray-700">Balance Sheet Waterfall</h3>
                    <Select
                      v-model="wfYearIndex"
                      :options="wfYearOptions"
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Select period"
                      class="w-36"
                      size="small"
                    />
                  </div>
                  <p class="text-xs text-gray-400 mb-4">
                    Left: how assets are composed. Right: how the same total is funded. Both totals must be equal.
                  </p>
                  <!-- Legend -->
                  <div class="flex items-center gap-5 mb-4 text-xs text-gray-500">
                    <span class="flex items-center gap-1.5">
                      <span class="inline-block w-3 h-3 rounded-sm bg-emerald-500"></span> Positive item
                    </span>
                    <span class="flex items-center gap-1.5">
                      <span class="inline-block w-3 h-3 rounded-sm bg-red-500"></span> Negative item
                    </span>
                    <span class="flex items-center gap-1.5">
                      <span class="inline-block w-3 h-3 rounded-sm bg-indigo-500"></span> Total
                    </span>
                  </div>
                  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Assets waterfall -->
                    <div>
                      <h4 class="text-sm font-medium text-gray-600 mb-2">Assets</h4>
                      <div v-if="bsheetStore.loading" class="flex justify-center py-8">
                        <span class="text-gray-400 text-sm animate-pulse">Loading…</span>
                      </div>
                      <div v-else-if="!assetsWfData" class="flex justify-center py-8 text-gray-400 text-sm">
                        No data
                      </div>
                      <div v-else style="height: 320px; position: relative">
                        <Bar :key="`assets-${unitLabel}`" :data="assetsWfData" :options="wfOptions" />
                      </div>
                    </div>
                    <!-- Liabilities & Equity waterfall -->
                    <div>
                      <h4 class="text-sm font-medium text-gray-600 mb-2">Liabilities &amp; Equity</h4>
                      <div v-if="bsheetStore.loading" class="flex justify-center py-8">
                        <span class="text-gray-400 text-sm animate-pulse">Loading…</span>
                      </div>
                      <div v-else-if="!liabsWfData" class="flex justify-center py-8 text-gray-400 text-sm">
                        No data
                      </div>
                      <div v-else style="height: 320px; position: relative">
                        <Bar :key="`liabs-${unitLabel}`" :data="liabsWfData" :options="wfOptions" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </Card>
        </TabPanel>
      </TabPanels>
    </Tabs>
    </ShowOn><!-- end ShowOn from="tablet" -->
  </div>
</template>

<style scoped>
:deep(.p-tabs) { @apply border-0; }
:deep(.p-tabs .p-tablist) { @apply border-b border-gray-300; }
:deep(.p-tabs .p-tab) { @apply px-4 py-2; }

/* ── DEV button ─────────────────────────────────────────────────────────── */
.dev-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #92400e;
  background: #fffbeb;
  border: 1.5px dashed #f59e0b;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}
.dev-btn:hover:not(:disabled) { background: #fef3c7; }
.dev-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.dev-badge {
  padding: 0 0.3rem;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #fff;
  background: #f59e0b;
  border-radius: 3px;
}
</style>
