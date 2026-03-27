import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PnlCashEntry, PnlCashReport, PnlCashChartData, ChartData } from '@/types'
import api from '@/composables/useApi'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'

export const usePnlCashStore = defineStore('pnl-cash', () => {
  const entries = ref<PnlCashEntry[]>([])
  const report = ref<PnlCashReport | null>(null)
  const chartData = ref<ChartData | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  function basePath() {
    const planStore = usePlanStore()
    const scenarioStore = useScenarioStore()
    const planId = planStore.activePlan?.id
    const scenarioId = scenarioStore.activeScenario?.id
    if (!planId || !scenarioId) throw new Error('No active plan/scenario')
    return `/api/v1/plans/${planId}/scenarios/${scenarioId}/pnl-cash`
  }

  async function fetchEntries(silent = false) {
    if (!silent) loading.value = true
    error.value = null
    try {
      const response = await api.get<PnlCashEntry[]>(`${basePath()}/`)
      entries.value = response.data
    } catch (err: any) {
      if (!silent) error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch P&L Cash entries'
      throw err
    } finally {
      if (!silent) loading.value = false
    }
  }

  async function updateEntries(data: PnlCashEntry[]) {
    try {
      // PUT returns 204 No Content — re-fetch entries and report silently so the
      // loading flag never toggles and the tab panel is never unmounted mid-edit.
      await api.put(`${basePath()}/`, data)
      await fetchEntries(true)
      await fetchReport(true)
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update P&L Cash entries'
      throw err
    }
  }

  async function fetchReport(silent = false) {
    if (!silent) loading.value = true
    error.value = null
    try {
      const response = await api.get<PnlCashReport>(`${basePath()}/report`)
      report.value = response.data
    } catch (err: any) {
      if (!silent) error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch P&L Cash report'
      throw err
    } finally {
      if (!silent) loading.value = false
    }
  }

  async function fetchChart(silent = false) {
    if (!silent) loading.value = true
    error.value = null
    try {
      // Backend returns { years: number[], chartData: PnlCashChartData }
      // Transform into the Chart.js-compatible { labels, datasets } shape for KChart.
      const response = await api.get<{ years: number[]; chartData: PnlCashChartData }>(`${basePath()}/chart`)
      const { years, chartData: cd } = response.data
      chartData.value = {
        labels: years.map(String),
        datasets: [
          { label: 'Cost of Sales',    data: cd.costOfSales },
          { label: 'R&D / Production', data: cd.rdProduction },
          { label: 'Sales & Marketing',data: cd.salesMarketing },
          { label: 'G&A',              data: cd.generalAdmin },
          { label: 'EBIT (positive)',  data: cd.ebitPositive },
          { label: 'EBIT (negative)',  data: cd.ebitNegative },
        ],
      }
    } catch (err: any) {
      if (!silent) error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch P&L Cash chart'
      throw err
    } finally {
      if (!silent) loading.value = false
    }
  }

  async function fetchAll() {
    // Initial load: show spinner (non-silent).
    await Promise.all([fetchEntries(), fetchReport(), fetchChart()])
  }

  function $reset() {
    entries.value = []
    report.value = null
    chartData.value = null
    error.value = null
  }

  return {
    entries,
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
