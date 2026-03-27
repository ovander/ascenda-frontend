/**
 * scenarioCapTableStore — scenario-level cap table state.
 *
 * Manages the Enterprise-tier cap table data that lives under
 *   /api/v1/plans/{planId}/scenarios/{scenarioId}/cap-table
 *
 * Currently focuses on the FiPlan sync feature (sync a cap table round's
 * AmountRaisedK into the capital_increase FiPlan line). The full IngéFi /
 * FastStockOption / FastValo data will be added here when the scenario-level
 * cap table UI is built.
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CapTableRound } from '@/types'
import api from '@/composables/useApi'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'

export const useScenarioCapTableStore = defineStore('scenarioCapTable', () => {
  const rounds = ref<CapTableRound[]>([])
  const loading = ref(false)
  const syncLoading = ref(false)
  const error = ref<string | null>(null)
  const syncError = ref<string | null>(null)

  function basePath(): string {
    const planStore = usePlanStore()
    const scenarioStore = useScenarioStore()
    const planId = planStore.activePlan?.id
    const scenarioId = scenarioStore.activeScenario?.id
    if (!planId || !scenarioId) throw new Error('No active plan/scenario')
    return `/api/v1/plans/${planId}/scenarios/${scenarioId}/cap-table`
  }

  async function fetchRounds(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const res = await api.get<CapTableRound[]>(`${basePath()}/rounds`)
      rounds.value = res.data
    } catch (err: any) {
      error.value =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to fetch cap table rounds'
    } finally {
      loading.value = false
    }
  }

  /**
   * Sync a cap table round's AmountRaisedK to the capital_increase FiPlan
   * entry for the given fiscal year (0-based, 0 = Year 1).
   * Returns the updated round on success, null on failure.
   */
  async function syncRoundToFiplan(
    roundId: string,
    fiscalYearIndex: number,
  ): Promise<CapTableRound | null> {
    syncLoading.value = true
    syncError.value = null
    try {
      const res = await api.post<CapTableRound>(
        `${basePath()}/rounds/${roundId}/sync-to-fiplan`,
        { fiscalYearIndex },
      )
      // Update the local rounds list with the patched round.
      const idx = rounds.value.findIndex((r) => r.id === roundId)
      if (idx >= 0) rounds.value[idx] = res.data
      return res.data
    } catch (err: any) {
      syncError.value =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to sync round to financial plan'
      return null
    } finally {
      syncLoading.value = false
    }
  }

  /**
   * Remove the FiPlan link from a cap table round.
   * The amount in FiPlan is preserved but the link badge is cleared.
   */
  async function unlinkFromFiplan(roundId: string): Promise<CapTableRound | null> {
    syncLoading.value = true
    syncError.value = null
    try {
      const res = await api.delete<CapTableRound>(
        `${basePath()}/rounds/${roundId}/sync-to-fiplan`,
      )
      const idx = rounds.value.findIndex((r) => r.id === roundId)
      if (idx >= 0) rounds.value[idx] = res.data
      return res.data
    } catch (err: any) {
      syncError.value =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to unlink round from financial plan'
      return null
    } finally {
      syncLoading.value = false
    }
  }

  /**
   * Sync a founding-capital round to the opening balance (share_capital + cash).
   * Use this for capital social deposited before company registration (FR: SAS/SARL).
   * Mutually exclusive with syncRoundToFiplan.
   */
  async function syncRoundToOpeningBalance(roundId: string): Promise<CapTableRound | null> {
    syncLoading.value = true
    syncError.value = null
    try {
      const res = await api.post<CapTableRound>(
        `${basePath()}/rounds/${roundId}/sync-to-opening-balance`,
      )
      const idx = rounds.value.findIndex((r) => r.id === roundId)
      if (idx >= 0) rounds.value[idx] = res.data
      return res.data
    } catch (err: any) {
      syncError.value =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to sync round to opening balance'
      return null
    } finally {
      syncLoading.value = false
    }
  }

  /**
   * Remove the opening-balance link from a founding-capital round.
   * Subtracts its contribution from opening_balance.share_capital and cash.
   */
  async function unsyncRoundFromOpeningBalance(roundId: string): Promise<CapTableRound | null> {
    syncLoading.value = true
    syncError.value = null
    try {
      const res = await api.delete<CapTableRound>(
        `${basePath()}/rounds/${roundId}/sync-to-opening-balance`,
      )
      const idx = rounds.value.findIndex((r) => r.id === roundId)
      if (idx >= 0) rounds.value[idx] = res.data
      return res.data
    } catch (err: any) {
      syncError.value =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to unlink round from opening balance'
      return null
    } finally {
      syncLoading.value = false
    }
  }

  // ── Country profile ─────────────────────────────────────────────────────────

  const countryProfile = ref<Record<string, any> | null>(null)
  const countryProfileLoading = ref(false)

  /**
   * Fetches share-class terms and available equity instruments for a country
   * code (ISO 3166-1 alpha-2, e.g. "FR"). Results are cached in the store until
   * $reset() is called.
   */
  async function fetchCountryProfile(code: string) {
    if (!code) return
    countryProfileLoading.value = true
    try {
      const res = await api.get<Record<string, any>>(
        `${basePath()}/country-profile`,
        { params: { code } },
      )
      countryProfile.value = res.data
    } catch {
      // Non-fatal — country profile is informational only
    } finally {
      countryProfileLoading.value = false
    }
  }

  function $reset() {
    rounds.value = []
    loading.value = false
    syncLoading.value = false
    error.value = null
    syncError.value = null
    countryProfile.value = null
  }

  return {
    rounds,
    loading,
    syncLoading,
    error,
    syncError,
    countryProfile,
    countryProfileLoading,
    fetchRounds,
    syncRoundToFiplan,
    unlinkFromFiplan,
    syncRoundToOpeningBalance,
    unsyncRoundFromOpeningBalance,
    fetchCountryProfile,
    $reset,
  }
})
