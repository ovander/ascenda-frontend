import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CapTableRound, FiplanEntry, FiplanReport } from '@/types'
import api from '@/composables/useApi'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import { devlog } from '@/utils/logger'
import { useDirtyState } from '@/composables/useDirtyState'

export interface GrantData {
  id: string
  name: string
  amount: string
  yearIndex: number
}

export const useFiplanStore = defineStore('fiplan', () => {
  const entries = ref<FiplanEntry[]>([])
  const report = ref<FiplanReport | null>(null)
  const grants = ref<GrantData[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const dirty = useDirtyState('fiplan')

  function basePath() {
    const planStore = usePlanStore()
    const scenarioStore = useScenarioStore()
    const planId = planStore.activePlan?.id
    const scenarioId = scenarioStore.activeScenario?.id
    if (!planId || !scenarioId) throw new Error('No active plan/scenario')
    return `/api/v1/plans/${planId}/scenarios/${scenarioId}/fiplan`
  }

  async function fetchEntries(silent = false) {
    if (!silent) loading.value = true
    error.value = null
    try {
      const response = await api.get<FiplanEntry[]>(`${basePath()}/`)
      entries.value = response.data
    } catch (err: any) {
      if (!silent) error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch financial plan entries'
      throw err
    } finally {
      if (!silent) loading.value = false
    }
  }

  async function updateEntries(data: FiplanEntry[]) {
    dirty.markSaving()
    try {
      // Strip `id` from the payload: new placeholder entries have id='' which the
      // Go JSON decoder rejects (uuid.UUID cannot parse an empty string).
      // The service assigns IDs server-side for new entries (id == uuid.Nil).
      const payload = data.map(({ lineId, yearIndex, amount }) => ({ lineId, yearIndex, amount }))
      // PUT returns 204 No Content — re-fetch entries and report silently so the
      // loading flag never toggles and the tab panel is never unmounted mid-edit.
      await api.put(`${basePath()}/`, payload)
      await fetchEntries(true)
      await fetchReport(true)
      dirty.markClean()
    } catch (err: any) {
      devlog.error('[fiplan] PUT failed — response body:', err.response?.data)
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update financial plan entries'
      error.value = msg
      dirty.markError(msg)
      throw err
    }
  }

  async function fetchReport(silent = false) {
    if (!silent) loading.value = true
    error.value = null
    try {
      const response = await api.get<FiplanReport>(`${basePath()}/report`)
      report.value = response.data
    } catch (err: any) {
      if (!silent) error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch financial plan report'
      throw err
    } finally {
      if (!silent) loading.value = false
    }
  }

  async function fetchGrants(silent = false) {
    if (!silent) loading.value = true
    error.value = null
    try {
      const response = await api.get<GrantData[]>(`${basePath()}/grants`)
      grants.value = response.data
    } catch (err: any) {
      if (!silent) error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch grants'
      throw err
    } finally {
      if (!silent) loading.value = false
    }
  }

  async function fetchAll() {
    // Initial load: show spinner (non-silent). Parallel fetch is fine here since
    // loading is set to true by each function independently.
    await Promise.all([fetchEntries(), fetchReport(), fetchGrants()])
  }

  /**
   * Flow A: FiPlan → Cap Table.
   * Creates a cap table round pre-filled with the planned capital increase amount
   * for the given 0-based fiscal year (0 = Year 1 … 4 = Year 5).
   * On success the FiPlan entries are refreshed so the link badge appears.
   */
  const roundCreating = ref(false)
  const roundCreateError = ref<string | null>(null)

  async function createRoundFromCapitalIncrease(
    yearIndex: number,
    body: { label: string; shareClassType: string; phaseNumber: number; sortOrder: number },
  ): Promise<CapTableRound | null> {
    roundCreating.value = true
    roundCreateError.value = null
    try {
      const res = await api.post<CapTableRound>(
        `${basePath()}/capital-increase/${yearIndex}/create-round`,
        body,
      )
      // Refresh entries silently so the link badge appears without unmounting the UI.
      await fetchEntries(true)
      return res.data
    } catch (err: any) {
      roundCreateError.value =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to create cap table round from capital increase'
      return null
    } finally {
      roundCreating.value = false
    }
  }

  function $reset() {
    entries.value = []
    report.value = null
    grants.value = []
    error.value = null
    roundCreateError.value = null
  }

  return {
    entries,
    report,
    grants,
    loading,
    error,
    dirty,
    roundCreating,
    roundCreateError,
    fetchEntries,
    updateEntries,
    fetchReport,
    fetchGrants,
    fetchAll,
    createRoundFromCapitalIncrease,
    $reset,
  }
})
