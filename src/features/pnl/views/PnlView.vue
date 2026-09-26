<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { devlog } from '@/utils/logger'
import type { PnlYear, ChartData } from '@/types'
import { usePnlStore } from '@/features/pnl/stores/pnlStore'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import { useYearHeaders } from '@/composables/useYearHeaders'
import { useDecimal } from '@/composables/useDecimal'
import { useDisplayUnitStore } from '@/stores/displayUnit'
import { useScenarioAnalysisStore } from '@/features/scenarios/stores/scenarioAnalysisStore'
import ShowOn from '@/components/common/ShowOn.vue'
import KpiGrid, { type KpiItem } from '@/components/common/KpiGrid.vue'
import SkeletonCard from '@/components/common/SkeletonCard.vue'
import ScenarioAnalysisCard from '@/features/ai/components/ScenarioAnalysisCard.vue'
import KYearGrid, { type GridRow } from '@/components/common/KYearGrid.vue'
import KChart from '@/components/common/KChart.vue'
import KFormLegend from '@/components/common/KFormLegend.vue'
import DataContainer from '@/components/layout/DataContainer.vue'
import PageContainer from '@/components/layout/PageContainer.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import KSection from '@/components/layout/KSection.vue'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ProgressSpinner from 'primevue/progressspinner'
import Button from 'primevue/button'
import api from '@/composables/useApi'

defineProps<{ planId?: string; sid?: string }>()

const { t } = useI18n()
const pnlStore = usePnlStore()
const planStore = usePlanStore()
const scenarioStore = useScenarioStore()
const analysisStore = useScenarioAnalysisStore()
const { yearHeaders } = useYearHeaders()
const { formatUnit, getUnitLabel, getLocale } = useDecimal()
const displayUnitStore = useDisplayUnitStore()
const unitLabel = computed(() => getUnitLabel())
const activeTab = ref('pnl')

// Scenario analysis (non-blocking)
const planStore_ref = computed(() => planStore.activePlan?.id)
const sid_ref = computed(() => scenarioStore.activeScenario?.id)

const analysis = computed(() =>
  planStore_ref.value && sid_ref.value
    ? analysisStore.getAnalysis(planStore_ref.value, sid_ref.value)
    : null
)
const analysisLoading = computed(() =>
  planStore_ref.value && sid_ref.value
    ? analysisStore.isLoading(planStore_ref.value, sid_ref.value)
    : false
)

const pnlMobileKpis = computed<KpiItem[]>(() => {
  const years = pnlStore.report?.years
  if (!years?.length) return []
  const y1 = years[0]
  const sales = Number(y1.sales ?? 0)
  const ebitda = Number(y1.ebitda ?? 0)
  const netProfit = Number(y1.netProfit ?? 0)
  const ebitdaPct = sales > 0 ? (ebitda / sales) * 100 : 0
  const netPct = sales > 0 ? (netProfit / sales) * 100 : 0
  // find first profitable year
  const bepYear = years.findIndex(y => Number(y.netProfit) > 0)
  return [
    { id: 'revenue', label: t('pnl.kpi.revenueY1'), value: formatUnit(sales, 0), severity: 'neutral' },
    { id: 'ebitda', label: t('pnl.kpi.ebitdaY1'), value: formatUnit(ebitda, 0), severity: ebitda >= 0 ? 'positive' : 'negative', subtitle: `${ebitdaPct.toFixed(1)}% of sales` },
    { id: 'net_margin', label: t('pnl.kpi.netMarginY1'), value: `${netPct.toFixed(1)}%`, severity: netPct >= 0 ? 'positive' : 'negative' },
    { id: 'bep', label: t('pnl.kpi.profitableFrom'), value: bepYear >= 0 ? t('pnl.kpi.year', { n: bepYear + 1 }) : t('pnl.kpi.beyondY5'), severity: bepYear >= 0 ? 'positive' : 'negative' },
  ]
})

const isDev = import.meta.env.DEV
const downloading = ref(false)

// ── Dev: download ALL inputs + outputs for P&L audit ─────────────────────────
async function downloadResults() {
  const planId = planStore.activePlan?.id
  const sid = scenarioStore.activeScenario?.id
  if (!planId || !sid) return

  downloading.value = true
  try {
    const base = `/api/v1/plans/${planId}/scenarios/${sid}`

    // Fetch every input and output in parallel
    const [
      config,
      opexPerHire,
      capexPerHire,
      openingBalance,
      wcConfig,
      revenue,
      staffHeadcounts,
      staffSalaries,
      staffIncentives,
      staffPayroll,
      capexEntries,
      capexSummary,
      opexEntries,
      opexSummary,
      pnlInputs,
      pnlReport,
    ] = await Promise.all([
      api.get(`${base}/settings/config`).then(r => r.data).catch(() => null),
      api.get(`${base}/settings/opex-per-hire`).then(r => r.data).catch(() => null),
      api.get(`${base}/settings/capex-per-hire`).then(r => r.data).catch(() => null),
      api.get(`${base}/settings/opening-balance`).then(r => r.data).catch(() => null),
      api.get(`${base}/settings/wc-config`).then(r => r.data).catch(() => null),
      api.get(`${base}/products/revenue/consolidated`).then(r => r.data).catch(() => null),
      api.get(`${base}/staff/headcounts`).then(r => r.data).catch(() => null),
      api.get(`${base}/staff/salaries`).then(r => r.data).catch(() => null),
      api.get(`${base}/staff/incentives`).then(r => r.data).catch(() => null),
      api.get(`${base}/staff/summary`).then(r => r.data).catch(() => null),
      api.get(`${base}/capex/`).then(r => r.data).catch(() => null),
      api.get(`${base}/capex/summary`).then(r => r.data).catch(() => null),
      api.get(`${base}/opex/`).then(r => r.data).catch(() => null),
      api.get(`${base}/opex/summary`).then(r => r.data).catch(() => null),
      api.get(`${base}/pnl/`).then(r => r.data).catch(() => null),
      api.get(`${base}/pnl/report`).then(r => r.data).catch(() => null),
    ])

    const bundle = {
      meta: {
        planId,
        scenarioId: sid,
        exportedAt: new Date().toISOString(),
      },
      inputs: {
        settings: { config, opexPerHire, capexPerHire, openingBalance, wcConfig },
        revenue,
        staff: { headcounts: staffHeadcounts, salaries: staffSalaries, incentives: staffIncentives },
        capex: capexEntries,
        opex: opexEntries,
        pnlManualEntries: pnlInputs,
      },
      computed: {
        staffPayroll,
        capexSummary,
        opexSummary,
        pnlReport: pnlReport ?? pnlStore.report,
      },
    }

    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pnl-audit-${sid.slice(0, 8)}.json`
    a.click()
    URL.revokeObjectURL(url)
  } finally {
    downloading.value = false
  }
}

// ── P&L row definitions (row-oriented display of the column-oriented backend) ─
interface PnlRowDef {
  key: keyof PnlYear
  label: string
  isAggregate?: boolean
  isInput?: boolean
  indent?: boolean
  tooltip?: string
  /** A count (FTE), not an amount: not scaled by the €/k€/M€ display unit. */
  isCount?: boolean
}

// Computed so labels re-evaluate when locale changes (FR ↔ EN).
const PNL_ROW_DEFS = computed<PnlRowDef[]>(() => [
  { key: 'sales',                  label: t('pnl.row.sales'),                  isAggregate: true,
    tooltip: 'Total net revenue from product and service sales for the year, net of discounts and returns. Sourced from the Products & Services module.' },
  { key: 'exportSalesMemo',        label: t('pnl.row.exportSalesMemo'),  indent: true,
    tooltip: 'Memo item — portion of net sales attributable to export markets. For informational purposes only; does not affect totals.' },
  { key: 'capitalizedProduction',  label: t('pnl.row.capitalizedProduction'), isInput: true,
    tooltip: 'Internally produced assets capitalised on the balance sheet (e.g. in-house software meeting IAS 38 development-phase criteria). Increases operating revenue and adds to assets. Entered in Manual Adjustments.' },
  { key: 'storedProduction',       label: t('pnl.row.storedProduction'),
    tooltip: 'Variation in finished goods and work-in-progress inventory between year-end and year-start. Positive = inventory built up; negative = inventory consumed. Computed from the revenue model.' },
  { key: 'totalOperatingRevenue',  label: t('pnl.row.totalOperatingRevenue'), isAggregate: true,
    tooltip: 'Net sales + capitalised production + change in inventory. The full top-line of the P&L before any costs.' },
  { key: 'cogs',                   label: t('pnl.row.cogs'),
    tooltip: 'Cost of Goods Sold — direct costs tied to producing or delivering the product: raw materials, direct labour, and manufacturing overhead. Computed from the revenue and product cost settings.' },
  { key: 'externalExpenses',       label: t('pnl.row.externalExpenses'),
    tooltip: 'All external operating costs from the OPEX module: premises, leasing, professional fees, royalties, travel, marketing, and HR expenses.' },
  { key: 'totalConsumption',       label: t('pnl.row.totalConsumption'), isAggregate: true,
    tooltip: 'COGS + external expenses. Total resources consumed to generate operating revenue.' },
  { key: 'addedValue',             label: t('pnl.row.addedValue'),       isAggregate: true,
    tooltip: 'Total operating revenue minus total consumption. Measures the economic value created by the business before labour and taxation.' },
  { key: 'taxesAndDuties',         label: t('pnl.row.taxesAndDuties'),
    tooltip: 'Local business taxes, property taxes, and other fiscal duties — excluding corporate income tax. Rate configured in Settings.' },
  { key: 'payrollExpenses',        label: t('pnl.row.payrollExpenses'),
    tooltip: 'Total staff cost: gross salaries + employer social charges + incentives and bonuses. Pulled from the Staff Payroll module.' },
  { key: 'ebitda',                 label: t('pnl.row.ebitda'),           isAggregate: true,
    tooltip: 'Earnings Before Interest, Taxes, Depreciation & Amortisation. Added value minus taxes & duties and payroll. Key measure of recurring operational profitability.' },
  { key: 'depreciation',           label: t('pnl.row.depreciation'),
    tooltip: 'Annual depreciation and amortisation of fixed assets, computed from the Capex depreciation schedule using straight-line method over each asset\'s useful life.' },
  { key: 'impairment',             label: t('pnl.row.impairment'),       isInput: true,
    tooltip: 'Exceptional write-down of asset values when recoverable amount falls below book value. Enter as a positive number. Entered in Manual Adjustments.' },
  { key: 'grantsOtherRevenue',     label: t('pnl.row.grantsOtherRevenue'),
    tooltip: 'Government subsidies, R&D tax credits (e.g. CIR/CII), and other non-operating income. Configured in Settings.' },
  { key: 'otherOperatingExp',      label: t('pnl.row.otherOperatingExp'), isInput: true,
    tooltip: 'Miscellaneous operating costs outside the standard categories. Enter as a positive number (expense). Entered in Manual Adjustments.' },
  { key: 'ebit',                   label: t('pnl.row.ebit'),             isAggregate: true,
    tooltip: 'Earnings Before Interest & Tax. EBITDA minus depreciation, impairment, grants, and other operating items. Core measure of operating profitability before financing.' },
  { key: 'financialRevenues',      label: t('pnl.row.financialRevenues'),
    tooltip: 'Interest income, dividends from investments, and other financial income. Computed from treasury and cash position settings.' },
  { key: 'financialExpenses',      label: t('pnl.row.financialExpenses'),
    tooltip: 'Interest charges on loans and financial liabilities. Computed from the financing plan and debt settings.' },
  { key: 'preTaxEarnings',         label: t('pnl.row.preTaxEarnings'),   isAggregate: true,
    tooltip: 'EBIT plus net financial income/expense plus extraordinary items. Profit before corporate tax.' },
  { key: 'extraordinaryIncome',    label: t('pnl.row.extraordinaryIncome'), isInput: true,
    tooltip: 'One-off income outside normal operations — e.g. asset disposal gains, insurance proceeds. Enter as a positive number. Entered in Manual Adjustments.' },
  { key: 'extraordinaryExpense',   label: t('pnl.row.extraordinaryExpense'), isInput: true,
    tooltip: 'One-off costs outside normal operations — e.g. restructuring charges, litigation settlements. Enter as a positive number (expense). Entered in Manual Adjustments.' },
  { key: 'employeeParticipation',  label: t('pnl.row.employeeParticipation'), isInput: true,
    tooltip: 'Mandatory or voluntary profit-sharing paid to employees (e.g. French intéressement / participation légale). Reduces pre-tax earnings. Entered in Manual Adjustments.' },
  { key: 'corporateTax',           label: t('pnl.row.corporateTax'),
    tooltip: 'Corporate income tax computed on taxable profit at the applicable rate. Tax rate and carry-forward loss rules are configured in Settings.' },
  { key: 'taxCredits',             label: t('pnl.row.taxCredits'),
    tooltip: 'Tax credits directly reducing the tax liability (e.g. French Crédit d\'Impôt Recherche). Configured in Settings.' },
  { key: 'netProfit',              label: t('pnl.row.netProfit'),        isAggregate: true,
    tooltip: 'Bottom-line profit after all revenues, expenses, taxes, and credits. The key indicator of overall financial performance.' },
  { key: 'cashFlow',               label: t('pnl.row.cashFlow'),         isAggregate: true,
    tooltip: 'Net profit + depreciation & amortisation. A proxy for operating cash generation before working capital movements and financing. Also called self-financing capacity (capacité d\'autofinancement).' },
  { key: 'staffHeadcount',         label: t('pnl.row.staffHeadcount'),   isCount: true,
    tooltip: 'Total full-time equivalent headcount for the year, summed across all staff categories from the Staff module. Informational memo line.' },
])

// ── Manual entry grid (left panel) ──────────────────────────────────────────
const INPUT_LINE_IDS = [
  'capitalized_production',
  'impairment',
  'other_operating_exp',
  'extraordinary_income',
  'extraordinary_expense',
  'employee_participation',
] as const

const INPUT_LABELS: Record<string, string> = {
  capitalized_production: 'Capitalized Production',
  impairment: 'Impairment',
  other_operating_exp: 'Other Operating Expenses',
  extraordinary_income: 'Extraordinary Income',
  extraordinary_expense: 'Extraordinary Expense',
  employee_participation: 'Employee Participation',
}

const INPUT_TOOLTIPS: Record<string, string> = {
  capitalized_production: 'Internally developed assets meeting capitalisation criteria (e.g. IAS 38 development phase). Increases operating revenue and is recognised as an intangible asset on the balance sheet.',
  impairment:             'Exceptional write-down when an asset\'s recoverable amount falls below its book value. Reduces EBIT. Enter as a positive number.',
  other_operating_exp:    'Miscellaneous operating costs not covered by COGS, OPEX, or payroll. Enter as a positive number (expense).',
  extraordinary_income:   'One-off income outside normal business operations — e.g. proceeds from asset disposals or insurance claims. Enter as a positive number.',
  extraordinary_expense:  'One-off costs outside normal operations — e.g. restructuring charges or litigation settlements. Enter as a positive number (expense).',
  employee_participation: 'Profit-sharing distributed to employees (e.g. French intéressement / participation légale). Reduces earnings before corporate tax. Enter as a positive number.',
}

const gridRows = computed<GridRow[]>(() => {
  return INPUT_LINE_IDS.map((lineId) => {
    const values: number[] = []
    for (let y = 0; y < 5; y++) {
      const entry = pnlStore.manualEntries.find(
        (e) => e.lineId === lineId && e.yearIndex === y,
      )
      values.push(entry ? Number(entry.amount) : 0)
    }
    return {
      id: lineId,
      label: INPUT_LABELS[lineId] ?? lineId,
      values,
      editable: true,
      tooltip: INPUT_TOOLTIPS[lineId],
    }
  })
})

function onCellEdit(payload: { rowId: string; yearIndex: number; value: number }) {
  // yearIndex from KYearGrid is 0-based (0..4), matching backend convention
  const entry = pnlStore.manualEntries.find(
    (e) => e.lineId === payload.rowId && e.yearIndex === payload.yearIndex,
  )
  if (entry) {
    entry.amount = String(payload.value)
  } else {
    pnlStore.manualEntries.push({
      id: '',
      scenarioId: '',
      lineId: payload.rowId,
      yearIndex: payload.yearIndex,
      amount: String(payload.value),
    })
  }
  debouncedSave()
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null
function debouncedSave() {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    pnlStore.updateEntries(pnlStore.manualEntries).catch((err) => devlog.error('[pnl] debounced save failed', err))
  }, 300)
}

// ── Report table rows (pivot years → rows) ───────────────────────────────────
const reportTableRows = computed(() => {
  const years = pnlStore.report?.years
  if (!years?.length) return []

  return PNL_ROW_DEFS.value.map((def) => {
    const values = years.map((y) => Number(y[def.key] ?? 0))
    const pctOfSales = years.map((y) => {
      if (def.isCount) return '—'
      const sales = Number(y.sales)
      const val   = Number(y[def.key] ?? 0)
      return sales !== 0 ? ((val / sales) * 100).toFixed(1) : '—'
    })
    return {
      label:       def.label,
      values,
      pctOfSales,
      isAggregate: def.isAggregate ?? false,
      isInput:     def.isInput ?? false,
      indent:      def.indent ?? false,
      tooltip:     def.tooltip,
      isCount:     def.isCount ?? false,
    }
  })
})

// ── Transform raw PnlChartData → ChartData for KChart ───────────────────────
// Backend returns a map of named arrays; we pick 3 meaningful series.
const pnlChartForDisplay = computed<ChartData | null>(() => {
  const raw = pnlStore.chartData
  if (!raw) return null

  // Helper: Go decimal.Decimal arrays serialise as numbers in JSON
  const toNum = (arr: any[]): number[] => (arr ?? []).map(v => Number(v))
  const factor = displayUnitStore.factor
  const sc = (arr: any[]) => toNum(arr).map(v => v / factor)
  const labels = (raw.years ?? []).map(String)

  return {
    labels,
    datasets: [
      {
        label: 'Sales',
        data: sc(raw.sales),
        backgroundColor: '#3b82f6',
      },
      {
        label: 'EBITDA',
        data: sc(raw.ebitda),
        backgroundColor: '#10b981',
      },
      {
        label: 'Net Profit',
        data: sc(raw.netProfit),
        backgroundColor: '#6366f1',
        type: 'line',
        borderColor: '#6366f1',
      },
    ],
  }
})

// Chart 2 — Cost Structure by P&L category (stacked bar)
const costStructureChart = computed<ChartData | null>(() => {
  const raw = pnlStore.chartData
  if (!raw) return null
  const toNum = (arr: any[]): number[] => (arr ?? []).map(v => Number(v))
  const factor = displayUnitStore.factor
  const sc = (arr: any[]) => toNum(arr).map(v => v / factor)
  const labels = yearHeaders.value
  return {
    labels,
    datasets: [
      { label: 'COGS',               data: sc(raw.cogs),            backgroundColor: 'rgba(239,68,68,0.75)',   borderColor: 'rgb(239,68,68)',   stack: 'costs' },
      { label: 'External Expenses',  data: sc(raw.otherOpex),       backgroundColor: 'rgba(249,115,22,0.75)',  borderColor: 'rgb(249,115,22)',  stack: 'costs' },
      { label: 'Payroll',            data: sc(raw.payrollExpenses),  backgroundColor: 'rgba(59,130,246,0.75)',  borderColor: 'rgb(59,130,246)',  stack: 'costs' },
      { label: 'Taxes & Duties',     data: toNum(raw.ebit).map((_, i) => {
          // taxes & duties = addedValue - payroll - ebitda
          const av = Number((raw.addedValue ?? [])[i] ?? 0)
          const pw = Number((raw.payrollExpenses ?? [])[i] ?? 0)
          const eb = Number((raw.ebitda ?? [])[i] ?? 0)
          return Math.max(0, av - pw - eb) / factor
        }), backgroundColor: 'rgba(245,158,11,0.75)', borderColor: 'rgb(245,158,11)', stack: 'costs' },
      { label: 'Depreciation',       data: sc(raw.depreciation),    backgroundColor: 'rgba(100,116,139,0.75)', borderColor: 'rgb(100,116,139)', stack: 'costs' },
    ],
  }
})

// Chart 3 — Margin % evolution (line)
// pct() returns the ratio×100 when sales > 0, otherwise null (Chart.js skips null points).
const marginPctChart = computed<ChartData | null>(() => {
  const years = pnlStore.report?.years
  if (!years?.length) return null
  const pct = (n: number, sales: number): number | null =>
    sales > 0 ? (n / sales) * 100 : null
  return {
    labels: yearHeaders.value,
    datasets: [
      {
        label: 'Gross Margin %',
        data: years.map(y => pct(y.sales - y.cogs, y.sales)) as number[],
        type: 'line', borderColor: 'rgb(59,130,246)', backgroundColor: 'rgba(59,130,246,0.1)',
      },
      {
        label: 'EBITDA %',
        data: years.map(y => pct(y.ebitda, y.sales)) as number[],
        type: 'line', borderColor: 'rgb(16,185,129)', backgroundColor: 'rgba(16,185,129,0.1)',
      },
      {
        label: 'Net Profit %',
        data: years.map(y => pct(y.netProfit, y.sales)) as number[],
        type: 'line', borderColor: 'rgb(99,102,241)', backgroundColor: 'rgba(99,102,241,0.1)',
      },
    ],
  }
})

onMounted(async () => {
  if (planStore.activePlan && scenarioStore.activeScenario) {
    await pnlStore.fetchAll()
    // non-blocking — AI must never block financial rendering
    if (planStore.activePlan?.id && scenarioStore.activeScenario?.id) {
      analysisStore.fetchIfNeeded(planStore.activePlan.id, scenarioStore.activeScenario.id)
    }
  }
})
</script>

<template>
  <PageContainer>
    <PageHeader>
      <template #title>
        <h1 class="text-lg sm:text-xl md:text-2xl">{{ t('nav.pnl') }}</h1>
      </template>
      <template #actions>
        <Button
          v-if="isDev"
          label="Download Audit"
          icon="pi pi-download"
          size="small"
          severity="secondary"
          :loading="downloading"
          @click="downloadResults"
        />
      </template>
    </PageHeader>

    <KSection v-if="pnlStore.loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </KSection>

    <!-- ── Mobile: KPI summary ── -->
    <ShowOn v-else only="mobile">
      <div class="space-y-4 p-4" data-testid="pnl-mobile-surface">
        <ScenarioAnalysisCard v-if="analysis" :analysis="analysis" mode="compact" />
        <SkeletonCard v-else-if="analysisLoading" :lines="2" />
        <KpiGrid :items="pnlMobileKpis" />
      </div>
    </ShowOn>

    <!-- ── Tablet/Desktop: full tabs ── -->
    <ShowOn v-if="!pnlStore.loading" from="tablet">
    <Tabs :value="activeTab" @update:value="(v: any) => activeTab = v" class="flex-1">
      <TabList>
        <Tab value="pnl">{{ t('pnl.tab.report') }}</Tab>
        <Tab value="graphs">{{ t('pnl.tab.graphs') }}</Tab>
      </TabList>
      <TabPanels>
        <!-- P&L Report Tab -->
        <TabPanel value="pnl" class="p-0">
          <div class="flex flex-col gap-4">
            <!-- Top Card: Editable Entries -->
            <div class="bg-white rounded-sm border border-gray-200 p-3 md:p-6">
              <h2 class="text-sm md:text-lg font-semibold mb-2 text-gray-700">Manual Adjustments</h2>
              <KFormLegend
                variant="grid"
                description="Optional line items that sit outside normal operations. Enter amounts in thousands. Leave at zero if not applicable — the P&L report below updates instantly."
              />
              <DataContainer min-width="700px">
                <KYearGrid :rows="gridRows" :unit="unitLabel" @cell-edit="onCellEdit" />
              </DataContainer>
            </div>

            <!-- Bottom Card: P&L Report Table -->
            <div class="bg-white rounded-sm border border-gray-200 p-3 md:p-6 overflow-auto">
              <h2 class="text-sm md:text-lg font-semibold mb-4 text-gray-700">P&L Report</h2>
              <DataTable
                v-if="pnlStore.report"
                :value="reportTableRows"
                class="p-datatable-sm p-datatable-gridlines"
                :scrollable="true"
                scrollHeight="flex"
                showGridlines
                size="small"
              >
                <Column field="label" header="Line Item" frozen class="min-w-[220px]">
                  <template #body="{ data }">
                    <span
                      :class="[
                        data.isAggregate ? 'font-bold text-gray-900' : 'font-normal text-gray-700',
                        data.indent ? 'pl-6 italic text-gray-500' : '',
                      ]"
                      class="inline-flex items-center gap-1"
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
                        data.isInput
                          ? 'bg-orange-50 text-orange-700'
                          : data.isAggregate
                            ? 'bg-blue-50 text-blue-900'
                            : '',
                      ]"
                      class="block px-2 py-0.5 rounded-sm text-right"
                    >
                      {{ data.isCount
                        ? Number(data.values[idx] ?? 0).toLocaleString(getLocale(), { maximumFractionDigits: 1 })
                        : formatUnit(data.values[idx] ?? 0, 0) }}
                    </span>
                  </template>
                </Column>

                <Column header="% Y1 Sales" class="text-right min-w-[80px]">
                  <template #body="{ data }">
                    <span class="text-right text-sm text-gray-500">
                      {{ data.pctOfSales[0] !== '—' ? data.pctOfSales[0] + '\u00A0%' : '—' }}
                    </span>
                  </template>
                </Column>
              </DataTable>
            </div>
          </div><!-- end flex-col -->
        </TabPanel>

        <!-- Graphs Tab -->
        <TabPanel value="graphs" class="p-0 pt-4">
          <div class="flex flex-col gap-6">
            <!-- Chart 1: Revenue, EBITDA & Net Profit -->
            <div class="bg-white rounded-sm border border-gray-200 p-4">
              <h2 class="text-lg font-semibold mb-4 text-gray-700">Revenue, EBITDA &amp; Net Profit ({{ unitLabel }})</h2>
              <KChart :key="`pnl-revprofit-${unitLabel}`" :data="pnlChartForDisplay" type="combo" height="320px" :loading="pnlStore.loading" />
            </div>

            <!-- Chart 2: Cost Structure by P&L category -->
            <div class="bg-white rounded-sm border border-gray-200 p-4">
              <h2 class="text-lg font-semibold mb-4 text-gray-700">Cost Structure by P&amp;L Category ({{ unitLabel }})</h2>
              <KChart :key="`pnl-coststructure-${unitLabel}`" :data="costStructureChart" type="stacked-bar" height="320px" :loading="pnlStore.loading" />
            </div>

            <!-- Chart 3: Margin % evolution -->
            <div class="bg-white rounded-sm border border-gray-200 p-4">
              <h2 class="text-lg font-semibold mb-4 text-gray-700">Margin % Evolution</h2>
              <KChart :data="marginPctChart" type="line" height="280px" :loading="pnlStore.loading" />
            </div>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
    </ShowOn>
  </PageContainer>
</template>

<style scoped>
:deep(.cell-input) {
  background-color: #fed7aa;
}

:deep(.cell-computed) {
  background-color: #dcfce7;
}

:deep(.row-aggregate) {
  font-weight: bold;
}
</style>
