import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { BudgetMonthlyOverride, Budget1Report, Budget2Report, Budget2View } from '@/types'
import api from '@/composables/useApi'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import { DEBOUNCE_MS } from '@/utils/constants'
import { debounce } from '@/utils/format'

export const useBudgetStore = defineStore('budget', () => {
  const overrides = ref<BudgetMonthlyOverride[]>([])
  const budget1Report = ref<Budget1Report | null>(null)
  const budget2Report = ref<Budget2Report | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  function basePath() {
    const planStore = usePlanStore()
    const scenarioStore = useScenarioStore()
    const planId = planStore.activePlan?.id
    const scenarioId = scenarioStore.activeScenario?.id
    if (!planId || !scenarioId) throw new Error('No active plan/scenario')
    return `/api/v1/plans/${planId}/scenarios/${scenarioId}/budget`
  }

  async function fetchOverrides() {
    loading.value = true
    error.value = null
    try {
      // ListOverrides returns PagedResponse { data: [...], total, page, limit }
      // Use `any` to safely unwrap regardless of how many data levels are present
      const response = await api.get<any>(`${basePath()}/`)
      const body = response.data
      // Normalise: body may be the PagedResponse object or (edge-case) already the array
      const items: BudgetMonthlyOverride[] = Array.isArray(body)
        ? body
        : Array.isArray(body?.data)
          ? body.data
          : []
      overrides.value = items
      return overrides.value
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch budget overrides'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateOverrides(data: BudgetMonthlyOverride[]) {
    try {
      const response = await api.put<BudgetMonthlyOverride[]>(`${basePath()}/`, data)
      overrides.value = response.data
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update budget overrides'
      throw err
    }
  }

  async function fetchBudget1() {
    loading.value = true
    error.value = null
    try {
      const response = await api.get<Budget1Report>(`${basePath()}/year1`)
      budget1Report.value = response.data
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch year 1 budget'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchBudget2() {
    loading.value = true
    error.value = null
    try {
      const response = await api.get<Budget2Report>(`${basePath()}/year2`)
      budget2Report.value = response.data
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch year 2 budget'
      throw err
    } finally {
      loading.value = false
    }
  }

  const debouncedUpdateOverrides = debounce(
    async (data: BudgetMonthlyOverride[]) => {
      await updateOverrides(data)
    },
    DEBOUNCE_MS
  )

  function $reset() {
    overrides.value = []
    budget1Report.value = null
    budget2Report.value = null
    error.value = null
  }

  return {
    overrides,
    budget1Report,
    budget2Report,
    loading,
    error,
    fetchOverrides,
    updateOverrides,
    debouncedUpdateOverrides,
    fetchBudget1,
    fetchBudget2,
    $reset,
  }
})
