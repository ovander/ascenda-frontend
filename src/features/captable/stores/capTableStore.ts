import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Shareholder, CapTableSummary, ShareholderType } from '@/types'
import api from '@/composables/useApi'
import { usePlanStore } from '@/features/plans/stores/planStore'

export const useCapTableStore = defineStore('capTable', () => {
  const summary = ref<CapTableSummary | null>(null)
  const loading = ref(false)
  /** True while a create/update/delete request is in-flight (duplicate-submit guard). */
  const saving = ref(false)
  const error = ref<string | null>(null)

  function basePath(): string {
    const planStore = usePlanStore()
    const planId = planStore.activePlan?.id
    if (!planId) throw new Error('No active plan')
    return `/api/v1/plans/${planId}/cap-table`
  }

  async function fetchSummary() {
    loading.value = true
    error.value = null
    try {
      const res = await api.get<CapTableSummary>(basePath())
      summary.value = res.data
    } catch (err: any) {
      error.value = (err.response?.data?.error?.message || err.response?.data?.message) ?? 'Failed to load cap table'
    } finally {
      loading.value = false
    }
  }

  async function createShareholder(data: {
    name: string
    type: ShareholderType
    shares: number
    ownershipPct: string
    investedAmount: string
    notes?: string
  }): Promise<Shareholder | null> {
    if (saving.value) return null
    saving.value = true
    try {
      const res = await api.post<Shareholder>(`${basePath()}/shareholders`, data)
      await fetchSummary()
      return res.data
    } catch (err: any) {
      error.value = (err.response?.data?.error?.message || err.response?.data?.message) ?? 'Failed to add shareholder'
      return null
    } finally {
      saving.value = false
    }
  }

  async function updateShareholder(id: string, data: Partial<Shareholder>): Promise<boolean> {
    if (saving.value) return false
    saving.value = true
    try {
      await api.put(`${basePath()}/shareholders/${id}`, data)
      await fetchSummary()
      return true
    } catch (err: any) {
      error.value = (err.response?.data?.error?.message || err.response?.data?.message) ?? 'Failed to update shareholder'
      return false
    } finally {
      saving.value = false
    }
  }

  async function deleteShareholder(id: string): Promise<boolean> {
    if (saving.value) return false
    saving.value = true
    try {
      await api.delete(`${basePath()}/shareholders/${id}`)
      await fetchSummary()
      return true
    } catch (err: any) {
      error.value = (err.response?.data?.error?.message || err.response?.data?.message) ?? 'Failed to delete shareholder'
      return false
    } finally {
      saving.value = false
    }
  }

  function $reset() {
    summary.value = null
    saving.value = false
    error.value = null
  }

  return {
    summary,
    loading,
    saving,
    error,
    fetchSummary,
    createShareholder,
    updateShareholder,
    deleteShareholder,
    $reset,
  }
})
