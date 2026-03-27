<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import { useGraphStore } from '@/features/graphs/stores/graphStore'
import { useDisplayUnitStore } from '@/stores/displayUnit'
import { useDecimal } from '@/composables/useDecimal'
import type { ChartData } from '@/types'
import Card from 'primevue/card'
import KChart from '@/components/common/KChart.vue'

defineProps<{ planId?: string; sid?: string }>()

const planStore = usePlanStore()
const scenarioStore = useScenarioStore()
const graphStore = useGraphStore()
const displayUnitStore = useDisplayUnitStore()
const { getUnitLabel } = useDecimal()
const unitLabel = computed(() => getUnitLabel())

/** Scale all numeric datasets in a raw ChartData by the display factor. */
function scaleChart(raw: ChartData | undefined | null): ChartData | null {
  if (!raw) return null
  const factor = displayUnitStore.factor
  return {
    labels: raw.labels,
    datasets: raw.datasets.map(ds => ({
      ...ds,
      data: (ds.data as number[]).map(v => v / factor),
    })),
  }
}

// Monetary charts — scaled
const cashEquityDebtChart   = computed(() => scaleChart(graphStore.monthlyCharts['cash-equity-debt']))
const operatingCashFlowChart = computed(() => scaleChart(graphStore.monthlyCharts['operating-cash-flows']))
const invoicingEbitdaChart  = computed(() => scaleChart(graphStore.monthlyCharts['invoicing-ebitda']))
// Headcount — NOT monetary (FTE counts), pass through unchanged
const headcountChart = computed(() => graphStore.monthlyCharts['headcount'] || null)

onMounted(async () => {
  if (planStore.activePlan && scenarioStore.activeScenario) {
    await graphStore.fetchAllMonthly()
  }
})
</script>

<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold text-gray-800 mb-6">Monthly Financial Analysis</h1>

    <div class="grid grid-cols-2 gap-6">
      <Card>
        <template #title>
          <span class="text-lg font-semibold">Cash, Equity & Debt</span>
        </template>
        <template #content>
          <KChart
            :key="`monthly-cashequity-${unitLabel}`"
            :data="cashEquityDebtChart"
            type="line"
            height="320px"
            :loading="graphStore.loading"
          />
        </template>
      </Card>

      <Card>
        <template #title>
          <span class="text-lg font-semibold">Operating Cash Flows</span>
        </template>
        <template #content>
          <KChart
            :key="`monthly-opcash-${unitLabel}`"
            :data="operatingCashFlowChart"
            type="bar"
            height="320px"
            :loading="graphStore.loading"
          />
        </template>
      </Card>

      <Card>
        <template #title>
          <span class="text-lg font-semibold">Invoicing & EBITDA</span>
        </template>
        <template #content>
          <KChart
            :key="`monthly-invoicingebitda-${unitLabel}`"
            :data="invoicingEbitdaChart"
            type="combo"
            height="320px"
            :loading="graphStore.loading"
          />
        </template>
      </Card>

      <Card>
        <template #title>
          <span class="text-lg font-semibold">Headcount Evolution</span>
        </template>
        <template #content>
          <KChart
            :data="headcountChart"
            type="area"
            height="320px"
            :loading="graphStore.loading"
          />
        </template>
      </Card>
    </div>

    <div class="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <p class="text-sm text-blue-700">
        Monthly charts display 36-month rolling data. Navigate using the time period selector.
      </p>
    </div>
  </div>
</template>

<style scoped>
:deep(.p-card) {
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}
</style>
