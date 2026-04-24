import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CapexEntry, CapexSummary } from '@/types'
import api from '@/composables/useApi'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import { useDirtyState } from '@/composables/useDirtyState'

export const useCapexStore = defineStore('capex', () => {
  const entries = ref<CapexEntry[]>([])
  const summary = ref<CapexSummary | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const dirty = useDirtyState('capex')

  function basePath() {
    const planStore = usePlanStore()
    const scenarioStore = useScenarioStore()
    const planId = planStore.activePlan?.id
    const scenarioId = scenarioStore.activeScenario?.id
    if (!planId || !scenarioId) throw new Error('No active plan/scenario')
    return `/api/v1/plans/${planId}/scenarios/${scenarioId}/capex`
  }

  async function fetchEntries() {
    loading.value = true
    error.value = null
    try {
      const response = await api.get<CapexEntry[]>(`${basePath()}/`)
      entries.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch capex entries'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateEntries(data: Partial<CapexEntry>[]) {
    dirty.markSaving()
    try {
      await api.put(`${basePath()}/`, data)
      // Optimistic local merge — avoid a full re-fetch that would destroy input focus
      for (const updated of data) {
        const idx = entries.value.findIndex(
          e => e.category === updated.category && e.yearIndex === updated.yearIndex
        )
        if (idx !== -1) {
          entries.value[idx] = { ...entries.value[idx], ...updated } as CapexEntry
        } else if (updated.category != null && updated.yearIndex != null) {
          entries.value.push(updated as CapexEntry)
        }
      }
      dirty.markClean()
      // Background refresh of summary so Depreciation Summary grid stays current
      fetchSummary(true).catch(() => {})
    } catch (err: any) {
      dirty.markError(err.response?.data?.error?.message)
      throw err
    }
  }

  async function fetchSummary(silent = false) {
    if (!silent) loading.value = true
    error.value = null
    try {
      const response = await api.get<CapexSummary>(`${basePath()}/summary`)
      summary.value = response.data
    } catch (err: any) {
      if (!silent) error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch capex summary'
      throw err
    } finally {
      if (!silent) loading.value = false
    }
  }

  async function fetchAll() {
    await Promise.all([fetchEntries(), fetchSummary()])
  }

  function $reset() {
    entries.value = []
    summary.value = null
    error.value = null
  }

  return {
    entries,
    summary,
    loading,
    error,
    dirty,
    fetchEntries,
    updateEntries,
    fetchSummary,
    fetchAll,
    $reset,
  }
})
