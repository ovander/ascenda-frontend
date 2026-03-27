import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Plan } from '@/types'
import api from '@/composables/useApi'

export const usePlanStore = defineStore('plans', () => {
  // E2E hook: Playwright seeds window.__E2E_PLAN_CTX__ via addInitScript so
  // activePlan survives page.goto() calls in scenario-scoped tests.
  const _e2e = typeof window !== 'undefined' ? (window as any).__E2E_PLAN_CTX__ : undefined
  const plans = ref<Plan[]>(_e2e?.plan ? [_e2e.plan] : [])
  const activePlan = ref<Plan | null>(_e2e?.plan ?? null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchPlans() {
    loading.value = true
    error.value = null
    try {
      const response = await api.get<{ data: Plan[] } | Plan[]>('/api/v1/plans/')
      // Backend may return paginated {data: [], total, page, limit} or plain array
      const body = response.data
      plans.value = Array.isArray(body) ? body : (body.data ?? [])
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch plans'
    } finally {
      loading.value = false
    }
  }

  async function fetchPlan(id: string) {
    loading.value = true
    try {
      const response = await api.get<Plan>(`/api/v1/plans/${id}`)
      activePlan.value = response.data
      return response.data
    } finally {
      loading.value = false
    }
  }

  async function createPlan(data: { name: string; description: string; country?: string }) {
    const response = await api.post<Plan>('/api/v1/plans/', data)
    plans.value.push(response.data)
    activePlan.value = response.data
    return response.data
  }

  async function updatePlan(id: string, data: Partial<Plan>) {
    const response = await api.put<Plan>(`/api/v1/plans/${id}`, data)
    const idx = plans.value.findIndex((p) => p.id === id)
    if (idx !== -1) plans.value[idx] = response.data
    if (activePlan.value?.id === id) activePlan.value = response.data
    return response.data
  }

  async function deletePlan(id: string) {
    await api.delete(`/api/v1/plans/${id}`)
    plans.value = plans.value.filter((p) => p.id !== id)
    if (activePlan.value?.id === id) activePlan.value = null
  }

  async function resetDemoPlans() {
    await api.post('/api/v1/plans/reset-demo', {})
    await fetchPlans()
  }

  function setActive(plan: Plan) {
    activePlan.value = plan
  }

  // ── Lifecycle transitions ──────────────────────────────────────────────────

  async function lockPlan(id: string) {
    await api.post(`/api/v1/plans/${id}/lock`)
    await fetchPlan(id)
  }

  async function unlockPlan(id: string) {
    await api.post(`/api/v1/plans/${id}/unlock`)
    await fetchPlan(id)
  }

  async function archivePlan(id: string) {
    await api.post(`/api/v1/plans/${id}/archive`)
    plans.value = plans.value.filter((p) => p.id !== id)
    if (activePlan.value?.id === id) activePlan.value = null
  }

  // ── Impact queries ─────────────────────────────────────────────────────────

  async function getPlanImpact(id: string) {
    const response = await api.get<{
      planId: string
      planName: string
      planStatus: string
      scenarioCount: number
      isDemo: boolean
      canDelete: boolean
      blockedReason?: string
    }>(`/api/v1/plans/${id}/impact`)
    return response.data
  }

  async function getScenarioImpact(planId: string, scenarioId: string) {
    const response = await api.get<{
      scenarioId: string
      scenarioName: string
      isDefault: boolean
      isLastInPlan: boolean
      canDelete: boolean
      blockedReason?: string
    }>(`/api/v1/plans/${planId}/scenarios/${scenarioId}/impact`)
    return response.data
  }

  return {
    plans,
    activePlan,
    loading,
    error,
    fetchPlans,
    fetchPlan,
    createPlan,
    updatePlan,
    deletePlan,
    resetDemoPlans,
    setActive,
    lockPlan,
    unlockPlan,
    archivePlan,
    getPlanImpact,
    getScenarioImpact,
  }
})
