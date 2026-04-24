<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useBEPStore } from '@/features/bep/stores/bepStore'
import { useTierGate } from '@/composables/useTierGate'
import { usePlanAccess } from '@/composables/usePlanAccess'
import type { OptimisationPlan } from '@/types'
import UpgradeModal from '@/components/common/UpgradeModal.vue'
import ProBadge from '@/components/common/ProBadge.vue'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import { useDecimal } from '@/composables/useDecimal'
import { useDisplayUnitStore } from '@/stores/displayUnit'
import KChart from '@/components/common/KChart.vue'
import type { ChartData } from '@/types'
import ShowOn from '@/components/common/ShowOn.vue'
import KpiGrid from '@/components/common/KpiGrid.vue'
import type { KpiItem } from '@/components/common/KpiGrid.vue'

defineProps<{ planId?: string; sid?: string }>()

const store = useBEPStore()
const { isPro, gate } = useTierGate()
const { canEdit } = usePlanAccess()
const toast = useToast()
const { formatUnit, getUnitLabel } = useDecimal()
const displayUnitStore = useDisplayUnitStore()
const unitLabel = computed(() => getUnitLabel())

const activeTab = ref('overview')

// ── Import from plan ─────────────────────────────────────────────
const importYear = ref<number>(1)
const importLoading = ref(false)
const yearOptions = [1, 2, 3, 4, 5].map(y => ({ label: `Year ${y}`, value: y }))

async function importFromPlan() {
  if (!store.activeSnapshot) return
  importLoading.value = true
  const ok = await store.importFromPlan(store.activeSnapshot.id, importYear.value)
  if (ok) {
    await store.fetchReport(store.activeSnapshot.id)
    toast.add({ severity: 'success', summary: 'Imported', detail: `BEP inputs updated from Year ${importYear.value} plan data`, life: 3000 })
  } else if (store.error) {
    toast.add({ severity: 'error', summary: 'Import failed', detail: store.error, life: 4000 })
  }
  importLoading.value = false
}

// ── Snapshot dialog ─────────────────────────────────────────────
const snapshotDialogVisible = ref(false)
const snapshotForm = ref({ label: '', fixedCostsTotal: 0, contributionMarginPct: 0, avgOrderValue: null as number | null, notes: '' })
const createPreviewYear = ref<number>(1)
const createPreviewLoading = ref(false)

async function fillFromPlan() {
  createPreviewLoading.value = true
  const preview = await store.previewFromPlan(createPreviewYear.value)
  if (preview) {
    snapshotForm.value.fixedCostsTotal = parseFloat(preview.fixedCostsTotal) || 0
    snapshotForm.value.contributionMarginPct = parseFloat(preview.contributionMarginPct) || 0
    snapshotForm.value.avgOrderValue = preview.avgOrderValue ? parseFloat(preview.avgOrderValue) : null
  } else if (store.error) {
    toast.add({ severity: 'error', summary: 'Preview failed', detail: store.error, life: 4000 })
  }
  createPreviewLoading.value = false
}

// ── Plan dialog ─────────────────────────────────────────────────
const planDialogVisible = ref(false)
const planForm = ref({ name: '', notes: '' })

// ── Lifecycle ───────────────────────────────────────────────────
onMounted(async () => {
  if (!gate('pro', 'Break-Even Analysis')) return
  // Multi-year report is plan-level — load it immediately regardless of snapshots
  store.fetchMultiYearReport()
  await store.fetchSnapshots()
  if (store.snapshots.length > 0) {
    await store.selectSnapshot(store.snapshots[0].id)
    if (store.activeSnapshot) {
      await store.fetchReport(store.activeSnapshot.id)
    }
  }
})

watch(() => store.activeSnapshot, async (snap) => {
  if (snap && !store.report) {
    await store.fetchReport(snap.id)
  }
})

// ── Snapshot CRUD ───────────────────────────────────────────────
function openSnapshotCreate() {
  snapshotForm.value = { label: '', fixedCostsTotal: 0, contributionMarginPct: 0, avgOrderValue: null, notes: '' }
  createPreviewYear.value = 1
  snapshotDialogVisible.value = true
}

async function saveSnapshot() {
  if (!snapshotForm.value.label.trim()) {
    toast.add({ severity: 'warn', summary: 'Validation', detail: 'Label is required', life: 3000 })
    return
  }
  const created = await store.createSnapshot({
    label: snapshotForm.value.label,
    fixedCostsTotal: String(snapshotForm.value.fixedCostsTotal || 0),
    contributionMarginPct: String(snapshotForm.value.contributionMarginPct || 0),
    avgOrderValue: snapshotForm.value.avgOrderValue != null ? String(snapshotForm.value.avgOrderValue) : undefined,
    notes: snapshotForm.value.notes || undefined,
  })
  if (created) {
    snapshotDialogVisible.value = false
    await store.selectSnapshot(created.id)
    await store.fetchReport(created.id)
    toast.add({ severity: 'success', summary: 'Created', detail: 'BEP snapshot created', life: 2500 })
  } else if (store.error) {
    toast.add({ severity: 'error', summary: 'Error', detail: store.error, life: 4000 })
  }
}

async function deleteSnapshot(id: string) {
  const ok = await store.deleteSnapshot(id)
  if (ok) toast.add({ severity: 'success', summary: 'Deleted', detail: 'Snapshot deleted', life: 2500 })
}

// ── Plan CRUD ───────────────────────────────────────────────────
function openPlanCreate() {
  planForm.value = { name: '', notes: '' }
  planDialogVisible.value = true
}

async function savePlan() {
  if (!store.activeSnapshot || !planForm.value.name.trim()) return
  const created = await store.createOptimisationPlan(store.activeSnapshot.id, {
    name: planForm.value.name,
    notes: planForm.value.notes || undefined,
  })
  if (created) {
    planDialogVisible.value = false
    await store.selectPlan(store.activeSnapshot.id, created.id)
    await store.fetchOptimisedReport(store.activeSnapshot.id, created.id)
    toast.add({ severity: 'success', summary: 'Created', detail: 'Optimisation plan created', life: 2500 })
  } else if (store.error) {
    toast.add({ severity: 'error', summary: 'Error', detail: store.error, life: 4000 })
  }
}

async function selectPlanAndReport(plan: OptimisationPlan) {
  if (!store.activeSnapshot) return
  await store.selectPlan(store.activeSnapshot.id, plan.id)
  await store.fetchOptimisedReport(store.activeSnapshot.id, plan.id)
}

// ── Computed helpers ────────────────────────────────────────────
const core = computed(() => store.report?.core ?? null)

// ── Chart data ──────────────────────────────────────────────────

/** Break-even chart: Revenue vs. Total Costs vs. EBE across ±range% */
const bepChartData = computed<ChartData | null>(() => {
  const rows = store.report?.ebeTable
  if (!rows || rows.length === 0) return null
  const f = displayUnitStore.factor || 1_000_000
  const labels = rows.map(r => {
    const v = parseFloat(r.variationPct)
    return (v >= 0 ? '+' : '') + v.toFixed(0) + '%' + (r.isBep ? ' ★' : '')
  })

  // Horizontal BEP reference line — flat at the BEP revenue level across all columns
  const bepRevRaw = core.value?.bepRevenue != null ? parseFloat(core.value.bepRevenue) / f : null
  const bepLine = bepRevRaw != null ? rows.map(() => bepRevRaw) : []

  return {
    labels,
    datasets: [
      {
        label: 'Revenue',
        data: rows.map(r => parseFloat(r.revenue) / f),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        type: 'line',
      },
      {
        label: 'Total Costs',
        data: rows.map(r => parseFloat(r.totalCosts) / f),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        type: 'line',
      },
      {
        label: 'EBE (surplus / deficit)',
        data: rows.map(r => parseFloat(r.ebe) / f),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        type: 'line',
      },
      // Dashed horizontal reference line at BEP Revenue level
      ...(bepLine.length > 0 ? [{
        label: 'BEP Revenue (reference)',
        data: bepLine,
        borderColor: 'rgba(99, 102, 241, 0.85)',   // indigo
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [6, 4],
        pointRadius: 0,
        pointHoverRadius: 0,
        type: 'line',
      } as any] : []),
    ],
  }
})

/** Sensitivity chart: BEP Revenue as contribution margin varies */
const marginSensChartData = computed<ChartData | null>(() => {
  const rows = store.report?.marginSens
  if (!rows || rows.length === 0) return null
  const f = displayUnitStore.factor || 1_000_000
  const labels = rows.map(r => {
    const v = parseFloat(r.marginVariationPp)
    return (v >= 0 ? '+' : '') + v.toFixed(1) + ' pp'
  })
  return {
    labels,
    datasets: [
      {
        label: 'BEP Revenue',
        data: rows.map(r => r.isUndefined || r.bepRevenue == null ? null as unknown as number : parseFloat(r.bepRevenue) / f),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        type: 'line',
      },
    ],
  }
})

/** Sensitivity chart: BEP Revenue as fixed costs vary */
const costSensChartData = computed<ChartData | null>(() => {
  const rows = store.report?.costSens
  if (!rows || rows.length === 0) return null
  const f = displayUnitStore.factor || 1_000_000
  const labels = rows.map(r => {
    const v = parseFloat(r.costVariationPct)
    return (v >= 0 ? '+' : '') + v.toFixed(0) + '%'
  })
  return {
    labels,
    datasets: [
      {
        label: 'BEP Revenue',
        data: rows.map(r => parseFloat(r.bepRevenue) / f),
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.15)',
        type: 'line',
      },
      {
        label: 'Fixed Costs',
        data: rows.map(r => parseFloat(r.newFixedCosts) / f),
        borderColor: 'rgb(249, 115, 22)',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        type: 'line',
      },
    ],
  }
})

/** Multi-year cumulative EBE chart with zero reference line */
const multiYearChartData = computed<ChartData | null>(() => {
  const rows = store.multiYearReport?.years
  if (!rows || rows.length === 0) return null
  const f = displayUnitStore.factor || 1_000_000
  const labels = rows.map(r => `Year ${r.year}`)
  return {
    labels,
    datasets: [
      {
        label: 'Annual EBE',
        data: rows.map(r => parseFloat(r.annualEbe) / f),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: rows.map(r => parseFloat(r.annualEbe) >= 0
          ? 'rgba(34, 197, 94, 0.25)'
          : 'rgba(239, 68, 68, 0.25)'),
        type: 'bar',
      },
      {
        label: 'Cumulative EBE',
        data: rows.map(r => parseFloat(r.cumulativeEbe) / f),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'transparent',
        type: 'line',
        borderWidth: 2.5,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.3,
      },
      {
        label: 'Zero line',
        data: rows.map(() => 0),
        borderColor: 'rgba(100, 116, 139, 0.5)',
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderDash: [5, 4],
        pointRadius: 0,
        pointHoverRadius: 0,
        type: 'line',
      },
    ],
  }
})

function fmtK(val: string | null | undefined): string {
  if (val == null) return '—'
  const n = parseFloat(val)
  return isNaN(n) ? '—' : formatUnit(n) + '\u00A0' + getUnitLabel()
}

function fmtPct(val: string | null | undefined): string {
  if (val == null) return '—'
  const n = parseFloat(val)
  return isNaN(n) ? '—' : n.toFixed(2) + ' %'
}

/** Format a raw-euro value (e.g. avg order value) — NOT scaled to k€/M€. */
function fmtEur(val: string | number | null | undefined): string {
  if (val == null) return '—'
  const n = typeof val === 'number' ? val : parseFloat(String(val))
  return isNaN(n) ? '—' : n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '\u00A0€'
}

function fmtN(val: string | null | undefined): string {
  if (val == null) return '—'
  const n = parseFloat(val)
  return isNaN(n) ? '—' : Math.round(n).toLocaleString('fr-FR')
}

const snapshotOptions = computed(() =>
  store.snapshots.map(s => ({ label: s.label, value: s.id }))
)

const selectedSnapshotId = computed({
  get: () => store.activeSnapshot?.id ?? null,
  set: async (id: string | null) => {
    if (!id) return
    await store.selectSnapshot(id)
    await store.fetchReport(id)
  },
})

// ── Mobile KPI summary ────────────────────────────────────────────────────────
const bepMobileKpis = computed<KpiItem[]>(() => {
  const c = core.value
  if (!c) return []
  return [
    {
      id:       'bep-revenue',
      label:    'BEP Revenue',
      value:    fmtK(c.bepRevenue),
      severity: 'neutral',
    },
    {
      id:       'variable-cost',
      label:    'Variable Cost %',
      value:    fmtPct(c.variableCostPct),
      severity: parseFloat(c.variableCostPct ?? '0') <= 70 ? 'positive' : 'negative',
    },
  ]
})
</script>

<template>
  <div class="p-6 max-w-6xl mx-auto">
    <Toast />
    <UpgradeModal />

    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <h1 class="text-3xl font-bold text-gray-800">Break-Even Analysis</h1>
        <ProBadge />
      </div>
    </div>

    <!-- Pro gate -->
    <div v-if="!isPro" class="flex flex-col items-center justify-center py-24 gap-4">
      <div class="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
        <i class="pi pi-lock text-2xl text-amber-500"></i>
      </div>
      <h2 class="text-xl font-semibold text-gray-700">Pro Feature</h2>
      <p class="text-gray-500 text-center max-w-sm">
        Break-Even Analysis is available on the <strong>Pro</strong> plan.<br>
        Compute your BEP, run sensitivity analyses and model optimisation scenarios.
      </p>
    </div>

    <template v-else>

      <!-- Snapshot selector bar -->
      <div class="flex items-center gap-3 mb-6 bg-white rounded-xl border border-gray-200 p-4">
        <span class="text-sm font-medium text-gray-600 shrink-0">Snapshot:</span>
        <Select
          v-model="selectedSnapshotId"
          :options="snapshotOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Select a snapshot…"
          class="flex-1"
          :disabled="store.snapshots.length === 0"
        />
        <Button
          v-if="canEdit"
          label="New Snapshot"
          icon="pi pi-plus"
          size="small"
          @click="openSnapshotCreate"
        />
        <Button
          v-if="canEdit && store.activeSnapshot"
          icon="pi pi-trash"
          size="small"
          severity="danger"
          text
          v-tooltip="'Delete snapshot'"
          @click="deleteSnapshot(store.activeSnapshot.id)"
        />
      </div>

      <!-- ── Mobile surface ──────────────────────────────────────────── -->
      <ShowOn only="mobile">
        <div class="space-y-4 mb-6">
          <!-- BEP KPI summary -->
          <div v-if="store.loading" class="text-center py-8 text-gray-400 text-sm">
            <i class="pi pi-spin pi-spinner mr-2" />Loading BEP data…
          </div>
          <template v-else-if="core">
            <KpiGrid :items="bepMobileKpis" data-testid="bep-kpi-grid" />
          </template>

          <!-- BEP chart (primary mobile surface) -->
          <div v-if="bepChartData" class="bg-white border border-gray-200 rounded-xl p-4">
            <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Revenue vs. Costs</p>
            <KChart :data="bepChartData" type="line" class="h-48" />
          </div>

          <!-- No snapshot state -->
          <div v-else-if="!store.activeSnapshot" class="text-center py-12 text-gray-400">
            <i class="pi pi-calculator text-4xl mb-3 block" />
            <p class="text-sm">Create a BEP snapshot to see your break-even point</p>
          </div>

          <p class="text-xs text-center text-gray-400">Full analysis (sensitivity, optimisation) on tablet+</p>
        </div>
      </ShowOn>

      <!-- ── Tablet + Desktop: full 4-tab interface ─────────────────── -->
      <ShowOn from="tablet">
      <!-- Main tabs (Overview always visible; snapshot tabs shown when snapshot exists) -->
      <Tabs v-model:value="activeTab">
        <TabList>
          <Tab value="overview">
            <i class="pi pi-chart-line mr-2"></i>5-Year Overview
          </Tab>
          <Tab value="calculator">
            <i class="pi pi-calculator mr-2"></i>BEP Calculator
          </Tab>
          <Tab value="sensitivity">
            <i class="pi pi-sliders-h mr-2"></i>Sensitivity
          </Tab>
          <Tab value="optimisation">
            <i class="pi pi-bolt mr-2"></i>Optimisation
          </Tab>
        </TabList>

        <TabPanels>

          <!-- ══════════════════════════════════════════════════ -->
          <!-- TAB 0: 5-YEAR OVERVIEW                            -->
          <!-- ══════════════════════════════════════════════════ -->
          <TabPanel value="overview">
            <div class="py-6 space-y-6">

              <!-- Loading state -->
              <div v-if="store.multiYearLoading" class="flex items-center justify-center py-16 text-gray-400">
                <i class="pi pi-spin pi-spinner text-3xl mr-3"></i>
                <span>Computing multi-year break-even…</span>
              </div>

              <!-- Error state -->
              <Message v-else-if="store.error && !store.multiYearReport" severity="error">
                {{ store.error }}
              </Message>

              <template v-else-if="store.multiYearReport">

                <!-- ── Headline summary cards ─────────────────── -->
                <div class="grid grid-cols-3 gap-4">

                  <!-- First profitable year -->
                  <div class="bg-white rounded-xl border border-gray-200 p-5 text-center">
                    <p class="text-xs uppercase tracking-wide text-gray-400 mb-1">First Profitable Year</p>
                    <p v-if="store.multiYearReport.firstProfitableYear != null"
                       class="text-3xl font-bold text-green-600">
                      Year {{ store.multiYearReport.firstProfitableYear }}
                    </p>
                    <p v-else class="text-2xl font-bold text-red-500">Not within 5 years</p>
                    <p class="text-xs text-gray-400 mt-1">Annual EBE first turns positive</p>
                  </div>

                  <!-- Cumulative BEP -->
                  <div class="bg-white rounded-xl border border-gray-200 p-5 text-center">
                    <p class="text-xs uppercase tracking-wide text-gray-400 mb-1">Cumulative Break-Even</p>
                    <template v-if="store.multiYearReport.cumulativeBepYear != null">
                      <p class="text-3xl font-bold text-indigo-600">
                        Year {{ store.multiYearReport.cumulativeBepYear }}
                      </p>
                      <p v-if="store.multiYearReport.cumulativeBepMonth" class="text-sm text-indigo-400 mt-1">
                        ≈ Month {{ store.multiYearReport.cumulativeBepMonth }}
                      </p>
                    </template>
                    <p v-else class="text-2xl font-bold text-red-500">Not within 5 years</p>
                    <p class="text-xs text-gray-400 mt-1">Running EBE sum turns non-negative</p>
                  </div>

                  <!-- Total 5-year EBE -->
                  <div class="bg-white rounded-xl border border-gray-200 p-5 text-center">
                    <p class="text-xs uppercase tracking-wide text-gray-400 mb-1">5-Year Total EBE</p>
                    <p :class="['text-3xl font-bold', parseFloat(store.multiYearReport.totalCumulativeEbe) >= 0 ? 'text-green-600' : 'text-red-500']">
                      {{ fmtK(store.multiYearReport.totalCumulativeEbe) }}
                    </p>
                    <p class="text-xs text-gray-400 mt-1">Cumulative surplus / deficit</p>
                  </div>
                </div>

                <!-- ── Cumulative EBE chart ──────────────────── -->
                <div class="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 class="font-semibold text-gray-700 mb-4">
                    Cumulative Break-Even Trajectory
                    <span class="text-xs text-gray-400 font-normal ml-2">({{ getUnitLabel() }})</span>
                  </h3>
                  <KChart :key="`bep-multiyear-${unitLabel}`" :data="multiYearChartData" type="bar" height="280px" />
                </div>

                <!-- ── Year-by-year table ────────────────────── -->
                <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div class="px-5 py-4 border-b border-gray-100">
                    <h3 class="font-semibold text-gray-700">Annual Break-Even by Year</h3>
                    <p class="text-xs text-gray-400 mt-0.5">BEP Revenue = Fixed Costs ÷ Contribution Margin %.
                      Green = planned revenue exceeds BEP.</p>
                  </div>
                  <div class="overflow-x-auto">
                    <table class="min-w-full text-sm">
                      <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                        <tr>
                          <th class="px-4 py-3 text-left">Year</th>
                          <th class="px-4 py-3 text-right">Fixed Costs</th>
                          <th class="px-4 py-3 text-right">Planned Revenue</th>
                          <th class="px-4 py-3 text-right">Margin %</th>
                          <th class="px-4 py-3 text-right">BEP Revenue</th>
                          <th class="px-4 py-3 text-right">Annual EBE</th>
                          <th class="px-4 py-3 text-right">Cumulative EBE</th>
                          <th class="px-4 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="row in store.multiYearReport.years"
                          :key="row.year"
                          :class="[
                            'border-t border-gray-100 transition-colors',
                            row.isCumulativeBepCrossover ? 'bg-indigo-50' : 'hover:bg-gray-50'
                          ]"
                        >
                          <td class="px-4 py-3 font-medium text-gray-700">
                            Year {{ row.year }}
                            <span v-if="row.isFirstAnnualBep" class="ml-1 text-xs text-green-600 font-semibold">★</span>
                            <span v-if="row.isCumulativeBepCrossover" class="ml-1 text-xs text-indigo-600 font-semibold">⬤</span>
                          </td>
                          <td class="px-4 py-3 text-right text-gray-600">{{ fmtK(row.fixedCosts) }}</td>
                          <td class="px-4 py-3 text-right text-gray-800 font-medium">{{ fmtK(row.revenue) }}</td>
                          <td class="px-4 py-3 text-right text-gray-600">{{ fmtPct(row.contributionMarginPct) }}</td>
                          <td class="px-4 py-3 text-right">
                            <span v-if="row.bepRevenueUndefined" class="text-gray-400 italic">Undefined</span>
                            <span v-else class="text-gray-700">{{ fmtK(row.bepRevenue) }}</span>
                          </td>
                          <td class="px-4 py-3 text-right font-semibold"
                              :class="parseFloat(row.annualEbe) >= 0 ? 'text-green-600' : 'text-red-500'">
                            {{ fmtK(row.annualEbe) }}
                          </td>
                          <td class="px-4 py-3 text-right font-semibold"
                              :class="parseFloat(row.cumulativeEbe) >= 0 ? 'text-indigo-600' : 'text-gray-500'">
                            {{ fmtK(row.cumulativeEbe) }}
                          </td>
                          <td class="px-4 py-3 text-center">
                            <span v-if="row.bepRevenueUndefined"
                              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">
                              N/A
                            </span>
                            <span v-else-if="row.revenueAboveBep"
                              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-medium">
                              ✓ Above BEP
                            </span>
                            <span v-else
                              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-600 font-medium">
                              ✗ Below BEP
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div class="px-5 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
                    ★ First profitable year (annual EBE &gt; 0)
                    &nbsp;&nbsp;⬤ Cumulative break-even crossover year
                  </div>
                </div>

              </template>

              <!-- No plan data yet -->
              <div v-else class="text-center py-16 text-gray-400">
                <i class="pi pi-chart-line text-5xl mb-4 block"></i>
                <p class="text-lg font-medium">No plan data available</p>
                <p class="text-sm mt-1">Build your business plan first — the 5-year BEP overview will appear here.</p>
              </div>

            </div>
          </TabPanel>

          <!-- ══════════════════════════════════════════════════ -->
          <!-- TAB 1: BEP CALCULATOR                             -->
          <!-- ══════════════════════════════════════════════════ -->
          <TabPanel value="calculator">
            <!-- No snapshots yet (inside calculator tab) -->
            <div v-if="store.snapshots.length === 0 && !store.loading" class="text-center py-16 text-gray-400">
              <i class="pi pi-chart-bar text-5xl mb-4 block"></i>
              <p class="text-lg font-medium">No BEP snapshots yet</p>
              <p class="text-sm mt-1 mb-4">Create a snapshot to start your break-even analysis</p>
              <Button v-if="canEdit" label="Create first snapshot" icon="pi pi-plus" @click="openSnapshotCreate" />
            </div>
            <div v-if="store.reportLoading" class="text-center py-12 text-gray-400">
              <i class="pi pi-spin pi-spinner text-3xl"></i>
            </div>
            <div v-else-if="!store.report" class="text-center py-12 text-gray-400">
              <p>Select a snapshot to view its BEP report</p>
            </div>
            <div v-else class="space-y-6 pt-4">

              <!-- Warnings -->
              <Message
                v-for="w in core?.warnings"
                :key="w.code"
                severity="warn"
                class="mb-2"
              >{{ w.message }}</Message>

              <!-- KPI cards -->
              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <p class="text-xs text-blue-500 uppercase tracking-wide mb-1">BEP Revenue</p>
                  <p class="text-2xl font-bold text-blue-800">{{ fmtK(core?.bepRevenue) }}</p>
                </div>
                <div class="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <p class="text-xs text-green-500 uppercase tracking-wide mb-1">BEP Volume</p>
                  <p class="text-2xl font-bold text-green-800">{{ fmtN(core?.bepVolume) }}</p>
                  <p class="text-xs text-green-600 mt-0.5">orders</p>
                </div>
                <div class="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
                  <p class="text-xs text-purple-500 uppercase tracking-wide mb-1">Monthly BEP</p>
                  <p class="text-2xl font-bold text-purple-800">{{ fmtK(core?.monthlyBep) }}</p>
                </div>
                <div class="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                  <p class="text-xs text-orange-500 uppercase tracking-wide mb-1">Variable Cost %</p>
                  <p class="text-2xl font-bold text-orange-800">{{ fmtPct(core?.variableCostPct) }}</p>
                </div>
              </div>

              <!-- Break-Even Chart -->
              <div class="bg-white rounded-xl border border-gray-200 p-5">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="font-semibold text-gray-700">Break-Even Chart
                    <span class="text-xs text-gray-400 font-normal ml-2">({{ getUnitLabel() }}, ±50% around BEP)</span>
                  </h3>
                  <span class="text-xs text-gray-400">★ = BEP point</span>
                </div>
                <KChart :key="`bep-chart-${unitLabel}`" :data="bepChartData" type="line" height="280px" />
              </div>

              <!-- EBE Table -->
              <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div class="px-5 py-3 border-b border-gray-100">
                  <h3 class="font-semibold text-gray-700">EBE Estimation Table <span class="text-xs text-gray-400 font-normal ml-2">({{ getUnitLabel() }}, ±50% around BEP)</span></h3>
                </div>
                <div class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead class="bg-gray-50">
                      <tr>
                        <th class="px-4 py-2 text-left text-gray-600 font-medium">Variation</th>
                        <th class="px-4 py-2 text-right text-gray-600 font-medium">Revenue</th>
                        <th class="px-4 py-2 text-right text-gray-600 font-medium">Total Costs</th>
                        <th class="px-4 py-2 text-right text-gray-600 font-medium">EBE</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="row in store.report.ebeTable"
                        :key="row.variationPct"
                        :class="[
                          row.isBep ? 'bg-blue-50 font-semibold' : row.isNegative ? 'bg-red-50' : '',
                          'border-t border-gray-50'
                        ]"
                      >
                        <td class="px-4 py-2">
                          <span :class="row.isBep ? 'text-blue-700' : ''">
                            {{ parseFloat(row.variationPct) >= 0 ? '+' : '' }}{{ parseFloat(row.variationPct).toFixed(0) }}%
                          </span>
                          <Tag v-if="row.isBep" value="BEP" severity="info" class="ml-2 text-xs" />
                        </td>
                        <td class="px-4 py-2 text-right">{{ parseFloat(row.revenue).toFixed(1) }}</td>
                        <td class="px-4 py-2 text-right">{{ parseFloat(row.totalCosts).toFixed(1) }}</td>
                        <td class="px-4 py-2 text-right" :class="row.isNegative ? 'text-red-600' : 'text-green-700'">
                          {{ parseFloat(row.ebe).toFixed(1) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Snapshot inputs summary -->
              <div v-if="store.activeSnapshot" class="bg-gray-50 rounded-xl border border-gray-200 p-4 text-sm text-gray-600">
                <div class="flex items-center justify-between mb-2">
                  <p class="font-semibold text-gray-700">Snapshot inputs</p>
                  <div v-if="canEdit" class="flex items-center gap-2">
                    <Select
                      v-model="importYear"
                      :options="yearOptions"
                      optionLabel="label"
                      optionValue="value"
                      class="text-xs"
                      size="small"
                    />
                    <Button
                      label="Import from plan"
                      icon="pi pi-download"
                      size="small"
                      severity="secondary"
                      :loading="importLoading"
                      @click="importFromPlan"
                      v-tooltip="'Pre-fill BEP inputs from the business plan for the selected year'"
                    />
                  </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div><span class="text-gray-400">Fixed costs:</span> {{ fmtK(store.activeSnapshot.fixedCostsTotal) }}</div>
                  <div><span class="text-gray-400">Margin:</span> {{ fmtPct(store.activeSnapshot.contributionMarginPct) }}</div>
                  <div><span class="text-gray-400">Avg order:</span> {{ store.activeSnapshot.avgOrderValue ? fmtEur(store.activeSnapshot.avgOrderValue) : '—' }}</div>
                  <div>
                    <span class="text-gray-400">Source:</span>
                    <Tag
                      :value="store.activeSnapshot.source"
                      :severity="store.activeSnapshot.source === 'imported' ? 'success' : 'secondary'"
                      class="ml-1 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabPanel>

          <!-- ══════════════════════════════════════════════════ -->
          <!-- TAB 2: SENSITIVITY                                -->
          <!-- ══════════════════════════════════════════════════ -->
          <TabPanel value="sensitivity">
            <div v-if="store.reportLoading" class="text-center py-12 text-gray-400">
              <i class="pi pi-spin pi-spinner text-3xl"></i>
            </div>
            <div v-else-if="!store.report" class="text-center py-12 text-gray-400">
              <p>Select a snapshot to view sensitivity tables</p>
            </div>
            <div v-else class="space-y-6 pt-4">

              <!-- Margin sensitivity chart -->
              <div class="bg-white rounded-xl border border-gray-200 p-5">
                <h3 class="font-semibold text-gray-700 mb-4">BEP Revenue vs Contribution Margin
                  <span class="text-xs text-gray-400 font-normal ml-2">({{ getUnitLabel() }})</span>
                </h3>
                <KChart :key="`bep-marginsens-${unitLabel}`" :data="marginSensChartData" type="line" height="240px" />
              </div>

              <!-- Margin sensitivity table -->
              <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div class="px-5 py-3 border-b border-gray-100">
                  <h3 class="font-semibold text-gray-700">BEP vs Contribution Margin <span class="text-xs text-gray-400 font-normal ml-2">({{ getUnitLabel() }})</span></h3>
                </div>
                <div class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead class="bg-gray-50">
                      <tr>
                        <th class="px-4 py-2 text-left text-gray-600 font-medium">Margin variation (pp)</th>
                        <th class="px-4 py-2 text-right text-gray-600 font-medium">Effective margin</th>
                        <th class="px-4 py-2 text-right text-gray-600 font-medium">BEP Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="row in store.report.marginSens"
                        :key="row.marginVariationPp"
                        :class="[row.isBase ? 'bg-blue-50 font-semibold' : 'border-t border-gray-50']"
                      >
                        <td class="px-4 py-2">
                          {{ parseFloat(row.marginVariationPp) >= 0 ? '+' : '' }}{{ parseFloat(row.marginVariationPp).toFixed(1) }} pp
                          <Tag v-if="row.isBase" value="Base" severity="info" class="ml-2 text-xs" />
                        </td>
                        <td class="px-4 py-2 text-right">{{ fmtPct(row.marginPct) }}</td>
                        <td class="px-4 py-2 text-right" :class="row.isUndefined ? 'text-red-400 italic' : ''">
                          {{ row.isUndefined ? 'Undefined' : fmtK(row.bepRevenue) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Fixed cost sensitivity chart -->
              <div class="bg-white rounded-xl border border-gray-200 p-5">
                <h3 class="font-semibold text-gray-700 mb-4">BEP Revenue vs Fixed Costs
                  <span class="text-xs text-gray-400 font-normal ml-2">({{ getUnitLabel() }})</span>
                </h3>
                <KChart :key="`bep-costsens-${unitLabel}`" :data="costSensChartData" type="line" height="240px" />
              </div>

              <!-- Fixed cost sensitivity table -->
              <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div class="px-5 py-3 border-b border-gray-100">
                  <h3 class="font-semibold text-gray-700">BEP vs Fixed Costs <span class="text-xs text-gray-400 font-normal ml-2">({{ getUnitLabel() }})</span></h3>
                </div>
                <div class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead class="bg-gray-50">
                      <tr>
                        <th class="px-4 py-2 text-left text-gray-600 font-medium">Cost variation</th>
                        <th class="px-4 py-2 text-right text-gray-600 font-medium">Fixed costs</th>
                        <th class="px-4 py-2 text-right text-gray-600 font-medium">BEP Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="row in store.report.costSens"
                        :key="row.costVariationPct"
                        :class="[row.isBase ? 'bg-blue-50 font-semibold' : 'border-t border-gray-50']"
                      >
                        <td class="px-4 py-2">
                          {{ parseFloat(row.costVariationPct) >= 0 ? '+' : '' }}{{ parseFloat(row.costVariationPct).toFixed(0) }}%
                          <Tag v-if="row.isBase" value="Base" severity="info" class="ml-2 text-xs" />
                        </td>
                        <td class="px-4 py-2 text-right">{{ fmtK(row.newFixedCosts) }}</td>
                        <td class="px-4 py-2 text-right">{{ fmtK(row.bepRevenue) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabPanel>

          <!-- ══════════════════════════════════════════════════ -->
          <!-- TAB 3: OPTIMISATION                               -->
          <!-- ══════════════════════════════════════════════════ -->
          <TabPanel value="optimisation">
            <div class="pt-4 space-y-6">

              <!-- Plan selector -->
              <div class="flex items-center gap-3">
                <span class="text-sm font-medium text-gray-600 shrink-0">Plan:</span>
                <div class="flex gap-2 flex-wrap">
                  <button
                    v-for="plan in store.plans"
                    :key="plan.id"
                    class="px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors"
                    :class="store.activePlan?.id === plan.id
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'"
                    @click="selectPlanAndReport(plan)"
                  >
                    {{ plan.name }}
                    <Tag
                      :value="plan.status"
                      :severity="plan.status === 'validated' ? 'success' : 'secondary'"
                      class="ml-1.5 text-xs"
                    />
                  </button>
                  <Button
                    v-if="canEdit && store.activeSnapshot"
                    label="New plan"
                    icon="pi pi-plus"
                    size="small"
                    text
                    @click="openPlanCreate"
                  />
                </div>
              </div>

              <!-- No plans -->
              <div v-if="store.plans.length === 0" class="text-center py-12 text-gray-400">
                <i class="pi pi-bolt text-5xl mb-4 block"></i>
                <p class="text-lg font-medium">No optimisation plans</p>
                <p class="text-sm mt-1 mb-4">Create a plan to model cost reductions and their impact on BEP</p>
                <Button v-if="canEdit && store.activeSnapshot" label="Create first plan" icon="pi pi-plus" @click="openPlanCreate" />
              </div>

              <!-- Optimised BEP Report -->
              <template v-else-if="store.activePlan">
                <div v-if="store.reportLoading" class="text-center py-12 text-gray-400">
                  <i class="pi pi-spin pi-spinner text-3xl"></i>
                </div>
                <div v-else-if="store.optimisedReport" class="space-y-5">
                  <!-- Warnings -->
                  <Message
                    v-for="w in store.optimisedReport.warnings"
                    :key="w.code"
                    severity="warn"
                  >{{ w.message }}</Message>

                  <!-- Comparison cards -->
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <!-- Fixed costs -->
                    <div class="bg-white rounded-xl border border-gray-200 p-4">
                      <p class="text-xs text-gray-500 uppercase tracking-wide mb-3">Fixed Costs</p>
                      <div class="flex justify-between text-sm mb-1">
                        <span class="text-gray-500">Baseline</span>
                        <span class="font-medium">{{ fmtK(store.optimisedReport.fixedCosts.current) }}</span>
                      </div>
                      <div class="flex justify-between text-sm mb-1">
                        <span class="text-gray-500">Optimised</span>
                        <span class="font-semibold text-green-700">{{ fmtK(store.optimisedReport.fixedCosts.optimised) }}</span>
                      </div>
                      <div class="flex justify-between text-sm pt-2 border-t border-gray-100">
                        <span class="text-gray-500">Saving</span>
                        <span class="font-bold text-green-700">
                          −{{ fmtK(store.optimisedReport.fixedCosts.deltaAbs) }}
                          ({{ fmtPct(store.optimisedReport.fixedCosts.deltaPct) }})
                        </span>
                      </div>
                    </div>

                    <!-- Margin -->
                    <div class="bg-white rounded-xl border border-gray-200 p-4">
                      <p class="text-xs text-gray-500 uppercase tracking-wide mb-3">Contribution Margin</p>
                      <div class="flex justify-between text-sm mb-1">
                        <span class="text-gray-500">Baseline</span>
                        <span class="font-medium">{{ fmtPct(store.optimisedReport.marginPct.current) }}</span>
                      </div>
                      <div class="flex justify-between text-sm mb-1">
                        <span class="text-gray-500">Optimised</span>
                        <span class="font-semibold text-green-700">{{ fmtPct(store.optimisedReport.marginPct.optimised) }}</span>
                      </div>
                      <div class="flex justify-between text-sm pt-2 border-t border-gray-100">
                        <span class="text-gray-500">Improvement</span>
                        <span class="font-bold text-green-700">
                          +{{ fmtPct(store.optimisedReport.marginPct.deltaAbs) }} pp
                        </span>
                      </div>
                    </div>

                    <!-- BEP -->
                    <div class="bg-blue-50 rounded-xl border border-blue-200 p-4">
                      <p class="text-xs text-blue-500 uppercase tracking-wide mb-3">BEP Revenue</p>
                      <div class="flex justify-between text-sm mb-1">
                        <span class="text-blue-600">Baseline</span>
                        <span class="font-medium text-blue-800">{{ fmtK(store.optimisedReport.baselineBepRevenue) }}</span>
                      </div>
                      <div class="flex justify-between text-sm mb-1">
                        <span class="text-blue-600">Optimised</span>
                        <span class="font-bold text-blue-900 text-lg">{{ fmtK(store.optimisedReport.optimisedBepRevenue) }}</span>
                      </div>
                      <div class="flex justify-between text-sm pt-2 border-t border-blue-200">
                        <span class="text-blue-600">Improvement</span>
                        <span class="font-bold text-green-700">
                          {{ store.optimisedReport.bepRevenueImprovementPct ? '−' + fmtPct(store.optimisedReport.bepRevenueImprovementPct) : '—' }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Fixed savings table -->
                  <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div class="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                      <h3 class="font-semibold text-gray-700">Fixed Cost Savings</h3>
                    </div>
                    <div v-if="store.fixedSavings.length === 0" class="px-5 py-6 text-sm text-gray-400 text-center">
                      No fixed cost savings defined for this plan.
                    </div>
                    <DataTable v-else :value="store.fixedSavings" class="p-datatable-sm">
                      <Column field="fixedCostLineId" header="Cost Line" />
                      <Column field="savingAmount" header="Saving (€)">
                        <template #body="{ data }">{{ parseFloat(data.savingAmount).toLocaleString('fr-FR') }} €</template>
                      </Column>
                      <Column field="newAmount" header="New Amount (€)">
                        <template #body="{ data }">{{ parseFloat(data.newAmount).toLocaleString('fr-FR') }} €</template>
                      </Column>
                      <Column field="comment" header="Comment" />
                    </DataTable>
                  </div>
                </div>
              </template>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
      </ShowOn><!-- end ShowOn from="tablet" -->
    </template>

    <!-- ── Snapshot dialog ──────────────────────────────────────── -->
    <Dialog
      v-model:visible="snapshotDialogVisible"
      header="New BEP Snapshot"
      :modal="true"
      class="w-full max-w-lg"
    >
      <div class="space-y-4 pt-2">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Label *</label>
          <InputText v-model="snapshotForm.label" class="w-full" placeholder="e.g. Budget 2025" />
        </div>

        <!-- Fill from plan shortcut -->
        <div class="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
          <i class="pi pi-info-circle text-blue-400 text-sm shrink-0"></i>
          <span class="text-xs text-blue-700 flex-1">Pre-fill numeric inputs from the business plan</span>
          <Select
            v-model="createPreviewYear"
            :options="yearOptions"
            optionLabel="label"
            optionValue="value"
            size="small"
            class="text-xs w-28"
          />
          <Button
            label="Fill"
            icon="pi pi-download"
            size="small"
            severity="info"
            text
            :loading="createPreviewLoading"
            @click="fillFromPlan"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Fixed Costs Total (€)</label>
            <InputNumber v-model="snapshotForm.fixedCostsTotal" class="w-full" :min="0" :useGrouping="true" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Contribution Margin (%)</label>
            <InputNumber v-model="snapshotForm.contributionMarginPct" class="w-full" :min="0" :max="100" :minFractionDigits="2" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Avg Order Value (€) <span class="text-gray-400 text-xs">optional</span></label>
          <InputNumber v-model="snapshotForm.avgOrderValue" class="w-full" :min="0" :useGrouping="true" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <Textarea v-model="snapshotForm.notes" class="w-full" rows="2" />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button label="Cancel" severity="secondary" text @click="snapshotDialogVisible = false" />
          <Button label="Create" icon="pi pi-check" @click="saveSnapshot" />
        </div>
      </template>
    </Dialog>

    <!-- ── Plan dialog ──────────────────────────────────────────── -->
    <Dialog
      v-model:visible="planDialogVisible"
      header="New Optimisation Plan"
      :modal="true"
      class="w-full max-w-md"
    >
      <div class="space-y-4 pt-2">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Plan name *</label>
          <InputText v-model="planForm.name" class="w-full" placeholder="e.g. Headcount reduction Q3" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <Textarea v-model="planForm.notes" class="w-full" rows="2" />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button label="Cancel" severity="secondary" text @click="planDialogVisible = false" />
          <Button label="Create" icon="pi pi-check" @click="savePlan" />
        </div>
      </template>
    </Dialog>
  </div>
</template>
