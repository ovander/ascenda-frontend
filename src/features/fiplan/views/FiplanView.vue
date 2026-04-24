<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { devlog } from '@/utils/logger'
import { useFiplanStore } from '@/features/fiplan/stores/fiplanStore'
import { useScenarioCapTableStore } from '@/features/captable/stores/scenarioCapTableStore'
import { usePnlStore } from '@/features/pnl/stores/pnlStore'
import { useBSheetStore } from '@/features/bsheet/stores/bsheetStore'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import { useSettingsStore } from '@/features/settings/stores/settingsStore'
import { useUiStore } from '@/stores/ui'
import { useYearHeaders } from '@/composables/useYearHeaders'
import { useDecimal } from '@/composables/useDecimal'
import { useDisplayUnitStore } from '@/stores/displayUnit'
import type { ChartData, FiplanEntry } from '@/types'
import KYearGrid, { type GridRow } from '@/components/common/KYearGrid.vue'
import KFormLegend from '@/components/common/KFormLegend.vue'
import KChart from '@/components/common/KChart.vue'
import DataContainer from '@/components/layout/DataContainer.vue'
import { Bar } from 'vue-chartjs'
import '@/plugins/chartjs'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import ProgressSpinner from 'primevue/progressspinner'
import Select from 'primevue/select'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import ResponsiveDialog from '@/components/common/ResponsiveDialog.vue'

defineProps<{ planId?: string; sid?: string }>()

const { t } = useI18n()
const fiplanStore    = useFiplanStore()
const capTableStore  = useScenarioCapTableStore()
const pnlStore       = usePnlStore()
const bsheetStore    = useBSheetStore()
const planStore      = usePlanStore()
const scenarioStore  = useScenarioStore()
const settingsStore  = useSettingsStore()
const ui             = useUiStore()
const { yearHeaders } = useYearHeaders()
const { getUnitLabel, formatUnit } = useDecimal()
const unitLabel = computed(() => getUnitLabel())
const displayUnitStore = useDisplayUnitStore()
const activeTab = ref('plan')

// ── Helpers ──────────────────────────────────────────────────────────────────
const z5 = (): number[] => [0, 0, 0, 0, 0]

function toNumbers(arr: string[] | undefined): number[] {
  if (!arr) return z5()
  return arr.map((v) => parseFloat(v) || 0)
}

function entryValues(lineId: string): number[] {
  const arr: number[] = z5()
  fiplanStore.entries
    .filter((e) => e.lineId === lineId)
    .forEach((e) => {
      const idx = e.yearIndex - 1  // yearIndex is 1-based
      if (idx >= 0 && idx < 5) arr[idx] = parseFloat(e.amount) || 0
    })
  return arr
}

// ── Cap Table link badges & action buttons ────────────────────────────────────
// Derive per-year badges for the capital_increase row from entries that carry
// a capTableRoundLabel (set when the amount was pushed from a cap table round).
// The badge turns amber when the cap table round amount diverged from the FiPlan amount.
const capitalIncreaseBadges = computed<(string | { label: string; warning: boolean } | null)[]>(() => {
  const badges: (string | { label: string; warning: boolean } | null)[] = [null, null, null, null, null]
  // Build a quick lookup: capTableRoundId → isSyncAmountDivergent (from loaded rounds)
  const divergentIds = new Set(
    capTableStore.rounds
      .filter((r) => r.isSyncAmountDivergent)
      .map((r) => r.id),
  )
  fiplanStore.entries
    .filter((e) => e.lineId === 'capital_increase' && e.capTableRoundLabel)
    .forEach((e) => {
      const idx = e.yearIndex - 1 // yearIndex is 1-based
      if (idx >= 0 && idx < 5) {
        const label = e.capTableRoundLabel ?? ''
        const warning = !!(e.capTableRoundId && divergentIds.has(e.capTableRoundId))
        badges[idx] = { label, warning }
      }
    })
  return badges
})

// Per-year "Structure this raise" buttons — shown when:
//   • amount > 0 (the user has planned a capital injection), AND
//   • no cap table link exists for that year (no badge)
const capitalIncreaseButtons = computed<({ label: string; icon: string } | null)[]>(() => {
  return Array.from({ length: 5 }, (_, idx) => {
    if (capitalIncreaseBadges.value[idx]) return null // already linked
    const yearEntry = fiplanStore.entries.find(
      (e) => e.lineId === 'capital_increase' && e.yearIndex === idx + 1,
    )
    const amount = parseFloat(yearEntry?.amount ?? '0') || 0
    if (amount <= 0) return null
    return { label: 'Structure raise', icon: 'pi-arrow-up-right' }
  })
})

// ── "Structure this raise" dialog ─────────────────────────────────────────────
const showStructureRaiseDialog = ref(false)
const structureRaiseYearIndex = ref(0) // 0-based

const SHARE_CLASS_OPTIONS = [
  { label: 'Ordinary / Common',  value: 'common'      },
  { label: 'Preferred A',        value: 'preferred_a' },
  { label: 'Preferred B',        value: 'preferred_b' },
  { label: 'Preferred C',        value: 'preferred_c' },
  { label: 'Preferred D',        value: 'preferred_d' },
  { label: 'Convertible Note',   value: 'convertible' },
]

const structureRaiseForm = ref({
  label: '',
  shareClassType: 'preferred_a',
  phaseNumber: 1,
  sortOrder: 10,
})

function openStructureRaiseDialog(yearIndex: number) {
  structureRaiseYearIndex.value = yearIndex
  structureRaiseForm.value = {
    label: '',
    shareClassType: 'preferred_a',
    phaseNumber: 1,
    sortOrder: (yearIndex + 1) * 10,
  }
  showStructureRaiseDialog.value = true
}

async function submitStructureRaise() {
  const result = await fiplanStore.createRoundFromCapitalIncrease(
    structureRaiseYearIndex.value,
    structureRaiseForm.value,
  )
  if (result) {
    showStructureRaiseDialog.value = false
    ui.showToast('success', 'Cap table round created', `"${result.label}" has been created and linked to the financing plan.`)
    // Refresh cap table rounds if the store is already loaded, so divergence badges update.
    if (capTableStore.rounds.length > 0) {
      capTableStore.fetchRounds().catch(() => {})
    }
  } else if (fiplanStore.roundCreateError) {
    ui.showToast('error', 'Could not create round', fiplanStore.roundCreateError)
  }
}

// ── Financing Plan tab ────────────────────────────────────────────────────────
const planRows = computed<GridRow[]>(() => {
  const r = fiplanStore.report?.plan
  const rows: GridRow[] = []

  rows.push({ id: 'req_header', label: t('fiplan.label.requirements'), values: z5(), editable: false, isAggregate: true })
  rows.push({ id: 'capex',            label: t('fiplan.label.capex'),                  values: toNumbers(r?.requirements.capex),            editable: false,
    tooltip: t('fiplan.tooltip.capex') })
  rows.push({ id: 'wcrChange',        label: t('fiplan.label.wcrIncrease'),             values: toNumbers(r?.requirements.wcrChange),        editable: false,
    tooltip: t('fiplan.tooltip.wcrIncrease') })
  rows.push({ id: 'dividends',        label: t('fiplan.label.dividends'),               values: entryValues('dividends'),                    editable: true,
    tooltip: t('fiplan.tooltip.dividends') })
  rows.push({ id: 'loanRepayments',   label: t('fiplan.label.loanRepayments'),          values: toNumbers(r?.requirements.loanRepayments),   editable: false,
    tooltip: t('fiplan.tooltip.loanRepayments') })
  rows.push({ id: 'grantRepayments',  label: t('fiplan.label.grantRepayments'),         values: entryValues('grant_repayments'),             editable: true,
    tooltip: t('fiplan.tooltip.grantRepayments') })
  rows.push({ id: 'negativeCashFlow', label: t('fiplan.label.negativeOperatingFlow'),   values: toNumbers(r?.requirements.negativeCashFlow), editable: false,
    tooltip: t('fiplan.tooltip.negativeOperatingFlow') })
  rows.push({ id: 'total_req',        label: t('fiplan.label.totalRequirements'),       values: toNumbers(r?.requirements.total),            editable: false, isSubtotal: true,
    tooltip: t('fiplan.tooltip.totalRequirements') })

  rows.push({ id: 'res_header', label: t('fiplan.label.resources'), values: z5(), editable: false, isAggregate: true })
  rows.push({ id: 'positiveCashFlow',   label: t('fiplan.label.operatingCashFlow'),     values: toNumbers(r?.resources.positiveCashFlow),   editable: false,
    tooltip: t('fiplan.tooltip.operatingCashFlow') })
  rows.push({ id: 'capital_increase',   label: t('fiplan.label.capitalIncrease'),       values: entryValues('capital_increase'),            editable: true, cellBadges: capitalIncreaseBadges.value, cellButtons: capitalIncreaseButtons.value,
    tooltip: t('fiplan.tooltip.capitalIncrease') })
  rows.push({ id: 'current_account',    label: t('fiplan.label.currentAccountContrib'), values: entryValues('current_account_contrib'),     editable: true,
    tooltip: t('fiplan.tooltip.currentAccountContrib') })
  rows.push({ id: 'lt_loans',           label: t('fiplan.label.longTermLoans'),         values: entryValues('lt_loans'),                    editable: true,
    tooltip: t('fiplan.tooltip.longTermLoans') })
  rows.push({ id: 'subsidies',          label: t('fiplan.label.subsidies'),             values: entryValues('subsidies'),                   editable: true,
    tooltip: t('fiplan.tooltip.subsidies') })
  rows.push({ id: 'other_grants',       label: t('fiplan.label.otherGrants'),           values: entryValues('other_grants'),                editable: true,
    tooltip: t('fiplan.tooltip.otherGrants') })
  rows.push({ id: 'repayable_grants',   label: t('fiplan.label.repayableGrants'),       values: entryValues('repayable_grants'),            editable: true,
    tooltip: t('fiplan.tooltip.repayableGrants') })
  rows.push({ id: 'asset_sales',        label: t('fiplan.label.assetSales'),            values: entryValues('asset_sales'),                 editable: true,
    tooltip: t('fiplan.tooltip.assetSales') })
  rows.push({ id: 'total_res',          label: t('fiplan.label.totalResources'),        values: toNumbers(r?.resources.total),              editable: false, isSubtotal: true,
    tooltip: t('fiplan.tooltip.totalResources') })

  const balance = toNumbers(r?.balance.annualBalance)
  const cumulative = toNumbers(r?.balance.cumulativeCash)
  rows.push({ id: 'annual_balance', label: t('fiplan.label.annualBalance'),  values: balance,    editable: false, isAggregate: true, colorBySign: true,
    tooltip: t('fiplan.tooltip.annualBalance') })
  rows.push({ id: 'cum_cash',       label: t('fiplan.label.cumulativeCash'), values: cumulative, editable: false, isSubtotal: true,  colorBySign: true,
    tooltip: t('fiplan.tooltip.cumulativeCash') })

  return rows
})

// ── Cash Flow Statement tab ───────────────────────────────────────────────────
const cashFlowRows = computed<GridRow[]>(() => {
  const cf = fiplanStore.report?.cashFlow
  const rows: GridRow[] = []

  rows.push({ id: 'op_header', label: t('fiplan.label.operatingActivities'), values: z5(), editable: false, isAggregate: true })
  rows.push({ id: 'cf_net_profit',      label: t('fiplan.label.netProfit'),       values: toNumbers(cf?.operating.netProfit),        editable: false,
    tooltip: t('fiplan.tooltip.netProfit') })
  rows.push({ id: 'cf_depreciation',    label: t('fiplan.label.depreciation'),    values: toNumbers(cf?.operating.depreciation),     editable: false,
    tooltip: t('fiplan.tooltip.depreciation') })
  rows.push({ id: 'cf_disposal',        label: t('fiplan.label.disposalGainLoss'),values: toNumbers(cf?.operating.disposalGainLoss), editable: false,
    tooltip: t('fiplan.tooltip.disposalGainLoss') })
  rows.push({ id: 'cf_wcr',            label: t('fiplan.label.changeInWCR'),      values: toNumbers(cf?.operating.wcrChange),        editable: false,
    tooltip: t('fiplan.tooltip.changeInWCR') })
  rows.push({ id: 'cf_op_total',       label: t('fiplan.label.totalOperating'),   values: toNumbers(cf?.operating.operatingFlows),   editable: false, isSubtotal: true, colorBySign: true,
    tooltip: t('fiplan.tooltip.totalOperating') })

  rows.push({ id: 'inv_header', label: t('fiplan.label.investingActivities'), values: z5(), editable: false, isAggregate: true })
  rows.push({ id: 'cf_capex',          label: t('fiplan.label.capex'),           values: toNumbers(cf?.investing.capexOutflow),     editable: false,
    tooltip: t('fiplan.tooltip.cfCapex') })
  rows.push({ id: 'cf_disposals',      label: t('fiplan.label.assetDisposals'),  values: toNumbers(cf?.investing.assetDisposals),   editable: false,
    tooltip: t('fiplan.tooltip.assetDisposals') })
  rows.push({ id: 'cf_disposal_gains', label: t('fiplan.label.disposalGainsLosses'), values: entryValues('disposal_gains_losses'),  editable: true,
    tooltip: t('fiplan.tooltip.disposalGainsLosses') })
  rows.push({ id: 'cf_inv_total',      label: t('fiplan.label.totalInvesting'),  values: toNumbers(cf?.investing.investmentFlows),  editable: false, isSubtotal: true,
    tooltip: t('fiplan.tooltip.totalInvesting') })

  rows.push({ id: 'fin_header', label: t('fiplan.label.financingActivities'), values: z5(), editable: false, isAggregate: true })
  rows.push({ id: 'cf_cap_inc',        label: t('fiplan.label.capitalIncrease'),     values: toNumbers(cf?.financing.capitalIncrease),     editable: false,
    tooltip: t('fiplan.tooltip.capitalIncreaseFlow') })
  rows.push({ id: 'cf_curr_acc',       label: t('fiplan.label.currentAccount'),      values: toNumbers(cf?.financing.currentAccountCont),  editable: false,
    tooltip: t('fiplan.tooltip.currentAccountFlow') })
  rows.push({ id: 'cf_loans_grants',   label: t('fiplan.label.newLoansAndGrants'),   values: toNumbers(cf?.financing.newLoansAndGrants),   editable: false,
    tooltip: t('fiplan.tooltip.newLoansAndGrants') })
  rows.push({ id: 'cf_dividends',      label: t('fiplan.label.dividends'),           values: toNumbers(cf?.financing.dividends),           editable: false,
    tooltip: t('fiplan.tooltip.dividendsFlow') })
  rows.push({ id: 'cf_repayments',     label: t('fiplan.label.loanGrantRepayments'), values: toNumbers(cf?.financing.loanGrantRepayments), editable: false,
    tooltip: t('fiplan.tooltip.loanGrantRepayments') })
  rows.push({ id: 'cf_fin_total',      label: t('fiplan.label.totalFinancing'),      values: toNumbers(cf?.financing.financingFlows),      editable: false, isSubtotal: true,
    tooltip: t('fiplan.tooltip.totalFinancing') })

  const initialCash = parseFloat(cf?.summary.initialCash ?? '0') || 0
  rows.push({ id: 'cf_net_change',  label: t('fiplan.label.netChangeInCash'), values: toNumbers(cf?.summary.changeInCash),  editable: false, isSubtotal: true,  colorBySign: true,
    tooltip: t('fiplan.tooltip.netChangeInCash') })
  rows.push({ id: 'cf_opening',     label: t('fiplan.label.openingCash'),     values: [initialCash, ...toNumbers(cf?.summary.cumulativeCash).slice(0, 4)], editable: false, colorBySign: true,
    tooltip: t('fiplan.tooltip.openingCash') })
  rows.push({ id: 'cf_closing',     label: t('fiplan.label.closingCash'),     values: toNumbers(cf?.summary.cumulativeCash), editable: false, isAggregate: true, colorBySign: true,
    tooltip: t('fiplan.tooltip.closingCash') })

  return rows
})

// ── Cell editing ──────────────────────────────────────────────────────────────

// Map GridRow id → FiplanEntry lineId for editable rows
const rowToLineId: Record<string, string> = {
  dividends:       'dividends',
  grantRepayments: 'grant_repayments',
  capital_increase: 'capital_increase',
  current_account: 'current_account_contrib',
  lt_loans:        'lt_loans',
  subsidies:       'subsidies',
  other_grants:    'other_grants',
  repayable_grants: 'repayable_grants',
  asset_sales:     'asset_sales',
  cf_disposal_gains: 'disposal_gains_losses',
}

function onCellEdit(payload: { rowId: string; yearIndex: number; value: number }) {
  const lineId = rowToLineId[payload.rowId]
  if (!lineId) return

  let entry = fiplanStore.entries.find(
    (e) => e.lineId === lineId && e.yearIndex === payload.yearIndex + 1,
  )

  if (!entry) {
    // No entry yet (fresh scenario — DB is empty for this line/year).
    // Create a placeholder so it's included in the next PUT.
    // The backend derives scenarioId from the URL; id is assigned server-side.
    entry = {
      id: '',
      lineId,
      scenarioId: scenarioStore.activeScenario?.id ?? '',
      yearIndex: payload.yearIndex + 1,
      amount: '0',
    } as FiplanEntry
    fiplanStore.entries.push(entry)
  }

  entry.amount = String(payload.value)
  debouncedSave()
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null
function debouncedSave() {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    fiplanStore.updateEntries(fiplanStore.entries).catch((err) => devlog.error('[fiplan] debounced save failed', err))
  }, 300)
}

// ── DEV helpers (only shown in development mode) ─────────────────────────────
const isDev = import.meta.env.DEV
const devGenerating = ref(false)

/** All 10 input line IDs × 5 years = 50 entries (sparse PUT — zeros excluded). */
const ALL_LINE_IDS = [
  'dividends', 'grant_repayments', 'capital_increase', 'current_account_contrib',
  'subsidies', 'other_grants', 'repayable_grants', 'lt_loans',
  'asset_sales', 'disposal_gains_losses',
] as const

/**
 * Builds a full 50-entry array (all lines × all years) from a sparse seed map,
 * zeroing anything not explicitly provided.
 */
function buildEntries(seed: Record<string, number[]>): any[] {
  const out: any[] = []
  for (const lineId of ALL_LINE_IDS) {
    const amounts = seed[lineId] ?? [0, 0, 0, 0, 0]
    for (let y = 1; y <= 5; y++) {
      out.push({ lineId, yearIndex: y, amount: String(amounts[y - 1] ?? 0) })
    }
  }
  return out
}

/**
 * DEV ONLY — seeds a realistic B2B startup financing plan, saves to backend,
 * re-fetches the report, then downloads both inputs and results as JSON.
 */
async function generateDevData() {
  devGenerating.value = true
  try {
    const devSeed: Record<string, number[]> = {
      // yr:                             1     2     3     4     5
      capital_increase:               [500,    0,  200,    0,    0],
      lt_loans:                       [300,  150,    0,    0,    0],
      subsidies:                      [ 80,   80,   40,    0,    0],
      repayable_grants:               [100,    0,    0,    0,    0],
      grant_repayments:               [  0,    0,   50,   50,    0],
      dividends:                      [  0,    0,    0,   50,  100],
      current_account_contrib:        [  0,    0,    0,    0,    0],
      other_grants:                   [  0,    0,    0,    0,    0],
      asset_sales:                    [  0,    0,    0,    0,    0],
      disposal_gains_losses:          [  0,    0,    0,    0,    0],
    }

    const entries = buildEntries(devSeed)
    await fiplanStore.updateEntries(entries)   // also re-fetches report
    downloadDevJSON()
  } finally {
    devGenerating.value = false
  }
}

/** Downloads the current entries + report as a timestamped JSON file. */
function downloadDevJSON() {
  const payload = {
    exported: new Date().toISOString(),
    inputs: fiplanStore.entries,
    report: fiplanStore.report,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = `fiplan-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ── Chart helpers ─────────────────────────────────────────────────────────────
function toNums(arr: string[] | undefined): number[] {
  return (arr ?? []).map(v => parseFloat(v) || 0)
}

// Chart 1 — Revenue, Net Profit and Cumulative Cash (combo)
const revenueProfitCashChart = computed<ChartData | null>(() => {
  const pnl  = pnlStore.report
  const cf   = fiplanStore.report?.cashFlow
  if (!pnl || !cf) return null

  const factor = displayUnitStore.factor
  const sc = (v: number) => v / factor

  const initialCash = sc(parseFloat(cf.summary.initialCash ?? '0') || 0)
  // Prepend initial cash so the line starts from opening position
  const cumulCash = [initialCash, ...toNums(cf.summary.cumulativeCash).map(sc)]
  const cashLabels = ['Opening', ...yearHeaders.value]

  return {
    labels: cashLabels,
    datasets: [
      {
        label: 'Revenue',
        // Shift bar series: pad opening year with 0
        data: [0, ...pnl.years.map(y => sc(y.sales))],
        backgroundColor: 'rgba(59,130,246,0.6)',
        borderColor: 'rgb(59,130,246)',
      },
      {
        label: 'Net Profit',
        data: [0, ...pnl.years.map(y => sc(y.netProfit))],
        backgroundColor: 'rgba(16,185,129,0.6)',
        borderColor: 'rgb(16,185,129)',
      },
      {
        label: 'Cumulative Cash',
        data: cumulCash,
        type: 'line',
        borderColor: 'rgb(168,85,247)',
        backgroundColor: 'rgba(168,85,247,0.15)',
      },
    ],
  }
})

// Chart 2 — WCR, Working Capital and Net Cash (including opening position)
const wcrWorkingCapitalChart = computed<ChartData | null>(() => {
  const bs = bsheetStore.report?.analysis
  if (!bs) return null

  const factor = displayUnitStore.factor
  const sc = (arr: number[]) => arr.map(v => v / factor)

  // BSheetAnalysis arrays: index 0 = opening, 1–5 = forecast years
  const labels = ['Opening', ...yearHeaders.value]

  return {
    labels,
    datasets: [
      {
        label: 'Working Capital (FR)',
        data: sc(bs.workingCapital),
        type: 'line',
        borderColor: 'rgb(59,130,246)',
        backgroundColor: 'rgba(59,130,246,0.15)',
      },
      {
        label: 'WCR (BFR)',
        data: sc(bs.wcr),
        type: 'line',
        borderColor: 'rgb(249,115,22)',
        backgroundColor: 'rgba(249,115,22,0.15)',
      },
      {
        label: 'Net Cash (TR)',
        data: sc(bs.wcMinusWcr),
        type: 'line',
        borderColor: 'rgb(16,185,129)',
        backgroundColor: 'rgba(16,185,129,0.15)',
      },
    ],
  }
})

// Chart 3 — Operating Cash Flow vs New Equity + Debt (combo)
const cashFlowFinancingChart = computed<ChartData | null>(() => {
  const cf = fiplanStore.report?.cashFlow
  if (!cf) return null

  const factor = displayUnitStore.factor
  const sc = (arr: number[]) => arr.map(v => v / factor)

  const opFlows = sc(toNums(cf.operating.operatingFlows))
  const newEquityDebt = toNums(cf.financing.capitalIncrease).map(
    (v, i) => (v + (toNums(cf.financing.newLoansAndGrants)[i] ?? 0)) / factor
  )

  return {
    labels: yearHeaders.value,
    datasets: [
      {
        label: 'Operating Cash Flow',
        data: opFlows,
        backgroundColor: 'rgba(20,184,166,0.6)',
        borderColor: 'rgb(20,184,166)',
      },
      {
        label: 'New Equity + Debt',
        data: newEquityDebt,
        type: 'line',
        borderColor: 'rgb(99,102,241)',
        backgroundColor: 'rgba(99,102,241,0.2)',
      },
    ],
  }
})

// Chart 4 — Balance Structure: Uses vs Sources (paired stacked bar)
// Uses stack: Noncurrent Assets | WCR > 0 | Net Cash > 0
// Sources stack: Equity | Net Debt > 0 | |WCR| when WCR < 0
const balanceStructureChart = computed<ChartData | null>(() => {
  const bs = bsheetStore.report?.analysis
  if (!bs) return null

  const factor = displayUnitStore.factor
  // Use only forecast years (indices 1–5)
  const slice = (arr: number[]) => arr.slice(1).map(v => v / factor)
  const pos   = (arr: number[]) => slice(arr).map(v => Math.max(0,  v))
  const neg   = (arr: number[]) => slice(arr).map(v => Math.max(0, -v))

  return {
    labels: yearHeaders.value,
    datasets: [
      // ── Uses ──────────────────────────────────────────────────────────────
      {
        label: 'Noncurrent Assets',
        data: pos(bs.noncurrentAssets),
        backgroundColor: 'rgba(59,130,246,0.75)',
        borderColor: 'rgb(59,130,246)',
        stack: 'uses',
      },
      {
        label: 'WCR > 0',
        data: pos(bs.wcr),
        backgroundColor: 'rgba(249,115,22,0.75)',
        borderColor: 'rgb(249,115,22)',
        stack: 'uses',
      },
      {
        label: 'Net Cash',
        data: pos(bs.wcMinusWcr),
        backgroundColor: 'rgba(20,184,166,0.75)',
        borderColor: 'rgb(20,184,166)',
        stack: 'uses',
      },
      // ── Sources ───────────────────────────────────────────────────────────
      {
        label: 'Equity',
        data: pos(bs.equity),
        backgroundColor: 'rgba(99,102,241,0.75)',
        borderColor: 'rgb(99,102,241)',
        stack: 'sources',
      },
      {
        label: 'Net Debt',
        data: pos(bs.netDebt),
        backgroundColor: 'rgba(239,68,68,0.75)',
        borderColor: 'rgb(239,68,68)',
        stack: 'sources',
      },
      {
        label: 'WCR < 0 (resource)',
        data: neg(bs.wcr),
        backgroundColor: 'rgba(245,158,11,0.75)',
        borderColor: 'rgb(245,158,11)',
        stack: 'sources',
      },
    ],
  }
})

// ── Cash Flow Bridge waterfall ────────────────────────────────────────────────
const cfBridgeYearIndex = ref(0)   // 0-based → year 1

const cfBridgeYearOptions = computed(() =>
  yearHeaders.value.map((h, i) => ({ label: h, value: i })),
)

const cashFlowBridgeData = computed<any>(() => {
  const cf = fiplanStore.report?.cashFlow
  if (!cf) return null
  const i = cfBridgeYearIndex.value
  const factor = displayUnitStore.factor

  const n = (arr: string[] | undefined, idx: number) =>
    (parseFloat((arr ?? [])[idx] ?? '0') || 0) / factor

  const initialCash  = (parseFloat(cf.summary.initialCash ?? '0') || 0) / factor
  const openingCash  = i === 0 ? initialCash : n(cf.summary.cumulativeCash, i - 1)
  const operatingCF  = n(cf.operating.operatingFlows, i)
  const investingCF  = n(cf.investing.investmentFlows, i)
  const financingCF  = n(cf.financing.financingFlows, i)
  const closingCash  = n(cf.summary.cumulativeCash, i)

  type Bar = { label: string; range: [number,number]; isSubtotal: boolean; isPositive: boolean }
  const bars: Bar[] = []

  const C_POS = 'rgba(16,185,129,0.75)';  const CB_POS = 'rgb(5,150,105)'
  const C_NEG = 'rgba(239,68,68,0.72)';   const CB_NEG = 'rgb(220,38,38)'
  const C_SUB = 'rgba(99,102,241,0.85)';  const CB_SUB = 'rgb(79,70,229)'

  function bar(label: string, start: number, end: number, sub = false): Bar {
    return { label, range: [start, end], isSubtotal: sub, isPositive: end >= start }
  }

  // 1. Opening cash position
  bars.push(bar('Opening Cash', 0, openingCash, true))
  let cursor = openingCash

  // 2. Operating CF delta
  bars.push(bar('Operating CF', cursor, cursor + operatingCF))
  cursor += operatingCF

  // 3. Investing CF delta (typically negative — capex)
  bars.push(bar('Investing CF', cursor, cursor + investingCF))
  cursor += investingCF

  // 4. Financing CF delta (equity raises, loans, repayments)
  bars.push(bar('Financing CF', cursor, cursor + financingCF))

  // 5. Closing cash anchor — reset to computed value to absorb rounding drift
  bars.push(bar('Closing Cash', 0, closingCash, true))

  const bgColors = bars.map(b =>
    b.isSubtotal ? C_SUB : b.isPositive ? C_POS : C_NEG,
  )
  const borderColors = bars.map(b =>
    b.isSubtotal ? CB_SUB : b.isPositive ? CB_POS : CB_NEG,
  )

  return {
    labels: bars.map(b => b.label),
    datasets: [{
      label: unitLabel.value,
      data: bars.map(b => b.range),
      backgroundColor: bgColors,
      borderColor: borderColors,
      borderWidth: 1.5,
      borderSkipped: false,
    }],
  }
})

const cfBridgeOptions = computed<any>(() => {
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

const graphsLoading = computed(() => fiplanStore.loading || pnlStore.loading || bsheetStore.loading)

// ── Cash status indicator ─────────────────────────────────────────────────────
// Uses the backend-computed warning[] array (true = cumulative cash < 0 that year).
const cashStatus = computed<{ hasNegative: boolean; negativeYears: number[] } | null>(() => {
  const w = fiplanStore.report?.warning
  if (!w || w.length === 0) return null
  const negativeYears = w.map((flag, i) => flag ? i + 1 : null).filter((y): y is number => y !== null)
  return { hasNegative: negativeYears.length > 0, negativeYears }
})

// ── Balance modal ─────────────────────────────────────────────────────────────

const FINANCING_OPTIONS = [
  { label: 'Capital Increase',         value: 'capital_increase' },
  { label: 'Long-term Loans',          value: 'lt_loans' },
  { label: 'Subsidies',                value: 'subsidies' },
  { label: 'Other Grants',             value: 'other_grants' },
  { label: 'Repayable Grants',         value: 'repayable_grants' },
  { label: 'Current Account Contrib.', value: 'current_account_contrib' },
]

/**
 * Y1-only financing options that touch the Opening Balance sheet rather than
 * the year-by-year fiplan entries.  We keep them in a separate list so they
 * can be offered exclusively for year 1 and routed to the correct API call.
 */
const Y1_OPENING_OPTIONS = [
  { label: 'Initial Share Capital (Opening Balance)', value: '_ob_share_capital' },
  { label: 'Initial Treasury / Cash (Opening Balance)', value: '_ob_cash' },
]

/** A single financing instrument assigned to a deficit year. */
interface InstrumentLine {
  financingType: string
  coveragePct:   number   // 0–100 share of the shortfall funded by this instrument
}

/** Per-year collection of instrument lines. */
interface YearConfig {
  lines: InstrumentLine[]
}

const showBalanceModal  = ref(false)
const safetyPct         = ref<number>(0)
const applyLoading      = ref(false)
/**
 * 2-year treasury rule: when enabled the Y1 shortfall absorbs Y2's projected
 * gap too, so the founder raises enough from the start to fund two full years
 * without needing a second round just to stay solvent.
 */
const twoYearTreasury   = ref<boolean>(true)

function defaultYearConfigs(): YearConfig[] {
  return Array.from({ length: 5 }, () => ({
    lines: [{ financingType: 'capital_increase', coveragePct: 100 }],
  }))
}

const yearConfigs = ref<YearConfig[]>(defaultYearConfigs())

function openBalanceModal() {
  resetBalance()
  showBalanceModal.value = true
}

function resetBalance() {
  yearConfigs.value    = defaultYearConfigs()
  safetyPct.value      = 0
  twoYearTreasury.value = true
}

function addLine(yearIdx: number) {
  yearConfigs.value[yearIdx].lines.push({ financingType: 'capital_increase', coveragePct: 0 })
}

function removeLine(yearIdx: number, lineIdx: number) {
  yearConfigs.value[yearIdx].lines.splice(lineIdx, 1)
  // Always keep at least one (empty) line per gap year
  if (yearConfigs.value[yearIdx].lines.length === 0) {
    yearConfigs.value[yearIdx].lines.push({ financingType: 'capital_increase', coveragePct: 0 })
  }
}

/** Amount contributed by one instrument line for a given shortfall.
 * The raw base-€ result is rounded UP to the nearest k€ (1 000 €) so the
 * values stored in fiplan entries are always clean multiples of 1 000. */
function lineAmount(shortfall: number, line: InstrumentLine): number {
  if (shortfall <= 0 || line.coveragePct <= 0) return 0
  const raw = shortfall * (line.coveragePct / 100) * (1 + safetyPct.value / 100)
  return Math.ceil(raw / 1000) * 1000
}

/**
 * Per-year gap analysis.  suggested = sum of all line amounts for the year.
 *
 * When `twoYearTreasury` is enabled the Y1 effective shortfall is expanded to
 * absorb the Y2 projected gap as well — so the first-year funding round covers
 * 24 months of runway instead of just 12.  Y2 is then shown as "covered by Y1
 * buffer" in the UI (shortfall = 0 for instrument-assignment purposes).
 */
const balanceRows = computed(() => {
  const r = fiplanStore.report?.plan
  if (!r) return []

  // Raw gaps for all 5 years (negative = deficit)
  const rawGaps = Array.from({ length: 5 }, (_, i) =>
    parseFloat(r.balance.annualBalance[i] ?? '0') || 0,
  )

  return Array.from({ length: 5 }, (_, i) => {
    const req    = parseFloat(r.requirements.total[i] ?? '0') || 0
    const res    = parseFloat(r.resources.total[i]    ?? '0') || 0
    const gap    = rawGaps[i]

    // Effective shortfall may be boosted for Y1 by the 2-year treasury rule
    let shortfall   = Math.max(0, -gap)
    let coveredByY1 = false   // true for Y2 when its gap is absorbed into Y1

    if (twoYearTreasury.value) {
      if (i === 0) {
        // Roll Y2's projected shortfall into Y1's required amount, so the
        // founding round covers 24 months (regardless of whether Y1 itself
        // had its own gap).
        const y2Shortfall = Math.max(0, -(rawGaps[1] ?? 0))
        shortfall += y2Shortfall
      } else if (i === 1) {
        // Y2's gap is already baked into Y1's requirement — suppress Y2's
        // instrument configuration row entirely.
        const y2BaseShortfall = Math.max(0, -gap)
        if (y2BaseShortfall > 0) {
          shortfall   = 0
          coveredByY1 = true
        }
      }
    }

    const lines            = yearConfigs.value[i].lines
    const suggested        = lines.reduce((sum, l) => sum + lineAmount(shortfall, l), 0)
    const totalCoveragePct = lines.reduce((sum, l) => sum + l.coveragePct, 0)
    return { year: i + 1, req, res, gap, shortfall, suggested, totalCoveragePct, coveredByY1 }
  })
})

const hasSomeGap = computed(() => balanceRows.value.some(r => r.shortfall > 0))

const totalSuggested = computed(() =>
  balanceRows.value.reduce((sum, r) => sum + r.suggested, 0),
)

/**
 * Format a base-€ value using the active display unit.
 * Report values (req, res, gap, suggested, lineAmount) are in base-€ —
 * pass them directly to formatUnit() which applies the correct factor
 * (÷1 for €, ÷1000 for k€, ÷1M for M€) and decimal places.
 */
function fmtK(val: number): string {
  if (val === 0) return '—'
  return formatUnit(val)
}

function fmtGap(val: number): string {
  if (val === 0) return '—'
  const formatted = formatUnit(Math.abs(val))
  return (val > 0 ? '+' : '−') + formatted
}

async function applyBalance() {
  const newEntries = fiplanStore.entries.map(e => ({ ...e }))

  // Accumulate opening-balance adjustments separately (only relevant for Y1)
  let obShareCapitalDelta = 0
  let obCashDelta         = 0

  for (let i = 0; i < 5; i++) {
    const row = balanceRows.value[i]
    if (row.shortfall <= 0) continue

    for (const line of yearConfigs.value[i].lines) {
      const amount = lineAmount(row.shortfall, line)
      if (amount <= 0) continue

      // Opening-balance instruments — handled separately from fiplan entries
      if (line.financingType === '_ob_share_capital') {
        obShareCapitalDelta += amount
        continue
      }
      if (line.financingType === '_ob_cash') {
        obCashDelta += amount
        continue
      }

      const lineId   = line.financingType
      const existing = newEntries.find(e => e.lineId === lineId && e.yearIndex === row.year)
      if (existing) {
        existing.amount = String(parseFloat(existing.amount || '0') + amount)
      } else {
        newEntries.push({
          id:         '',
          lineId,
          scenarioId: scenarioStore.activeScenario?.id ?? '',
          yearIndex:  row.year,
          amount:     String(amount),
        } as FiplanEntry)
      }
    }
  }

  applyLoading.value = true
  try {
    // Persist fiplan entries only when the payload is non-empty.
    // An empty array causes a backend "empty slice" INSERT error; this happens
    // when the scenario has no prior entries and all financing is via OB
    // instruments (which are routed to settingsStore, not fiplanStore).
    if (newEntries.length > 0) {
      await fiplanStore.updateEntries(newEntries)  // also re-fetches entries + report
    }

    // Patch opening balance if any OB instruments were used
    if (obShareCapitalDelta > 0 || obCashDelta > 0) {
      // Ensure the opening balance is loaded before patching
      if (!settingsStore.openingBalance) {
        await settingsStore.fetchOpeningBalance()
      }
      const current = settingsStore.openingBalance
      const patch: Record<string, string> = {}
      if (obShareCapitalDelta > 0) {
        const prev = parseFloat(current?.shareCapital ?? '0') || 0
        patch.shareCapital = String(prev + obShareCapitalDelta)
      }
      // A share-capital injection is a double entry: Dr Cash / Cr Equity.
      // Both _ob_share_capital and _ob_cash instruments therefore increase
      // opening cash — which is what the backend uses as the cumulative-cash
      // starting point when computing warning[].
      const obCashTotal = obCashDelta + obShareCapitalDelta
      if (obCashTotal > 0) {
        const prev = parseFloat(current?.cashAndSecurities ?? '0') || 0
        patch.cashAndSecurities = String(prev + obCashTotal)
      }
      await settingsStore.updateOpeningBalance(patch)
    }

    // Re-fetch the report when:
    //  • no fiplan entries were saved (updateEntries was skipped), or
    //  • OB was patched after updateEntries already ran with the old OB value.
    // Both cases require a fresh GET so the backend re-computes cumulative cash
    // (which includes initialCash) and the warning[] flags turn green.
    const needsFreshReport = newEntries.length === 0 || (obShareCapitalDelta > 0 || obCashDelta > 0)
    if (needsFreshReport) {
      await fiplanStore.fetchReport()
    }

    ui.showToast('success', 'Financing plan balanced', 'Entries saved successfully')
    showBalanceModal.value = false
  } catch (err: any) {
    devlog.error('[fiplan] applyBalance failed', err)
    const msg = err?.response?.data?.error?.message
      || err?.response?.data?.message
      || err?.message
      || 'Unknown error'
    ui.showToast('error', 'Could not apply balance', msg)
  } finally {
    applyLoading.value = false
  }
}

onMounted(async () => {
  if (planStore.activePlan && scenarioStore.activeScenario) {
    await Promise.all([
      fiplanStore.fetchAll(),
      pnlStore.report ? Promise.resolve() : pnlStore.fetchReport(),
      bsheetStore.report ? Promise.resolve() : bsheetStore.fetchReport(),
    ])
  }
})
</script>

<template>
  <div class="flex flex-col h-full gap-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-bold text-gray-800">Financial Plan</h1>

        <!-- Cash status badge — shown once the report is loaded -->
        <span
          v-if="cashStatus?.hasNegative"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium bg-red-50 text-red-700 border border-red-200"
          :title="`Cumulative cash is negative in year${cashStatus.negativeYears.length > 1 ? 's' : ''} ${cashStatus.negativeYears.map(y => 'Y' + y).join(', ')}`"
        >
          <i class="pi pi-flag-fill text-xs" />
          Negative cash in {{ cashStatus.negativeYears.map(y => 'Y' + y).join(', ') }}
        </span>
        <span
          v-else-if="cashStatus && !cashStatus.hasNegative"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200"
          title="Cumulative cash is positive in all five years"
        >
          <i class="pi pi-check-circle text-xs" />
          Cash positive — all years
        </span>
      </div>

      <!-- Balance button + DEV tools -->
      <div class="flex items-center gap-2">
        <Button
          label="Balance"
          icon="pi pi-sliders-h"
          severity="secondary"
          outlined
          size="small"
          :disabled="!fiplanStore.report"
          @click="openBalanceModal"
        />

        <!-- DEV-ONLY: seed financing data + download inputs/report JSON -->
        <template v-if="isDev">
          <button
            :disabled="devGenerating || fiplanStore.loading"
            class="dev-btn"
            @click="generateDevData"
          >
            <span class="dev-badge">DEV</span>
            {{ devGenerating ? 'Generating…' : '⚡ Generate & Download' }}
          </button>
          <button
            :disabled="!fiplanStore.report"
            class="dev-btn"
            @click="downloadDevJSON"
          >
            <span class="dev-badge">DEV</span>
            ⬇ Download JSON
          </button>
        </template>
      </div>
    </div>

    <div v-if="fiplanStore.loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <Tabs v-else :value="activeTab" @update:value="(v: any) => activeTab = v" class="flex-1">
      <TabList>
        <Tab value="plan">Financing Plan</Tab>
        <Tab value="cashflow">Cash Flow Statement</Tab>
        <Tab value="graphs">Graphs</Tab>
      </TabList>
      <TabPanels>
        <!-- Financing Plan Tab -->
        <TabPanel value="plan" class="p-0">
          <div class="bg-white rounded border border-gray-200 p-4">
            <KFormLegend
              variant="grid"
              description="Enter your financing sources and uses per year (in thousands). Requirements (Capex, WCR, Loan Repayments…) are auto-computed from other modules. Resources (Capital Increase, Loans, Subsidies…) are editable inputs. The plan must balance: Total Resources ≥ Total Requirements each year."
              :extras="[{ color: '#fed7aa', text: 'Orange rows — enter your financing amounts here' },
                        { color: '#dcfce7', text: 'Green rows — pulled automatically from other modules' }]"
            />
            <DataContainer min-width="700px">
              <KYearGrid
                :rows="planRows"
                :unit="unitLabel"
                @cell-edit="onCellEdit"
                @cell-button-click="(p) => { if (p.rowId === 'capital_increase') openStructureRaiseDialog(p.yearIndex) }"
              />
            </DataContainer>
          </div>
        </TabPanel>

        <!-- Cash Flow Statement Tab -->
        <TabPanel value="cashflow" class="p-0">
          <div class="bg-white rounded border border-gray-200 p-4">
            <h2 class="text-lg font-semibold mb-4 text-gray-700">Cash Flow Statement</h2>
            <DataContainer min-width="700px">
              <KYearGrid :rows="cashFlowRows" :unit="unitLabel" />
            </DataContainer>
          </div>
        </TabPanel>

        <!-- Graphs Tab -->
        <TabPanel value="graphs" class="p-0 pt-4">
          <div v-if="graphsLoading" class="flex justify-center py-12">
            <ProgressSpinner />
          </div>

          <div v-else class="flex flex-col gap-6">

            <!-- Chart 1: Revenue, Net Profit & Cumulative Cash -->
            <div class="bg-white rounded border border-gray-200 p-4">
              <h2 class="text-lg font-semibold mb-4 text-gray-700">Revenue, Profit &amp; Cash (k€)</h2>
              <div v-if="!revenueProfitCashChart" class="flex items-center justify-center h-40 text-gray-400">
                No P&L or cash flow data available yet.
              </div>
              <KChart v-else :key="`fiplan-revcash-${unitLabel}`" :data="revenueProfitCashChart" type="combo" height="320px" />
            </div>

            <!-- Chart 2: Working Capital, WCR and Net Cash (incl. opening) -->
            <div class="bg-white rounded border border-gray-200 p-4">
              <h2 class="text-lg font-semibold mb-4 text-gray-700">Working Capital, WCR &amp; Net Cash — incl. opening position (k€)</h2>
              <div v-if="!wcrWorkingCapitalChart" class="flex items-center justify-center h-40 text-gray-400">
                No balance sheet data available yet.
              </div>
              <KChart v-else :key="`fiplan-wcr-${unitLabel}`" :data="wcrWorkingCapitalChart" type="line" height="300px" />
            </div>

            <!-- Chart 3: Operating Cash Flow vs New Equity + Debt -->
            <div class="bg-white rounded border border-gray-200 p-4">
              <h2 class="text-lg font-semibold mb-4 text-gray-700">Operating Cash Flow vs New Equity + Debt (k€)</h2>
              <div v-if="!cashFlowFinancingChart" class="flex items-center justify-center h-40 text-gray-400">
                No cash flow statement available yet.
              </div>
              <KChart v-else :key="`fiplan-cffinancing-${unitLabel}`" :data="cashFlowFinancingChart" type="combo" height="280px" />
            </div>

            <!-- Chart 4: Balance Structure (Uses vs Sources) -->
            <div class="bg-white rounded border border-gray-200 p-4">
              <h2 class="text-lg font-semibold mb-4 text-gray-700">
                Balance Structure — Uses vs Sources (k€)
              </h2>
              <p class="text-xs text-gray-400 mb-3">
                Left bar (uses): Noncurrent Assets · WCR&nbsp;&gt;&nbsp;0 · Net Cash · &nbsp;
                Right bar (sources): Equity · Net Debt · WCR&nbsp;&lt;&nbsp;0
              </p>
              <div v-if="!balanceStructureChart" class="flex items-center justify-center h-40 text-gray-400">
                No balance sheet data available yet.
              </div>
              <KChart v-else :key="`fiplan-balstruct-${unitLabel}`" :data="balanceStructureChart" type="stacked-bar" height="340px" />
            </div>

            <!-- Chart 5: Cash Flow Bridge waterfall -->
            <div class="bg-white rounded border border-gray-200 p-4">
              <div class="flex items-center justify-between mb-1">
                <h2 class="text-lg font-semibold text-gray-700">Cash Flow Bridge</h2>
                <Select
                  v-model="cfBridgeYearIndex"
                  :options="cfBridgeYearOptions"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Select year"
                  class="w-36"
                  size="small"
                />
              </div>
              <p class="text-xs text-gray-400 mb-3">
                How Opening Cash moves to Closing Cash: Operating CF → Investing (capex) → Financing (equity/debt).
              </p>
              <div class="flex items-center gap-5 mb-3 text-xs text-gray-500">
                <span class="flex items-center gap-1.5"><span class="inline-block w-3 h-3 rounded-sm bg-emerald-500"></span> Positive</span>
                <span class="flex items-center gap-1.5"><span class="inline-block w-3 h-3 rounded-sm bg-red-500"></span> Negative</span>
                <span class="flex items-center gap-1.5"><span class="inline-block w-3 h-3 rounded-sm bg-indigo-500"></span> Cash position</span>
              </div>
              <div v-if="!cashFlowBridgeData" class="flex items-center justify-center h-40 text-gray-400">
                No cash flow data available yet.
              </div>
              <div v-else style="height: 340px; position: relative">
                <Bar :key="unitLabel" :data="cashFlowBridgeData" :options="cfBridgeOptions" />
              </div>
            </div>

          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>

    <!-- ── Structure this raise (Flow A: FiPlan → Cap Table) ────────────── -->
    <ResponsiveDialog
      v-model:visible="showStructureRaiseDialog"
      header="Structure this raise"
      :modal="true"
      :closable="true"
      size="sm"
    >
      <div class="flex flex-col gap-4">
        <p class="text-sm text-gray-500 leading-relaxed">
          This creates a <strong>Cap Table round</strong> pre-filled with the planned capital
          increase amount. You can then refine the round's investors and share allocation in
          the Cap Table module.
        </p>

        <!-- Round label -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Round name <span class="text-red-500">*</span></label>
          <input
            v-model="structureRaiseForm.label"
            type="text"
            placeholder="e.g. Series A"
            class="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>

        <!-- Share class type -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Share class</label>
          <Select
            v-model="structureRaiseForm.shareClassType"
            :options="SHARE_CLASS_OPTIONS"
            optionLabel="label"
            optionValue="value"
            class="w-full text-sm"
          />
        </div>

        <!-- Phase and sort order -->
        <div class="flex gap-3">
          <div class="flex flex-col gap-1 flex-1">
            <label class="text-sm font-medium text-gray-700">Phase #</label>
            <InputNumber
              v-model="structureRaiseForm.phaseNumber"
              :min="1"
              :max="99"
              :show-buttons="true"
              inputClass="text-sm w-full text-center"
              class="w-full"
            />
          </div>
          <div class="flex flex-col gap-1 flex-1">
            <label class="text-sm font-medium text-gray-700">Sort order</label>
            <InputNumber
              v-model="structureRaiseForm.sortOrder"
              :min="1"
              :show-buttons="true"
              inputClass="text-sm w-full text-center"
              class="w-full"
            />
          </div>
        </div>

        <!-- Error -->
        <p v-if="fiplanStore.roundCreateError" class="text-sm text-red-600">
          {{ fiplanStore.roundCreateError }}
        </p>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <Button
            label="Cancel"
            severity="secondary"
            text
            @click="showStructureRaiseDialog = false"
          />
          <Button
            label="Create round"
            icon="pi pi-arrow-up-right"
            :loading="fiplanStore.roundCreating"
            :disabled="!structureRaiseForm.label.trim()"
            @click="submitStructureRaise"
          />
        </div>
      </template>
    </ResponsiveDialog>

    <!-- ── Balance Financing Plan modal ─────────────────────────────────── -->
    <ResponsiveDialog
      v-model:visible="showBalanceModal"
      header="Balance Financing Plan"
      :modal="true"
      :closable="true"
      size="lg"
    >
      <!-- Intro + controls row -->
      <div class="flex items-start justify-between gap-6 mb-4">
        <p class="text-sm text-gray-500 leading-relaxed">
          For each deficit year you can assign <strong>one or more financing instruments</strong>, each covering
          a percentage of the gap. A global safety-net margin is added on top of every computed amount.
        </p>
        <div class="shrink-0 flex flex-col items-end gap-1">
          <span class="text-xs font-semibold text-gray-600">Safety net</span>
          <InputNumber
            v-model="safetyPct"
            :min="0"
            :max="100"
            :step="5"
            suffix=" %"
            :show-buttons="true"
            input-class="w-20 text-center text-sm"
          />
          <span class="text-xs text-gray-400">buffer on top of each gap</span>
        </div>
      </div>

      <!-- 2-year treasury recommendation -->
      <div
        class="flex items-start gap-3 rounded-lg px-3 py-2.5 mb-5 border"
        :class="twoYearTreasury ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'"
      >
        <label class="flex items-center gap-2 cursor-pointer select-none min-w-0">
          <input
            type="checkbox"
            v-model="twoYearTreasury"
            class="w-4 h-4 accent-blue-600 shrink-0 cursor-pointer"
          />
          <span class="text-sm font-semibold" :class="twoYearTreasury ? 'text-blue-700' : 'text-gray-600'">
            Apply 2-year treasury rule
          </span>
        </label>
        <p class="text-xs leading-relaxed" :class="twoYearTreasury ? 'text-blue-600' : 'text-gray-400'">
          Best practice for startups: absorb Y2's projected gap into Y1's required funding so the
          founding round covers <strong>24 months of runway</strong>. This avoids an emergency
          raise in year 2 before the business reaches break-even.
        </p>
      </div>

      <!-- Summary table (read-only) -->
      <table class="w-full text-sm border-collapse mb-5">
        <thead>
          <tr class="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <th class="py-2 px-3 text-left w-12">Year</th>
            <th class="py-2 px-3 text-right">Requirements</th>
            <th class="py-2 px-3 text-right">Resources</th>
            <th class="py-2 px-3 text-right">Gap</th>
            <th class="py-2 px-3 text-right">Coverage</th>
            <th class="py-2 px-3 text-right">Top-up</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in balanceRows"
            :key="row.year"
            :class="[
              'border-b border-gray-100',
              row.coveredByY1 ? 'bg-blue-50 opacity-70' :
              row.shortfall > 0 ? 'bg-red-50' : 'bg-white',
            ]"
          >
            <td class="py-1.5 px-3 font-semibold text-gray-700">Y{{ row.year }}</td>
            <td class="py-1.5 px-3 text-right text-gray-500">{{ fmtK(row.req) }}</td>
            <td class="py-1.5 px-3 text-right text-gray-500">{{ fmtK(row.res) }}</td>
            <td class="py-1.5 px-3 text-right font-medium"
              :class="row.gap < 0 ? 'text-red-600' : row.gap > 0 ? 'text-green-600' : 'text-gray-400'">
              <span class="inline-flex items-center gap-1">
                <i v-if="row.gap < 0" class="pi pi-exclamation-triangle text-xs" />
                <i v-else-if="row.gap > 0" class="pi pi-check text-xs" />
                {{ fmtGap(row.gap) }}
              </span>
            </td>
            <td class="py-1.5 px-3 text-right text-xs"
              :class="row.coveredByY1 ? 'text-blue-500 italic' :
                      row.shortfall > 0 && row.totalCoveragePct < 100 ? 'text-amber-600 font-semibold' :
                      row.shortfall > 0 && row.totalCoveragePct > 100 ? 'text-blue-600' : 'text-gray-400'">
              <span v-if="row.coveredByY1">covered by Y1</span>
              <span v-else>{{ row.shortfall > 0 ? row.totalCoveragePct + ' %' : '—' }}</span>
            </td>
            <td class="py-1.5 px-3 text-right font-semibold"
              :class="row.coveredByY1 ? 'text-blue-400 italic' : row.suggested > 0 ? 'text-blue-700' : 'text-gray-300'">
              <span v-if="row.coveredByY1">↑ Y1</span>
              <span v-else>{{ row.suggested > 0 ? fmtK(row.suggested) : '—' }}</span>
            </td>
          </tr>
          <!-- Grand total -->
          <tr v-if="hasSomeGap" class="bg-gray-50 border-t-2 border-gray-300 font-semibold">
            <td colspan="5" class="py-2 px-3 text-right text-gray-600 text-sm">Total top-up</td>
            <td class="py-2 px-3 text-right text-blue-700">{{ fmtK(totalSuggested) }}</td>
          </tr>
        </tbody>
      </table>

      <!-- Already balanced -->
      <p v-if="!hasSomeGap" class="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 mb-4">
        <i class="pi pi-check-circle mr-1" /> Your financing plan is already balanced for all five years.
      </p>

      <!-- Per-year instrument assignment (gap years only — coveredByY1 rows skipped) -->
      <div v-if="hasSomeGap" class="flex flex-col gap-3">
        <template v-for="(row, i) in balanceRows" :key="row.year">
          <div v-if="row.shortfall > 0 && !row.coveredByY1" class="border border-red-200 rounded-lg overflow-hidden">

            <!-- Year header -->
            <div class="flex items-center justify-between bg-red-50 px-3 py-2 border-b border-red-200">
              <span class="font-semibold text-gray-700 text-sm">
                Y{{ row.year }}
                <span class="font-normal text-red-600 ml-1">
                  — gap: {{ fmtGap(row.gap) }} {{ unitLabel }}
                  <template v-if="twoYearTreasury && row.year === 1">
                    <span class="text-blue-600 ml-1">(+Y2 treasury buffer)</span>
                  </template>
                </span>
              </span>
              <span class="text-xs" :class="row.totalCoveragePct < 100 ? 'text-amber-600 font-semibold'
                                           : row.totalCoveragePct > 100 ? 'text-blue-600'
                                           : 'text-green-700'">
                {{ row.totalCoveragePct }}% covered
                <template v-if="row.totalCoveragePct < 100"> — {{ 100 - row.totalCoveragePct }}% remaining</template>
                <template v-else-if="row.totalCoveragePct > 100"> — {{ row.totalCoveragePct - 100 }}% over-funded</template>
              </span>
            </div>

            <!-- Instrument lines -->
            <div class="px-3 py-2 bg-white flex flex-col gap-2">
              <!-- Y1-only note about opening balance instruments -->
              <p v-if="row.year === 1" class="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded px-2 py-1">
                <i class="pi pi-info-circle mr-1" />
                For Y1 you can also use <strong>Initial Share Capital</strong> or <strong>Initial Treasury</strong>
                (Opening Balance) — these update your balance sheet directly rather than the financing plan.
              </p>
              <div
                v-for="(line, j) in yearConfigs[i].lines"
                :key="j"
                class="flex items-center gap-2"
              >
                <!-- Financing type — Y1 offers additional opening-balance options -->
                <Select
                  v-model="yearConfigs[i].lines[j].financingType"
                  :options="row.year === 1
                    ? [...FINANCING_OPTIONS, { label: '── Opening Balance ──', value: '_separator', disabled: true }, ...Y1_OPENING_OPTIONS]
                    : FINANCING_OPTIONS"
                  option-label="label"
                  option-value="value"
                  option-disabled="disabled"
                  :pt="{ root: { style: 'flex: 1; font-size: 0.8rem; min-width: 0' } }"
                />
                <!-- Coverage % -->
                <InputNumber
                  v-model="yearConfigs[i].lines[j].coveragePct"
                  :min="0"
                  :max="200"
                  :step="10"
                  suffix=" %"
                  :show-buttons="true"
                  input-class="w-16 text-center text-sm"
                />
                <!-- Computed amount -->
                <span class="text-sm font-semibold w-20 text-right shrink-0"
                  :class="lineAmount(row.shortfall, line) > 0 ? 'text-blue-700' : 'text-gray-300'">
                  {{ lineAmount(row.shortfall, line) > 0 ? fmtK(lineAmount(row.shortfall, line)) : '—' }}
                </span>
                <!-- Remove button -->
                <button
                  class="text-gray-400 hover:text-red-500 transition-colors shrink-0 w-6 text-center"
                  :title="yearConfigs[i].lines.length === 1 ? 'Clear this line' : 'Remove'"
                  @click="removeLine(i, j)"
                >
                  <i class="pi pi-times text-xs" />
                </button>
              </div>

              <!-- Add instrument -->
              <button
                class="self-start text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
                @click="addLine(i)"
              >
                <i class="pi pi-plus text-xs" />
                Add instrument
              </button>
            </div>
          </div>
        </template>
      </div>

      <!-- Note -->
      <p v-if="hasSomeGap" class="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-3 py-2 mt-4">
        <i class="pi pi-info-circle mr-1" />
        Amounts are <strong>added to existing values</strong> in each selected line and rounded up to the nearest k€.
        Lines at 0 % are skipped.
      </p>

      <template #footer>
        <Button label="Reset" icon="pi pi-refresh" severity="secondary" text @click="resetBalance" />
        <Button label="Cancel" severity="secondary" text @click="showBalanceModal = false" />
        <Button
          label="Apply suggestion"
          icon="pi pi-check"
          :disabled="!hasSomeGap || totalSuggested === 0"
          :loading="applyLoading"
          @click="applyBalance"
        />
      </template>
    </ResponsiveDialog>
  </div>
</template>

<style scoped>
:deep(.cell-input)     { background-color: #fed7aa; }
:deep(.cell-computed)  { background-color: #dcfce7; }
:deep(.row-aggregate)  { font-weight: bold; background-color: #f3f4f6; }
:deep(.row-subtotal)   { font-weight: 600;  background-color: #f9fafb; }

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
