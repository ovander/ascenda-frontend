import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PlanConfig, PlanConfigComputed, OpeningBalance, OpeningBalanceComputed, WorkingCapitalConfig, OpexPerHire } from '@/types'
import api from '@/composables/useApi'
import { devlog } from '@/utils/logger'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import { useDirtyState } from '@/composables/useDirtyState'

export const useSettingsStore = defineStore('settings', () => {
  const config = ref<PlanConfig | null>(null)
  const configComputed = ref<PlanConfigComputed | null>(null)
  const openingBalance = ref<OpeningBalance | null>(null)
  const openingBalanceComputed = ref<OpeningBalanceComputed | null>(null)
  const wcConfig = ref<WorkingCapitalConfig | null>(null)
  const opexPerHire = ref<OpexPerHire | null>(null)
  const loading = ref(false)
  /** True while a PUT request is in-flight (duplicate-submit guard). */
  const saving = ref(false)
  const error = ref<string | null>(null)

  const dirty = useDirtyState('settings')

  function basePath() {
    const planStore = usePlanStore()
    const scenarioStore = useScenarioStore()
    const planId = planStore.activePlan?.id
    const scenarioId = scenarioStore.activeScenario?.id
    if (!planId || !scenarioId) throw new Error('No active plan/scenario')
    return `/api/v1/plans/${planId}/scenarios/${scenarioId}/settings`
  }

  async function fetchConfig() {
    loading.value = true
    error.value = null
    try {
      const response = await api.get<PlanConfigComputed>(`${basePath()}/config`)
      configComputed.value = response.data
      config.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch config'
    } finally {
      loading.value = false
    }
  }

  async function updateConfig(data: Partial<PlanConfig>) {
    if (saving.value) return configComputed.value
    saving.value = true
    dirty.markSaving()
    try {
      const response = await api.put<PlanConfigComputed>(`${basePath()}/config`, data)
      configComputed.value = response.data
      config.value = response.data
      dirty.markClean()
      return response.data
    } catch (err: any) {
      dirty.markError(err.response?.data?.error?.message)
      throw err
    } finally {
      saving.value = false
    }
  }

  async function fetchOpeningBalance() {
    loading.value = true
    try {
      const response = await api.get<OpeningBalanceComputed>(`${basePath()}/opening-balance`)
      openingBalanceComputed.value = response.data
      openingBalance.value = response.data
    } catch (err: any) {
      // 404 = record doesn't exist yet; leave as null (not an error)
      // The interceptor logs unexpected status codes; suppress debug-level noise here.
      devlog.debug('[settings] opening balance not yet configured, status:', err.response?.status)
    } finally {
      loading.value = false
    }
  }

  async function updateOpeningBalance(data: Partial<OpeningBalance>) {
    if (saving.value) return openingBalanceComputed.value
    saving.value = true
    dirty.markSaving()
    try {
      const response = await api.put<OpeningBalanceComputed>(`${basePath()}/opening-balance`, data)
      openingBalanceComputed.value = response.data
      openingBalance.value = response.data
      dirty.markClean()
      return response.data
    } catch (err: any) {
      dirty.markError(err.response?.data?.error?.message)
      throw err
    } finally {
      saving.value = false
    }
  }

  async function fetchWcConfig() {
    loading.value = true
    try {
      const response = await api.get<WorkingCapitalConfig>(`${basePath()}/wc-config`)
      wcConfig.value = response.data
    } catch (err: any) {
      // 404 = record doesn't exist yet; leave as null (not an error)
      devlog.debug('[settings] WC config not yet configured, status:', err.response?.status)
    } finally {
      loading.value = false
    }
  }

  async function updateWcConfig(data: Partial<WorkingCapitalConfig>) {
    if (saving.value) return wcConfig.value
    saving.value = true
    dirty.markSaving()
    try {
      const response = await api.put<WorkingCapitalConfig>(`${basePath()}/wc-config`, data)
      wcConfig.value = response.data
      dirty.markClean()
      return response.data
    } catch (err: any) {
      dirty.markError(err.response?.data?.error?.message)
      throw err
    } finally {
      saving.value = false
    }
  }

  async function fetchOpexPerHire() {
    loading.value = true
    try {
      const response = await api.get<OpexPerHire>(`${basePath()}/opex-per-hire`)
      opexPerHire.value = response.data
    } catch (err: any) {
      // 404 = record doesn't exist yet; leave as null (not an error)
      devlog.debug('[settings] opex-per-hire not yet configured, status:', err.response?.status)
    } finally {
      loading.value = false
    }
  }

  async function updateOpexPerHire(data: Partial<OpexPerHire>) {
    if (saving.value) return
    saving.value = true
    dirty.markSaving()
    try {
      await api.put(`${basePath()}/opex-per-hire`, data)
      await fetchOpexPerHire()
      dirty.markClean()
    } catch (err: any) {
      dirty.markError(err.response?.data?.error?.message)
      throw err
    } finally {
      saving.value = false
    }
  }

  async function fetchAll() {
    await Promise.allSettled([fetchConfig(), fetchOpeningBalance(), fetchWcConfig(), fetchOpexPerHire()])
  }

  function $reset() {
    config.value = null
    configComputed.value = null
    openingBalance.value = null
    openingBalanceComputed.value = null
    wcConfig.value = null
    opexPerHire.value = null
    saving.value = false
    error.value = null
  }

  return {
    config,
    configComputed,
    openingBalance,
    openingBalanceComputed,
    wcConfig,
    opexPerHire,
    loading,
    saving,
    error,
    dirty,
    fetchConfig,
    updateConfig,
    fetchOpeningBalance,
    updateOpeningBalance,
    fetchWcConfig,
    updateWcConfig,
    fetchOpexPerHire,
    updateOpexPerHire,
    fetchAll,
    $reset,
  }
})
