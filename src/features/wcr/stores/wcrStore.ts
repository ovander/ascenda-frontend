import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { WCREntry, WCRReport } from '@/types'
import api from '@/composables/useApi'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import { useDirtyState } from '@/composables/useDirtyState'

export const useWcrStore = defineStore('wcr', () => {
  const entries = ref<WCREntry[]>([])
  const report = ref<WCRReport | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const dirty = useDirtyState('wcr')

  function basePath() {
    const planStore = usePlanStore()
    const scenarioStore = useScenarioStore()
    const planId = planStore.activePlan?.id
    const scenarioId = scenarioStore.activeScenario?.id
    if (!planId || !scenarioId) throw new Error('No active plan/scenario')
    return `/api/v1/plans/${planId}/scenarios/${scenarioId}/wcr`
  }

  async function fetchEntries() {
    loading.value = true
    error.value = null
    try {
      const response = await api.get<WCREntry[]>(`${basePath()}/`)
      entries.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch WCR entries'
    } finally {
      loading.value = false
    }
  }

  async function updateEntries(data: WCREntry[]) {
    loading.value = true
    error.value = null
    dirty.markSaving()
    try {
      const response = await api.put<WCREntry[]>(`${basePath()}/`, data)
      entries.value = response.data
      dirty.markClean()
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update WCR entries'
      error.value = msg
      dirty.markError(msg)
    } finally {
      loading.value = false
    }
  }

  async function fetchReport() {
    loading.value = true
    error.value = null
    try {
      const response = await api.get<WCRReport>(`${basePath()}/report`)
      report.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch WCR report'
    } finally {
      loading.value = false
    }
  }

  function $reset() {
    entries.value = []
    report.value = null
    error.value = null
  }

  return {
    entries,
    report,
    loading,
    error,
    dirty,
    fetchEntries,
    updateEntries,
    fetchReport,
    $reset,
  }
})
