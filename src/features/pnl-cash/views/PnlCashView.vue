<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { devlog } from '@/utils/logger'
import type { ChartData } from '@/types'
import { usePnlCashStore } from '@/features/pnl-cash/stores/pnlCashStore'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import { useYearHeaders } from '@/composables/useYearHeaders'
import { useDecimal } from '@/composables/useDecimal'
import { useDisplayUnitStore } from '@/stores/displayUnit'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ProgressSpinner from 'primevue/progressspinner'
import Select from 'primevue/select'
import { Bar } from 'vue-chartjs'
import '@/plugins/chartjs'
import KChart from '@/components/common/KChart.vue'
import KFormLegend from '@/components/common/KFormLegend.vue'

defineProps<{ planId?: string; sid?: string }>()

const pnlCashStore = usePnlCashStore()
const planStore = usePlanStore()
const scenarioStore = useScenarioStore()
const { yearHeaders } = useYearHeaders()
const { formatUnit, getUnitLabel } = useDecimal()
const displayUnitStore = useDisplayUnitStore()
const unitLabel = computed(() => getUnitLabel())
const activeTab = ref('functional')

// ── DEV helpers (only shown in development mode) ─────────────────────────────
const isDev = import.meta.env.DEV

/** Downloads the current entries + report as a timestamped JSON file. */
function downloadDevJSON() {
  const payload = {
    exported: new Date().toISOString(),
    inputs: pnlCashStore.entries,
    report: pnlCashStore.report,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = `pnl-cash-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ── Row tooltips ──────────────────────────────────────────────────────────────
// yearIndex convention: this module uses 0-based (0–4) throughout — backend compute
// loop runs `for yearIndex := 0; yearIndex < 5` and stores entries with yearIndex 0–4.
// onCellEdit therefore passes payload.yearIndex directly with no +1 conversion.
const ROW_TOOLTIPS: Record<string, string> = {
  sales:            'Total net revenue from product and service sales across all geographies and channels. Sourced from the Products & Services module.',
  costOfSales:      'Direct costs tied to producing or delivering the product: raw materials, direct labour, and manufacturing overhead. Sourced from the revenue model COGS settings.',
  grossMargin:      'Sales minus Cost of Sales. Measures the profitability of the core product before any operating expenses. Key indicator of pricing power and production efficiency.',
  rdPayroll:        'Payroll costs allocated to the R&D function (engineers, product managers, R&D technicians), sourced from the Staff Payroll module by function.',
  outsourcedRd:     'External R&D staff costs — freelancers and sub-contractors assigned to R&D projects — from the OPEX External Staff (R&D) line.',
  royaltiesMisc:    'Patent and trademark royalty payments, sourced from the OPEX Royalties subcategory (royalty_patents + royalty_trademarks).',
  salesPayroll:     'Payroll costs allocated to Sales & Marketing staff (sales team, marketing, customer success), sourced from the Staff Payroll module by function.',
  advertisingPromo: 'Advertising, trade shows, design, and promotion costs aggregated from the OPEX Marketing & Communication subcategory.',
  misc_sales_costs: 'Miscellaneous Sales & Marketing costs not covered by standard OPEX lines. This is the only manually editable cell in this view.',
  gaPayroll:        'Payroll costs allocated to General & Administrative staff (managers, assistants, finance, HR, IT, executives), sourced from the Staff Payroll module by function.',
  insuranceRent:    'Business insurance premiums and property rental costs, aggregated from the OPEX Premises & Services subcategory.',
  leasedEquip:      'Movable and real estate leasing payments from the OPEX Leasing subcategory.',
  legalConsulting:  'Professional fees and studies/documentation costs from the OPEX Professional Services subcategory.',
  travelMisc:       'Travel, representation, supplies, telecom, maintenance, recruitment, and other miscellaneous G&A costs aggregated from several OPEX lines.',
  depreciation:     'Annual depreciation and amortisation of fixed assets, computed from the Capex depreciation schedule (straight-line over each asset\'s useful life).',
  ebit:             'Earnings Before Interest & Tax. Gross margin minus all function costs (R&D, Sales & Marketing, G&A) and depreciation. Core measure of operating profitability.',
  interestExpense:  'Interest charges on loans and financial liabilities, sourced from the main P&L Financial Expenses line.',
  subsidies:        'Government grants, R&D tax credits, and other operating subsidies, sourced from the main P&L Grants & Other Revenue line.',
  taxesIncurred:    'Corporate income tax for the year, sourced from the main P&L Corporate Tax line.',
  netProfit:        'Bottom-line profit: EBIT minus interest expense, plus subsidies, minus taxes. Net profit margin (%) shown relative to sales.',
}

// Functional P&L table rows — built by transposing backend years[0..4] into row arrays.
const functionalPnlRows = computed(() => {
  const r = pnlCashStore.report
  if (!r || !r.years || r.years.length === 0) return []

  const yrs = r.years  // PnlCashYear[]

  // Extract a field from all 5 years into a values array.
  type YearKey = keyof typeof yrs[0]
  const vals = (key: YearKey): number[] => yrs.map((y) => y[key] as number)

  // % of sales helper: value / sales * 100, rounded to 1dp.
  const pct = (key: YearKey): string[] =>
    yrs.map((y) => {
      const s = y.sales
      if (!s) return '-'
      return ((y[key] as number / s) * 100).toFixed(1)
    })

  const emptyPct = Array(5).fill('-') as string[]

  const rows: any[] = []

  const section = (label: string) =>
    rows.push({ label, values: Array(5).fill(null), pctOfRevenue: emptyPct, isAggregate: true, isInput: false })

  const row = (label: string, key: YearKey, opts: { agg?: boolean; input?: boolean; rowId?: string } = {}) => {
    const id = opts.rowId ?? String(key)
    rows.push({
      label,
      rowId: id,
      values: vals(key),
      pctOfRevenue: pct(key),
      isAggregate: opts.agg ?? false,
      isInput: opts.input ?? false,
      tooltip: ROW_TOOLTIPS[id],
    })
  }

  // ── Sales & Gross Margin ──────────────────────────────────────────────────
  section('Sales & Gross Margin')
  row('Sales', 'sales')
  row('Cost of Sales', 'costOfSales')
  row('Gross Margin', 'grossMargin', { agg: true })

  // ── R&D / Production ─────────────────────────────────────────────────────
  section('R&D / Production')
  row('R&D Payroll', 'rdPayroll')
  row('Outsourced R&D', 'outsourcedRd')
  row('Royalties / Misc', 'royaltiesMisc')

  // ── Sales & Marketing ─────────────────────────────────────────────────────
  section('Sales & Marketing')
  row('Sales Payroll', 'salesPayroll')
  row('Advertising & Promo', 'advertisingPromo')
  row('Misc Sales Costs', 'miscSalesCosts', { input: true, rowId: 'misc_sales_costs' })

  // ── G&A ──────────────────────────────────────────────────────────────────
  section('G&A')
  row('G&A Payroll', 'gaPayroll')
  row('Insurance / Rent', 'insuranceRent')
  row('Leased Equipment', 'leasedEquip')
  row('Legal / Consulting', 'legalConsulting')
  row('Travel / Misc', 'travelMisc')

  row('Depreciation', 'depreciation')

  // ── EBIT ─────────────────────────────────────────────────────────────────
  rows.push({
    label: 'EBIT (Earnings Before Interest & Tax)',
    rowId: 'ebit',
    values: vals('ebit'),
    pctOfRevenue: emptyPct,
    isAggregate: true,
    isInput: false,
    tooltip: ROW_TOOLTIPS['ebit'],
  })

  row('Interest Expense', 'interestExpense')
  row('Subsidies', 'subsidies')
  row('Taxes', 'taxesIncurred')

  // ── Net Profit ────────────────────────────────────────────────────────────
  rows.push({
    label: 'Net Profit',
    rowId: 'netProfit',
    values: vals('netProfit'),
    pctOfRevenue: yrs.map((y) => (y.salesPct * 100).toFixed(1)),
    isAggregate: true,
    isInput: false,
    tooltip: ROW_TOOLTIPS['netProfit'],
  })

  return rows
})

function onCellEdit(payload: { rowId: string; yearIndex: number; value: number }) {
  // lineId in DB is 'misc_sales_costs'; match on both rowId and yearIndex
  if (payload.rowId !== 'misc_sales_costs') return
  const existing = pnlCashStore.entries.find(
    (e) => e.lineId === 'misc_sales_costs' && e.yearIndex === payload.yearIndex,
  )
  if (existing) {
    existing.amount = String(payload.value)
  } else {
    // Entry doesn't exist yet — create it in-place so it gets persisted on save
    pnlCashStore.entries.push({
      lineId: 'misc_sales_costs',
      yearIndex: payload.yearIndex,
      amount: String(payload.value),
    } as any)
  }
  debouncedSave()
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null
function debouncedSave() {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    pnlCashStore.updateEntries(pnlCashStore.entries).catch((err) => devlog.error('[pnl-cash] debounced save failed', err))
  }, 300)
}

// ── Chart computed properties ────────────────────────────────────────────────

// Chart 1 — Sales, Gross Margin & Net Profit (combo)
const salesMarginChart = computed<ChartData | null>(() => {
  const yrs = pnlCashStore.report?.years
  if (!yrs?.length) return null
  const factor = displayUnitStore.factor
  return {
    labels: yearHeaders.value,
    datasets: [
      {
        label: 'Sales',
        data: yrs.map(y => y.sales / factor),
        backgroundColor: 'rgba(59,130,246,0.6)',
        borderColor: 'rgb(59,130,246)',
      },
      {
        label: 'Gross Margin',
        data: yrs.map(y => y.grossMargin / factor),
        backgroundColor: 'rgba(16,185,129,0.6)',
        borderColor: 'rgb(16,185,129)',
      },
      {
        label: 'Net Profit',
        data: yrs.map(y => y.netProfit / factor),
        type: 'line',
        borderColor: 'rgb(99,102,241)',
        backgroundColor: 'rgba(99,102,241,0.15)',
      },
    ],
  }
})

// Chart 2 — Cost by function (stacked bar): existing chartData from store
// Wrap with factor scaling so it reacts to unit changes.
const scaledPnlCashChart = computed<ChartData | null>(() => {
  const raw = pnlCashStore.chartData
  if (!raw) return null
  const factor = displayUnitStore.factor
  return {
    labels: raw.labels,
    datasets: raw.datasets.map(ds => ({
      ...ds,
      data: (ds.data as number[]).map(v => v / factor),
    })),
  }
})

// Chart 3 — Margin % evolution (line)
// When sales = 0, ratio is undefined → null so Chart.js skips the point cleanly.
// EBIT can be negative (loss phase) — the line will correctly go below zero.
const cashMarginPctChart = computed<ChartData | null>(() => {
  const yrs = pnlCashStore.report?.years
  if (!yrs?.length) return null
  const pct = (n: number, sales: number): number | null =>
    sales > 0 ? (n / sales) * 100 : null
  return {
    labels: yearHeaders.value,
    datasets: [
      {
        label: 'Gross Margin %',
        data: yrs.map(y => pct(y.grossMargin, y.sales)) as number[],
        type: 'line', borderColor: 'rgb(59,130,246)', backgroundColor: 'rgba(59,130,246,0.1)',
      },
      {
        label: 'EBIT %',
        // Negative values (EBIT < 0) render below the zero baseline — expected behaviour.
        data: yrs.map(y => pct(y.ebit, y.sales)) as number[],
        type: 'line', borderColor: 'rgb(249,115,22)', backgroundColor: 'rgba(249,115,22,0.1)',
      },
      {
        label: 'Net Profit %',
        data: yrs.map(y => pct(y.netProfit, y.sales)) as number[],
        type: 'line', borderColor: 'rgb(99,102,241)', backgroundColor: 'rgba(99,102,241,0.1)',
      },
    ],
  }
})

// ── Waterfall chart ───────────────────────────────────────────────────────────
// Year selector: 0-based index matching pnlCashStore.report.years[i]
const selectedYearIndex = ref(0)

const yearOptions = computed(() =>
  (pnlCashStore.report?.years ?? []).map((y, i) => ({
    label: `Year ${y.year ?? i + 1}`,
    value: i,
  })),
)

interface WfBar {
  label: string
  start: number
  end: number
  isSubtotal: boolean
  isPositive: boolean
}

const waterfallChartData = computed<any>(() => {
  const yrs = pnlCashStore.report?.years
  if (!yrs?.length) return null
  const y = yrs[selectedYearIndex.value]
  if (!y) return null

  const factor = displayUnitStore.factor
  const sc = (v: number) => v / factor   // scale helper

  const abs = Math.abs
  const bars: WfBar[] = []

  // Sales (positive base bar)
  bars.push({ label: 'Sales', start: 0, end: sc(y.sales), isSubtotal: false, isPositive: true })

  // Cost of Sales: sits between grossMargin and sales (negative impact)
  bars.push({ label: 'Cost of Sales', start: sc(y.grossMargin), end: sc(y.sales), isSubtotal: false, isPositive: false })

  // Gross Margin subtotal
  bars.push({ label: 'Gross Margin', start: 0, end: sc(y.grossMargin), isSubtotal: true, isPositive: y.grossMargin >= 0 })

  let cursor = sc(y.grossMargin)

  // R&D costs
  const rdTotal = sc(abs(y.rdPayroll) + abs(y.outsourcedRd) + abs(y.royaltiesMisc))
  if (rdTotal > 0) {
    bars.push({ label: 'R&D', start: cursor - rdTotal, end: cursor, isSubtotal: false, isPositive: false })
    cursor -= rdTotal
  }

  // Sales & Marketing
  const smTotal = sc(abs(y.salesPayroll) + abs(y.advertisingPromo) + abs(y.miscSalesCosts))
  if (smTotal > 0) {
    bars.push({ label: 'Sales & Mktg', start: cursor - smTotal, end: cursor, isSubtotal: false, isPositive: false })
    cursor -= smTotal
  }

  // G&A
  const gaTotal = sc(abs(y.gaPayroll) + abs(y.insuranceRent) + abs(y.leasedEquip) + abs(y.legalConsulting) + abs(y.travelMisc))
  if (gaTotal > 0) {
    bars.push({ label: 'G&A', start: cursor - gaTotal, end: cursor, isSubtotal: false, isPositive: false })
    cursor -= gaTotal
  }

  // Depreciation
  const depAmt = sc(abs(y.depreciation))
  if (depAmt > 0) {
    bars.push({ label: 'Depreciation', start: cursor - depAmt, end: cursor, isSubtotal: false, isPositive: false })
    cursor -= depAmt
  }

  // EBIT subtotal — reset cursor to actual EBIT value to absorb rounding drift
  bars.push({ label: 'EBIT', start: 0, end: sc(y.ebit), isSubtotal: true, isPositive: y.ebit >= 0 })
  cursor = sc(y.ebit)

  // Interest Expense
  const intExp = sc(abs(y.interestExpense))
  if (intExp > 0) {
    bars.push({ label: 'Interest', start: cursor - intExp, end: cursor, isSubtotal: false, isPositive: false })
    cursor -= intExp
  }

  // Subsidies (positive if > 0)
  if (y.subsidies > 0) {
    bars.push({ label: 'Subsidies', start: cursor, end: cursor + sc(y.subsidies), isSubtotal: false, isPositive: true })
    cursor += sc(y.subsidies)
  } else if (y.subsidies < 0) {
    bars.push({ label: 'Subsidies', start: cursor + sc(y.subsidies), end: cursor, isSubtotal: false, isPositive: false })
    cursor += sc(y.subsidies)
  }

  // Taxes
  const taxAmt = sc(abs(y.taxesIncurred))
  if (taxAmt > 0) {
    bars.push({ label: 'Taxes', start: cursor - taxAmt, end: cursor, isSubtotal: false, isPositive: false })
    cursor -= taxAmt
  }

  // Net Profit subtotal
  bars.push({ label: 'Net Profit', start: 0, end: sc(y.netProfit), isSubtotal: true, isPositive: y.netProfit >= 0 })

  const bgColors = bars.map((b) => {
    if (b.isSubtotal) return 'rgba(99,102,241,0.85)'
    if (b.isPositive) return 'rgba(16,185,129,0.75)'
    return 'rgba(239,68,68,0.72)'
  })
  const borderColors = bars.map((b) => {
    if (b.isSubtotal) return 'rgb(79,70,229)'
    if (b.isPositive) return 'rgb(5,150,105)'
    return 'rgb(220,38,38)'
  })

  return {
    labels: bars.map((b) => b.label),
    datasets: [
      {
        label: unitLabel.value,
        data: bars.map((b) => [b.start, b.end]),
        backgroundColor: bgColors,
        borderColor: borderColors,
        borderWidth: 1.5,
        borderSkipped: false,
      },
    ],
  }
})

const waterfallOptions = computed<any>(() => {
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

onMounted(async () => {
  if (planStore.activePlan && scenarioStore.activeScenario) {
    await pnlCashStore.fetchAll()
  }
})
</script>

<template>
  <div class="flex flex-col h-full gap-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-800">P&L Cash (Anglo-Saxon Functional)</h1>

      <!-- DEV-ONLY: download inputs + report as JSON -->
      <div v-if="isDev" class="flex gap-2">
        <button
          :disabled="!pnlCashStore.report"
          class="dev-btn"
          @click="downloadDevJSON"
        >
          <span class="dev-badge">DEV</span>
          ⬇ Download JSON
        </button>
      </div>
    </div>

    <div v-if="pnlCashStore.loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <Tabs v-else :value="activeTab" @update:value="(v: any) => activeTab = v" class="flex-1">
      <TabList>
        <Tab value="functional">Functional P&L</Tab>
        <Tab value="graphs">Graphs</Tab>
      </TabList>
      <TabPanels>
        <!-- Functional P&L Tab -->
        <TabPanel value="functional" class="p-0">
          <div class="bg-white rounded border border-gray-200 p-4 overflow-auto">
            <h2 class="text-lg font-semibold mb-2 text-gray-700">Functional P&L Statement</h2>
            <KFormLegend
              variant="grid"
              description="Anglo-Saxon functional P&L organised by business function (R&D, Sales & Marketing, G&A). Shows gross contribution per function and EBITDA. All values in thousands. Orange cells are editable miscellaneous cost inputs."
            />
            <DataTable
              v-if="pnlCashStore.report"
              :value="functionalPnlRows"
              class="p-datatable-sm p-datatable-gridlines"
              :scrollable="true"
              scrollHeight="flex"
              showGridlines
              size="small"
            >
              <Column field="label" header="Line Item" frozen class="min-w-[250px]">
                <template #body="{ data }">
                  <span
                    class="inline-flex items-center gap-1"
                    :class="[
                      data.isAggregate ? 'font-bold' : 'font-normal',
                      data.isInput ? 'text-orange-600' : 'text-green-600',
                    ]"
                  >
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
                v-for="(header, idx) in yearHeaders"
                :key="idx"
                :header="header"
                class="text-right min-w-[110px]"
              >
                <template #body="{ data }">
                  <span
                    :class="[
                      data.isAggregate ? 'font-bold' : 'font-normal',
                      data.isInput ? 'bg-orange-100' : 'bg-green-100',
                    ]"
                    class="block px-2 py-1 rounded text-right"
                  >
                    {{ data.values[idx] != null ? formatUnit(Number(data.values[idx]), 0) : '-' }}
                  </span>
                </template>
              </Column>

              <Column header="% of Revenue" class="text-right min-w-[90px]">
                <template #body="{ data }">
                  <span class="text-right text-sm text-gray-600">
                    {{ data.pctOfRevenue?.[0] || '-' }}%
                  </span>
                </template>
              </Column>
            </DataTable>
            <div class="text-sm text-orange-600 mt-4 font-semibold">
              📝 Orange row: Editable (Misc Sales Costs). Green rows: Computed.
            </div>
          </div>
        </TabPanel>

        <!-- Graphs Tab -->
        <TabPanel value="graphs" class="p-0 pt-4">
          <div class="flex flex-col gap-6">
            <!-- Chart 1: Sales, Gross Margin & Net Profit -->
            <div class="bg-white rounded border border-gray-200 p-4">
              <h2 class="text-lg font-semibold mb-4 text-gray-700">Sales, Gross Margin &amp; Net Profit ({{ unitLabel }})</h2>
              <KChart :key="`pnlcash-salesmargin-${unitLabel}`" :data="salesMarginChart" type="combo" height="320px" :loading="pnlCashStore.loading" />
            </div>

            <!-- Chart 2: Cost by function -->
            <div class="bg-white rounded border border-gray-200 p-4">
              <h2 class="text-lg font-semibold mb-4 text-gray-700">Cost by Function ({{ unitLabel }})</h2>
              <KChart :key="`pnlcash-costfn-${unitLabel}`" :data="scaledPnlCashChart" type="stacked-bar" height="320px" :loading="pnlCashStore.loading" />
            </div>

            <!-- Chart 3: Margin % evolution -->
            <div class="bg-white rounded border border-gray-200 p-4">
              <h2 class="text-lg font-semibold mb-4 text-gray-700">Margin % Evolution</h2>
              <KChart :data="cashMarginPctChart" type="line" height="280px" :loading="pnlCashStore.loading" />
            </div>

            <!-- Chart 4: P&L Waterfall by year -->
            <div class="bg-white rounded border border-gray-200 p-4">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-semibold text-gray-700">P&amp;L Waterfall</h2>
                <Select
                  v-model="selectedYearIndex"
                  :options="yearOptions"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Select year"
                  class="w-36"
                  size="small"
                />
              </div>
              <!-- Legend -->
              <div class="flex items-center gap-5 mb-3 text-xs text-gray-500">
                <span class="flex items-center gap-1.5">
                  <span class="inline-block w-3 h-3 rounded-sm bg-emerald-500"></span> Positive
                </span>
                <span class="flex items-center gap-1.5">
                  <span class="inline-block w-3 h-3 rounded-sm bg-red-500"></span> Negative
                </span>
                <span class="flex items-center gap-1.5">
                  <span class="inline-block w-3 h-3 rounded-sm bg-indigo-500"></span> Subtotal
                </span>
              </div>
              <div v-if="pnlCashStore.loading" class="flex justify-center py-10">
                <ProgressSpinner style="width: 40px; height: 40px" />
              </div>
              <div v-else-if="!waterfallChartData" class="flex justify-center py-10 text-gray-400 text-sm">
                No data available
              </div>
              <div v-else style="height: 380px; position: relative">
                <Bar :key="unitLabel" :data="waterfallChartData" :options="waterfallOptions" />
              </div>
            </div>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<style scoped>
:deep(.cell-input)    { background-color: #fed7aa; }
:deep(.cell-computed) { background-color: #dcfce7; }
:deep(.row-aggregate) { font-weight: bold; background-color: #f3f4f6; }

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
