import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { FullPlanOutput, ValidationWarning } from '@/types'
import api from '@/composables/useApi'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import { REPORT_CACHE_TTL_MS } from '@/utils/constants'

export const useReportStore = defineStore('report', () => {
  const fullReport = ref<FullPlanOutput | null>(null)
  const warnings = ref<ValidationWarning[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  let cacheExpiry: number = 0

  function basePath() {
    const planStore = usePlanStore()
    const scenarioStore = useScenarioStore()
    const planId = planStore.activePlan?.id
    const scenarioId = scenarioStore.activeScenario?.id
    if (!planId || !scenarioId) throw new Error('No active plan/scenario')
    return `/api/v1/plans/${planId}/scenarios/${scenarioId}/report`
  }

  function isCacheValid(): boolean {
    return fullReport.value !== null && Date.now() < cacheExpiry
  }

  async function fetchFullReport(forceRefresh = false) {
    if (!forceRefresh && isCacheValid()) {
      return fullReport.value
    }

    loading.value = true
    error.value = null
    try {
      const response = await api.get<FullPlanOutput>(`${basePath()}`)
      fullReport.value = response.data
      warnings.value = response.data.warnings || []
      cacheExpiry = Date.now() + REPORT_CACHE_TTL_MS
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch full report'
      throw err
    } finally {
      loading.value = false
    }
  }

  function $reset() {
    fullReport.value = null
    warnings.value = []
    error.value = null
    cacheExpiry = 0
  }

  return {
    fullReport,
    warnings,
    loading,
    error,
    fetchFullReport,
    $reset,
  }
})
