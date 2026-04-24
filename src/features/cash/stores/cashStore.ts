import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CashMonthlyOverride, CashReport } from '@/types'
import api from '@/composables/useApi'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import { DEBOUNCE_MS } from '@/utils/constants'
import { debounce } from '@/utils/format'
import { useDirtyState } from '@/composables/useDirtyState'

export const useCashStore = defineStore('cash', () => {
  const overrides = ref<CashMonthlyOverride[]>([])
  const report = ref<CashReport | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const dirty = useDirtyState('cash')

  function basePath() {
    const planStore = usePlanStore()
    const scenarioStore = useScenarioStore()
    const planId = planStore.activePlan?.id
    const scenarioId = scenarioStore.activeScenario?.id
    if (!planId || !scenarioId) throw new Error('No active plan/scenario')
    return `/api/v1/plans/${planId}/scenarios/${scenarioId}/cash`
  }

  async function fetchOverrides() {
    loading.value = true
    error.value = null
    try {
      const response = await api.get<CashMonthlyOverride[]>(`${basePath()}/`)
      overrides.value = response.data
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch cash overrides'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateOverrides(data: CashMonthlyOverride[]) {
    dirty.markSaving()
    try {
      const response = await api.put<CashMonthlyOverride[]>(`${basePath()}/`, data)
      overrides.value = response.data
      dirty.markClean()
      return response.data
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update cash overrides'
      error.value = msg
      dirty.markError(msg)
      throw err
    }
  }

  async function fetchReport() {
    loading.value = true
    error.value = null
    try {
      const response = await api.get<CashReport>(`${basePath()}/report`)
      report.value = response.data
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch cash report'
      throw err
    } finally {
      loading.value = false
    }
  }

  const debouncedUpdateOverrides = debounce(
    async (data: CashMonthlyOverride[]) => {
      await updateOverrides(data)
    },
    DEBOUNCE_MS
  )

  function $reset() {
    overrides.value = []
    report.value = null
    error.value = null
  }

  return {
    overrides,
    report,
    loading,
    error,
    dirty,
    fetchOverrides,
    updateOverrides,
    debouncedUpdateOverrides,
    fetchReport,
    $reset,
  }
})
