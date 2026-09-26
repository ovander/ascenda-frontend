<script setup lang="ts">
import { onMounted, computed, ref, watch } from 'vue'
import type { ChartData } from '@/types'
import { useI18n } from 'vue-i18n'
import { useProductStore } from '@/features/products/stores/productStore'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import { useYearHeaders } from '@/composables/useYearHeaders'
import { useDecimal } from '@/composables/useDecimal'
import { useDisplayUnitStore } from '@/stores/displayUnit'
import KChart from '@/components/common/KChart.vue'
import KFormLegend from '@/components/common/KFormLegend.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ProgressSpinner from 'primevue/progressspinner'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'

defineProps<{ planId?: string; sid?: string }>()

const { t } = useI18n()
const productStore = useProductStore()
const planStore = usePlanStore()
const scenarioStore = useScenarioStore()
const { yearHeaders } = useYearHeaders()
const { formatUnit, getUnitLabel } = useDecimal()
const displayUnitStore = useDisplayUnitStore()

const loading = ref(false)
const activeTab = ref('table')

const unitLabel = computed(() => getUnitLabel())

// ── Data load ────────────────────────────────────────────────────────────────
onMounted(async () => {
  if (planStore.activePlan && scenarioStore.activeScenario) {
    loading.value = true
    try {
      await productStore.fetchConsolidated()
    } finally {
      loading.value = false
    }
  }
})

// Watch for scenario changes and refresh consolidated revenue
watch(
  () => scenarioStore.activeScenario?.id,
  async (newScenarioId) => {
    if (newScenarioId && planStore.activePlan) {
      productStore.$reset()
      loading.value = true
      try {
        await productStore.fetchConsolidated()
      } finally {
        loading.value = false
      }
    }
  }
)

const consolidated = computed(() => productStore.consolidatedRevenue)

// ── Per-segment table rows ────────────────────────────────────────────────────
// Each row: product name + [turnover Y1..Y5] + [cogs] + [grossMargin] + [grossMarginPct]

interface RevenueRow {
  productId: string
  productName: string
  turnover: number[]
  cogs: number[]
  grossMargin: number[]
  grossMarginPct: number[]
  isTotal?: boolean
}

const tableRows = computed<RevenueRow[]>(() => {
  const cr = consolidated.value
  if (!cr) return []

  // Per-product rows
  const productRows: RevenueRow[] = cr.products.map((p) => {
    const turnover: number[] = []
    const cogs: number[] = []
    const grossMargin: number[] = []
    const grossMarginPct: number[] = []

    for (let y = 0; y < 5; y++) {
      const yr = p.years[y]
      turnover.push(yr ? Number(yr.turnover) : 0)
      cogs.push(yr ? Number(yr.cogs) : 0)
      grossMargin.push(yr ? Number(yr.grossMargin) : 0)
      grossMarginPct.push(yr ? Number(yr.grossMarginPct) * 100 : 0)
    }

    return {
      productId: p.productId,
      productName: p.productName,
      turnover,
      cogs,
      grossMargin,
      grossMarginPct,
    }
  })

  // Totals row
  const totalsRow: RevenueRow = {
    productId: '__total__',
    productName: 'Total',
    turnover: cr.totals.map((t) => Number(t.totalTurnover)),
    cogs: cr.totals.map((t) => Number(t.totalCogs)),
    grossMargin: cr.totals.map((t) => Number(t.totalGrossMargin)),
    grossMarginPct: cr.totals.map((t) => Number(t.grossMarginPct) * 100),
    isTotal: true,
  }

  return [...productRows, totalsRow]
})

// ── Turnover by segment chart (stacked bar) ──────────────────────────────────
const turnoverChart = computed<ChartData | null>(() => {
  const cr = consolidated.value
  if (!cr || cr.products.length === 0) return null
  const factor = displayUnitStore.factor

  return {
    labels: yearHeaders.value,
    datasets: cr.products.map((p) => ({
      label: p.productName,
      data: p.years.map((y) => Number(y.turnover) / factor),
    })),
  }
})

// ── Gross margin by segment chart (stacked bar) ───────────────────────────────
const grossMarginChart = computed<ChartData | null>(() => {
  const cr = consolidated.value
  if (!cr || cr.products.length === 0) return null
  const factor = displayUnitStore.factor

  return {
    labels: yearHeaders.value,
    datasets: cr.products.map((p) => ({
      label: p.productName,
      data: p.years.map((y) => Number(y.grossMargin) / factor),
    })),
  }
})

// ── Gross margin % total trend (line) ────────────────────────────────────────
const grossMarginPctChart = computed<ChartData | null>(() => {
  const cr = consolidated.value
  if (!cr || cr.totals.length === 0) return null

  return {
    labels: yearHeaders.value,
    datasets: [
      {
        label: t('revenues.grossMarginPct'),
        data: cr.totals.map((total) => Number(total.grossMarginPct) * 100),
        type: 'line',
        borderColor: '#10b981',
        backgroundColor: '#10b981',
      },
    ],
  }
})

// ── Formatting helpers ───────────────────────────────────────────────────────
function fmtPct(val: number): string {
  return val.toFixed(1) + '\u00A0%'
}
</script>

<template>
  <div class="flex flex-col h-full gap-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-800">{{ t('revenues.title') }}</h1>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <template v-else>
      <KFormLegend
        variant="grid"
        :description="t('revenues.description')"
      />

      <Tabs :value="activeTab" @update:value="(v: any) => activeTab = v" class="flex-1">
        <TabList>
          <Tab value="table">{{ t('revenues.tab.table') }}</Tab>
          <Tab value="charts">{{ t('revenues.tab.charts') }}</Tab>
        </TabList>

        <TabPanels>
          <!-- Summary Table Tab -->
          <TabPanel value="table" class="p-0 pt-4">
            <div v-if="!consolidated || consolidated.products.length === 0"
              class="flex items-center justify-center py-16 text-gray-400">
              {{ t('revenues.noData') }}
            </div>

            <DataTable
              v-else
              :value="tableRows"
              class="p-datatable-sm p-datatable-gridlines"
              :scrollable="true"
              scrollHeight="flex"
              showGridlines
              size="small"
            >
              <!-- Product name column -->
              <Column field="productName" :header="t('revenues.col.segment')" frozen class="min-w-[200px]">
                <template #body="{ data }">
                  <span :class="data.isTotal ? 'font-bold text-gray-900' : 'text-gray-700'">
                    {{ data.productName }}
                  </span>
                </template>
              </Column>

              <!-- Turnover columns -->
              <Column
                v-for="(header, idx) in yearHeaders"
                :key="'tv-' + idx"
                :header="header + ' — Turnover (' + unitLabel + ')'"
                class="text-right min-w-[140px]"
              >
                <template #body="{ data }">
                  <span
                    :class="[
                      data.isTotal
                        ? 'font-bold bg-blue-50 text-blue-900'
                        : 'text-gray-700',
                      'block px-2 py-0.5 rounded-sm text-right',
                    ]"
                  >
                    {{ formatUnit(data.turnover[idx] ?? 0, 0) }}
                  </span>
                </template>
              </Column>

              <!-- Gross Margin columns -->
              <Column
                v-for="(header, idx) in yearHeaders"
                :key="'gm-' + idx"
                :header="header + ' — Gross Margin (' + unitLabel + ')'"
                class="text-right min-w-[160px]"
              >
                <template #body="{ data }">
                  <span
                    :class="[
                      data.isTotal
                        ? 'font-bold bg-green-50 text-green-900'
                        : 'text-gray-700',
                      'block px-2 py-0.5 rounded-sm text-right',
                    ]"
                  >
                    {{ formatUnit(data.grossMargin[idx] ?? 0, 0) }}
                  </span>
                </template>
              </Column>

              <!-- Gross Margin % (first year only, as a quick reference) -->
              <Column :header="t('revenues.col.gmY1')" class="text-right min-w-[90px]">
                <template #body="{ data }">
                  <span
                    :class="[
                      data.isTotal ? 'font-bold text-green-700' : 'text-gray-500',
                      'block text-right text-sm',
                    ]"
                  >
                    {{ fmtPct(data.grossMarginPct[0] ?? 0) }}
                  </span>
                </template>
              </Column>
            </DataTable>
          </TabPanel>

          <!-- Charts Tab -->
          <TabPanel value="charts" class="p-0 pt-4">
            <div
              v-if="!consolidated || consolidated.products.length === 0"
              class="flex items-center justify-center py-16 text-gray-400"
            >
              {{ t('revenues.noData') }}
            </div>

            <div v-else class="grid grid-cols-1 gap-6">
              <!-- Turnover by segment -->
              <div class="bg-white rounded-sm border border-gray-200 p-4">
                <h2 class="text-lg font-semibold mb-4 text-gray-700">
                  {{ t('revenues.chart.turnoverBySegment') }} ({{ unitLabel }})
                </h2>
                <KChart
                  :key="`turnover-${unitLabel}`"
                  :data="turnoverChart"
                  type="stacked-bar"
                  height="320px"
                  :loading="loading"
                />
              </div>

              <!-- Gross Margin by segment -->
              <div class="bg-white rounded-sm border border-gray-200 p-4">
                <h2 class="text-lg font-semibold mb-4 text-gray-700">
                  {{ t('revenues.chart.grossMarginBySegment') }} ({{ unitLabel }})
                </h2>
                <KChart
                  :key="`grossMargin-${unitLabel}`"
                  :data="grossMarginChart"
                  type="stacked-bar"
                  height="320px"
                  :loading="loading"
                />
              </div>

              <!-- Gross Margin % trend -->
              <div class="bg-white rounded-sm border border-gray-200 p-4">
                <h2 class="text-lg font-semibold mb-4 text-gray-700">
                  {{ t('revenues.chart.grossMarginTrend') }}
                </h2>
                <KChart
                  :data="grossMarginPctChart"
                  type="line"
                  height="280px"
                  :loading="loading"
                />
              </div>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </template>
  </div>
</template>
