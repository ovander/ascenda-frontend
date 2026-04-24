<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import { useGraphStore } from '@/features/graphs/stores/graphStore'
import { useDisplayUnitStore } from '@/stores/displayUnit'
import { useDecimal } from '@/composables/useDecimal'
import type { ChartData } from '@/types'
import Card from 'primevue/card'
import KChart from '@/components/common/KChart.vue'
import ShowOn from '@/components/common/ShowOn.vue'
import PageContainer from '@/components/layout/PageContainer.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import KSection from '@/components/layout/KSection.vue'

defineProps<{ planId?: string; sid?: string }>()

const { t } = useI18n()
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

const salesAnalysisChart      = computed(() => scaleChart(graphStore.annualCharts['sales-analysis']))
const costStructureChart      = computed(() => scaleChart(graphStore.annualCharts['cost-structure']))
const revProfitCashChart      = computed(() => scaleChart(graphStore.annualCharts['revenue-profit-cash']))
const reqVsCashChart          = computed(() => scaleChart(graphStore.annualCharts['requirements-vs-cash']))
const balanceSheetChart       = computed(() => scaleChart(graphStore.annualCharts['balance-sheet-structure']))
// Headcount is FTE counts — no monetary scaling
const headcountAnnualChart    = computed<ChartData | null>(() => graphStore.annualCharts['headcount-annual'] ?? null)
const pnlCascadeChart         = computed(() => scaleChart(graphStore.annualCharts['pnl-cascade']))

onMounted(async () => {
  if (planStore.activePlan && scenarioStore.activeScenario) {
    await graphStore.fetchAllAnnual()
  }
})
</script>

<template>
  <PageContainer>
    <PageHeader>
      <template #title>{{ t('graphs.title') }}</template>
    </PageHeader>

    <!-- ── Mobile: 2 highlight charts ──────────────────────────────── -->
    <ShowOn only="mobile">
      <KSection>
        <div class="flex flex-col gap-6">
          <Card>
            <template #title>
              <span class="text-base font-semibold">{{ t('graphs.revProfitCash') }}</span>
            </template>
            <template #content>
              <KChart
                :key="`mobile-revprofitcash-${unitLabel}`"
                :data="revProfitCashChart"
                type="combo"
                height="260px"
                :loading="graphStore.loading"
              />
            </template>
          </Card>

          <Card>
            <template #title>
              <span class="text-base font-semibold">{{ t('graphs.headcount') }}</span>
            </template>
            <template #content>
              <KChart
                key="mobile-headcount"
                :data="headcountAnnualChart"
                type="stacked-bar"
                height="260px"
                :loading="graphStore.loading"
              />
            </template>
          </Card>

          <p class="text-xs text-center text-gray-400">{{ t('graphs.allAvailable') }}</p>
        </div>
      </KSection>
    </ShowOn>

    <!-- ── Tablet + Desktop: full 7-chart grid ──────────────────────── -->
    <ShowOn from="tablet">
    <KSection>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <template #title>
          <span class="text-lg font-semibold">{{ t('graphs.salesAnalysis') }}</span>
        </template>
        <template #content>
          <KChart
            :key="`annual-sales-${unitLabel}`"
            :data="salesAnalysisChart"
            type="stacked-bar"
            height="320px"
            :loading="graphStore.loading"
          />
        </template>
      </Card>

      <Card>
        <template #title>
          <span class="text-lg font-semibold">{{ t('graphs.costStructure') }}</span>
        </template>
        <template #content>
          <KChart
            :key="`annual-cost-${unitLabel}`"
            :data="costStructureChart"
            type="stacked-bar"
            height="320px"
            :loading="graphStore.loading"
          />
        </template>
      </Card>

      <Card>
        <template #title>
          <span class="text-lg font-semibold">{{ t('graphs.revProfitCash') }}</span>
        </template>
        <template #content>
          <KChart
            :key="`annual-revprofitcash-${unitLabel}`"
            :data="revProfitCashChart"
            type="combo"
            height="320px"
            :loading="graphStore.loading"
          />
        </template>
      </Card>

      <Card>
        <template #title>
          <span class="text-lg font-semibold">{{ t('graphs.reqVsCash') }}</span>
        </template>
        <template #content>
          <KChart
            :key="`annual-reqvscash-${unitLabel}`"
            :data="reqVsCashChart"
            type="combo"
            height="320px"
            :loading="graphStore.loading"
          />
        </template>
      </Card>

      <Card>
        <template #title>
          <span class="text-lg font-semibold">{{ t('graphs.balanceSheet') }}</span>
        </template>
        <template #content>
          <KChart
            :key="`annual-bsheet-${unitLabel}`"
            :data="balanceSheetChart"
            type="stacked-bar"
            height="320px"
            :loading="graphStore.loading"
          />
        </template>
      </Card>

      <Card>
        <template #title>
          <span class="text-lg font-semibold">{{ t('graphs.headcount') }}</span>
        </template>
        <template #content>
          <KChart
            key="annual-headcount"
            :data="headcountAnnualChart"
            type="stacked-bar"
            height="320px"
            :loading="graphStore.loading"
          />
        </template>
      </Card>

      <Card>
        <template #title>
          <span class="text-lg font-semibold">{{ t('graphs.pnlCascade') }}</span>
        </template>
        <template #content>
          <KChart
            :key="`annual-pnlcascade-${unitLabel}`"
            :data="pnlCascadeChart"
            type="combo"
            height="320px"
            :loading="graphStore.loading"
          />
        </template>
      </Card>
    </div>
    </KSection>

    <KSection>
      <div class="p-3 md:p-4 md:p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <p class="text-sm text-blue-700">
          Charts will populate with data from the financial plan once all modules are configured.
        </p>
      </div>
    </KSection>
    </ShowOn><!-- end ShowOn from="tablet" -->
  </PageContainer>
</template>

<style scoped>
:deep(.p-card) {
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}
</style>
