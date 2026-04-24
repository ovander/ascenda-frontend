import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { OpexManualEntry, OpexSummary } from '@/types'
import api from '@/composables/useApi'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import { useDirtyState } from '@/composables/useDirtyState'

export const useOpexStore = defineStore('opex', () => {
  const manualEntries = ref<OpexManualEntry[]>([])
  const summary = ref<OpexSummary | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const dirty = useDirtyState('opex')

  function basePath() {
    const planStore = usePlanStore()
    const scenarioStore = useScenarioStore()
    const planId = planStore.activePlan?.id
    const scenarioId = scenarioStore.activeScenario?.id
    if (!planId || !scenarioId) throw new Error('No active plan/scenario')
    return `/api/v1/plans/${planId}/scenarios/${scenarioId}/opex`
  }

  async function fetchManualEntries() {
    loading.value = true
    error.value = null
    try {
      const response = await api.get<OpexManualEntry[]>(`${basePath()}/`)
      manualEntries.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch opex entries'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateManualEntries(data: Partial<OpexManualEntry>[]) {
    dirty.markSaving()
    try {
      await api.put(`${basePath()}/`, data)
      // Optimistic local merge — avoid a full re-fetch that would destroy input focus
      for (const updated of data) {
        const idx = manualEntries.value.findIndex(
          e => e.lineId === updated.lineId && e.yearIndex === updated.yearIndex
        )
        if (idx !== -1) {
          manualEntries.value[idx] = { ...manualEntries.value[idx], ...updated } as OpexManualEntry
        } else if (updated.lineId != null && updated.yearIndex != null) {
          manualEntries.value.push(updated as OpexManualEntry)
        }
      }
      // Directly patch the affected line values inside summary so opexRows reflects
      // the new value immediately without replacing the whole summary object.
      // Vue 3 deep reactivity tracks this in-place mutation, so only the changed
      // cells are updated — no full recompute, no InputNumber re-mount, no focus loss.
      // NOTE: updated.yearIndex is 1-based (1–5); line.years is 0-based (0–4).
      if (summary.value) {
        for (const updated of data) {
          if (updated.lineId == null || updated.yearIndex == null) continue
          if (updated.yearIndex < 1 || updated.yearIndex > 5) continue
          const yearIdx = updated.yearIndex - 1  // convert to 0-based array index
          for (const subcat of summary.value.subcategories) {
            for (const line of subcat.lines) {
              if (line.lineId === updated.lineId) {
                line.years[yearIdx] = updated.amount ?? '0'
              }
            }
          }
        }
      }
      dirty.markClean()
      // Fire-and-forget background refresh to bring subtotals and grand total
      // up to date without blocking (and without touching loading flag).
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
      const response = await api.get<OpexSummary>(`${basePath()}/summary`)
      summary.value = response.data
    } catch (err: any) {
      if (!silent) error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch opex summary'
      throw err
    } finally {
      if (!silent) loading.value = false
    }
  }

  async function fetchAll() {
    await Promise.all([fetchManualEntries(), fetchSummary()])
  }

  function $reset() {
    manualEntries.value = []
    summary.value = null
    error.value = null
  }

  return {
    manualEntries,
    summary,
    loading,
    error,
    dirty,
    fetchManualEntries,
    updateManualEntries,
    fetchSummary,
    fetchAll,
    $reset,
  }
})
