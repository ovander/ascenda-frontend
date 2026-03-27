import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { BSheetReport } from '@/types'
import api from '@/composables/useApi'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'

export const useBSheetStore = defineStore('bsheet', () => {
  const report = ref<BSheetReport | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  function basePath() {
    const planStore = usePlanStore()
    const scenarioStore = useScenarioStore()
    const planId = planStore.activePlan?.id
    const scenarioId = scenarioStore.activeScenario?.id
    if (!planId || !scenarioId) throw new Error('No active plan/scenario')
    return `/api/v1/plans/${planId}/scenarios/${scenarioId}/bsheet`
  }

  async function fetchReport() {
    loading.value = true
    error.value = null
    try {
      const response = await api.get<BSheetReport>(`${basePath()}/report`)
      report.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch balance sheet report'
    } finally {
      loading.value = false
    }
  }

  // Alias kept for symmetry with other stores
  const fetchAll = fetchReport

  function $reset() {
    report.value = null
    error.value = null
  }

  return {
    report,
    loading,
    error,
    fetchReport,
    fetchAll,
    $reset,
  }
})
