import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Scenario } from '@/types'
import api from '@/composables/useApi'

export const useScenarioStore = defineStore('scenarios', () => {
  // E2E hook: Playwright seeds window.__E2E_PLAN_CTX__ via addInitScript so
  // activeScenario survives page.goto() calls in scenario-scoped tests.
  const _e2e = typeof window !== 'undefined' ? (window as any).__E2E_PLAN_CTX__ : undefined
  const scenarios = ref<Scenario[]>(_e2e?.scenario ? [_e2e.scenario] : [])
  const activeScenario = ref<Scenario | null>(_e2e?.scenario ?? null)
  const loading = ref(false)

  function basePath(planId: string) {
    return `/api/v1/plans/${planId}/scenarios`
  }

  async function fetchScenarios(planId: string) {
    loading.value = true
    try {
      const response = await api.get<Scenario[]>(`${basePath(planId)}/`)
      scenarios.value = response.data
    } finally {
      loading.value = false
    }
  }

  async function fetchScenario(planId: string, scenarioId: string) {
    loading.value = true
    try {
      const response = await api.get<Scenario>(`${basePath(planId)}/${scenarioId}`)
      activeScenario.value = response.data
      return response.data
    } finally {
      loading.value = false
    }
  }

  async function createScenario(planId: string, data: { name: string; description: string }) {
    const response = await api.post<Scenario>(`${basePath(planId)}/`, data)
    scenarios.value.push(response.data)
    return response.data
  }

  async function updateScenario(planId: string, id: string, data: Partial<Scenario>) {
    const response = await api.put<Scenario>(`${basePath(planId)}/${id}`, data)
    const idx = scenarios.value.findIndex((s) => s.id === id)
    if (idx !== -1) scenarios.value[idx] = response.data
    if (activeScenario.value?.id === id) activeScenario.value = response.data
    return response.data
  }

  async function deleteScenario(planId: string, id: string) {
    await api.delete(`${basePath(planId)}/${id}`)
    scenarios.value = scenarios.value.filter((s) => s.id !== id)
    if (activeScenario.value?.id === id) activeScenario.value = null
  }

  async function cloneScenario(planId: string, id: string) {
    const response = await api.post<Scenario>(`${basePath(planId)}/${id}/clone`)
    scenarios.value.push(response.data)
    return response.data
  }

  function setActive(scenario: Scenario) {
    activeScenario.value = scenario
  }

  return {
    scenarios,
    activeScenario,
    loading,
    fetchScenarios,
    fetchScenario,
    createScenario,
    updateScenario,
    deleteScenario,
    cloneScenario,
    setActive,
  }
})
