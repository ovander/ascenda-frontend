import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PnlManualEntry, PnlReport, PnlChartData } from '@/types'
import api from '@/composables/useApi'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'

export const usePnlStore = defineStore('pnl', () => {
  const manualEntries = ref<PnlManualEntry[]>([])
  const report = ref<PnlReport | null>(null)
  const chartData = ref<PnlChartData | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  function basePath() {
    const planStore = usePlanStore()
    const scenarioStore = useScenarioStore()
    const planId = planStore.activePlan?.id
    const scenarioId = scenarioStore.activeScenario?.id
    if (!planId || !scenarioId) throw new Error('No active plan/scenario')
    return `/api/v1/plans/${planId}/scenarios/${scenarioId}/pnl`
  }

  async function fetchEntries() {
    loading.value = true
    error.value = null
    try {
      const response = await api.get<PnlManualEntry[]>(`${basePath()}/`)
      manualEntries.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch P&L entries'
    } finally {
      loading.value = false
    }
  }

  async function updateEntries(data: PnlManualEntry[]) {
    try {
      await api.put(`${basePath()}/`, data)
      // Handler returns 204 No Content; refresh both entries and report
      await Promise.all([fetchEntries(), fetchReport()])
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update P&L entries'
      throw err
    }
  }

  async function fetchReport() {
    loading.value = true
    error.value = null
    try {
      const response = await api.get<PnlReport>(`${basePath()}/report`)
      report.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch P&L report'
    } finally {
      loading.value = false
    }
  }

  async function fetchChart() {
    loading.value = true
    error.value = null
    try {
      const response = await api.get<PnlChartData>(`${basePath()}/chart`)
      chartData.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch P&L chart'
    } finally {
      loading.value = false
    }
  }

  async function fetchAll() {
    await Promise.all([fetchEntries(), fetchReport(), fetchChart()])
  }

  function $reset() {
    manualEntries.value = []
    report.value = null
    chartData.value = null
    error.value = null
  }

  return {
    manualEntries,
    report,
    chartData,
    loading,
    error,
    fetchEntries,
    updateEntries,
    fetchReport,
    fetchChart,
    fetchAll,
    $reset,
  }
})
