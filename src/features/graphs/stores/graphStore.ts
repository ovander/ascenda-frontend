import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useApi'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import type { ChartData } from '@/types'

export const useGraphStore = defineStore('graph', () => {
  const api = useApi()
  const loading = ref(false)
  const error = ref<string | null>(null)
  const annualCharts = ref<Record<string, ChartData>>({})
  const monthlyCharts = ref<Record<string, ChartData>>({})

  function basePath() {
    const planStore = usePlanStore()
    const scenarioStore = useScenarioStore()
    return `/api/v1/plans/${planStore.activePlan?.id}/scenarios/${scenarioStore.activeScenario?.id}`
  }

  async function fetchAnnualChart(chartName: string) {
    // No try/catch: errors propagate to fetchAllAnnual's catch block.
    // The axios interceptor logs every API failure automatically.
    const { data } = await api.get<ChartData>(`${basePath()}/graphs/annual?name=${chartName}`)
    annualCharts.value[chartName] = data
  }

  async function fetchMonthlyChart(chartName: string) {
    // No try/catch: errors propagate to fetchAllMonthly's catch block.
    const { data } = await api.get<ChartData>(`${basePath()}/graphs/monthly?name=${chartName}`)
    monthlyCharts.value[chartName] = data
  }

  async function fetchAllAnnual() {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get<Record<string, ChartData>>(`${basePath()}/graphs/annual/all`)
      Object.assign(annualCharts.value, data)
    } catch (err: any) {
      error.value = err?.message || 'Failed to load annual charts'
    } finally {
      loading.value = false
    }
  }

  async function fetchAllMonthly() {
    loading.value = true
    error.value = null
    try {
      await Promise.all([
        fetchMonthlyChart('cash-equity-debt'),
        fetchMonthlyChart('operating-cash-flows'),
        fetchMonthlyChart('invoicing-ebitda'),
        fetchMonthlyChart('headcount'),
      ])
    } catch (err: any) {
      error.value = err?.message || 'Failed to load monthly charts'
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    annualCharts,
    monthlyCharts,
    fetchAnnualChart,
    fetchMonthlyChart,
    fetchAllAnnual,
    fetchAllMonthly,
  }
})
