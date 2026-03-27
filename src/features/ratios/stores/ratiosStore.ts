import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RatiosReport, ChartData } from '@/types'
import api from '@/composables/useApi'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'

export const useRatiosStore = defineStore('ratios', () => {
  const report = ref<RatiosReport | null>(null)
  const charts = ref<Record<string, ChartData>>({})
  const loading = ref(false)
  const error = ref<string | null>(null)

  function basePath() {
    const planStore = usePlanStore()
    const scenarioStore = useScenarioStore()
    const planId = planStore.activePlan?.id
    const scenarioId = scenarioStore.activeScenario?.id
    if (!planId || !scenarioId) throw new Error('No active plan/scenario')
    return `/api/v1/plans/${planId}/scenarios/${scenarioId}/ratios`
  }

  async function fetchReport() {
    loading.value = true
    error.value = null
    try {
      const response = await api.get<RatiosReport>(`${basePath()}/report`)
      report.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch ratios report'
    } finally {
      loading.value = false
    }
  }

  async function fetchChart(chartName: string) {
    loading.value = true
    error.value = null
    try {
      const response = await api.get<ChartData>(`${basePath()}/chart?name=${chartName}`)
      charts.value[chartName] = response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch chart'
    } finally {
      loading.value = false
    }
  }

  function $reset() {
    report.value = null
    charts.value = {}
    error.value = null
  }

  return {
    report,
    charts,
    loading,
    error,
    fetchReport,
    fetchChart,
    $reset,
  }
})
