import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { StaffHeadcount, StaffSalary, StaffIncentive, StaffPayrollSummary } from '@/types'
import api from '@/composables/useApi'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import { useDirtyState } from '@/composables/useDirtyState'

export const useStaffStore = defineStore('staff', () => {
  const headcounts = ref<StaffHeadcount[]>([])
  const salaries = ref<StaffSalary[]>([])
  const incentives = ref<StaffIncentive[]>([])
  const payrollSummary = ref<StaffPayrollSummary | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const dirty = useDirtyState('staff')

  function basePath() {
    const planStore = usePlanStore()
    const scenarioStore = useScenarioStore()
    const planId = planStore.activePlan?.id
    const scenarioId = scenarioStore.activeScenario?.id
    if (!planId || !scenarioId) throw new Error('No active plan/scenario')
    return `/api/v1/plans/${planId}/scenarios/${scenarioId}/staff`
  }

  async function fetchHeadcounts() {
    loading.value = true
    error.value = null
    try {
      const response = await api.get<StaffHeadcount[]>(`${basePath()}/headcounts`)
      headcounts.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch headcounts'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateHeadcounts(data: Partial<StaffHeadcount>[]) {
    dirty.markSaving()
    try {
      await api.put(`${basePath()}/headcounts`, data)
      // Optimistic local merge — avoid a full re-fetch that would destroy input focus
      for (const updated of data) {
        const idx = headcounts.value.findIndex(
          h => h.category === updated.category && h.yearIndex === updated.yearIndex
        )
        if (idx !== -1) {
          headcounts.value[idx] = { ...headcounts.value[idx], ...updated } as StaffHeadcount
        } else if (updated.category != null && updated.yearIndex != null) {
          headcounts.value.push(updated as StaffHeadcount)
        }
      }
      dirty.markClean()
      // Background refresh of payroll summary so Payroll Summary tab and Graphs stay current
      fetchPayrollSummary(true).catch(() => {})
    } catch (err: any) {
      dirty.markError(err.response?.data?.error?.message)
      throw err
    }
  }

  async function fetchSalaries() {
    loading.value = true
    error.value = null
    try {
      const response = await api.get<StaffSalary[]>(`${basePath()}/salaries`)
      salaries.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch salaries'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateSalaries(data: Partial<StaffSalary>[]) {
    dirty.markSaving()
    try {
      await api.put(`${basePath()}/salaries`, data)
      // Optimistic local merge — avoid a full re-fetch that would destroy input focus
      for (const updated of data) {
        const idx = salaries.value.findIndex(
          s => s.category === updated.category && s.yearIndex === updated.yearIndex
        )
        if (idx !== -1) {
          salaries.value[idx] = { ...salaries.value[idx], ...updated } as StaffSalary
        } else if (updated.category != null && updated.yearIndex != null) {
          salaries.value.push(updated as StaffSalary)
        }
      }
      dirty.markClean()
      // Background refresh of payroll summary so Payroll Summary tab and Graphs stay current
      fetchPayrollSummary(true).catch(() => {})
    } catch (err: any) {
      dirty.markError(err.response?.data?.error?.message)
      throw err
    }
  }

  async function fetchIncentives() {
    loading.value = true
    error.value = null
    try {
      const response = await api.get<StaffIncentive[]>(`${basePath()}/incentives`)
      incentives.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch incentives'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateIncentives(data: Partial<StaffIncentive>[]) {
    dirty.markSaving()
    try {
      await api.put(`${basePath()}/incentives`, data)
      // Optimistic local merge — avoid a full re-fetch that would destroy input focus
      for (const updated of data) {
        const idx = incentives.value.findIndex(inc => inc.yearIndex === updated.yearIndex)
        if (idx !== -1) {
          incentives.value[idx] = { ...incentives.value[idx], ...updated } as StaffIncentive
        } else if (updated.yearIndex != null) {
          incentives.value.push(updated as StaffIncentive)
        }
      }
      dirty.markClean()
      // Background refresh of payroll summary so Payroll Summary tab and Graphs stay current
      fetchPayrollSummary(true).catch(() => {})
    } catch (err: any) {
      dirty.markError(err.response?.data?.error?.message)
      throw err
    }
  }

  async function fetchPayrollSummary(silent = false) {
    if (!silent) loading.value = true
    error.value = null
    try {
      const response = await api.get<StaffPayrollSummary>(`${basePath()}/summary`)
      payrollSummary.value = response.data
    } catch (err: any) {
      if (!silent) error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch payroll summary'
      throw err
    } finally {
      if (!silent) loading.value = false
    }
  }

  async function fetchAll() {
    await Promise.allSettled([fetchHeadcounts(), fetchSalaries(), fetchIncentives(), fetchPayrollSummary()])
  }

  function $reset() {
    headcounts.value = []
    salaries.value = []
    incentives.value = []
    payrollSummary.value = null
    error.value = null
  }

  return {
    headcounts,
    salaries,
    incentives,
    payrollSummary,
    loading,
    error,
    dirty,
    fetchHeadcounts,
    updateHeadcounts,
    fetchSalaries,
    updateSalaries,
    fetchIncentives,
    updateIncentives,
    fetchPayrollSummary,
    fetchAll,
    $reset,
  }
})
