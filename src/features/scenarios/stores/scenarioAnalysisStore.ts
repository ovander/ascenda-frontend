import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAIApi } from '@/composables/useApi'
import type { ScenarioAnalysisResult } from '@/features/scenarios/types'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

interface CacheEntry {
  result: ScenarioAnalysisResult
  fetchedAt: number
}

export const useScenarioAnalysisStore = defineStore('scenarioAnalysis', () => {
  const cache = ref<Map<string, CacheEntry>>(new Map())
  const loadingIds = ref<Set<string>>(new Set())
  const errors = ref<Map<string, string>>(new Map())

  function getCacheKey(planId: string, scenarioId: string): string {
    return `${planId}:${scenarioId}`
  }

  function getAnalysis(planId: string, scenarioId: string): ScenarioAnalysisResult | null {
    const entry = cache.value.get(getCacheKey(planId, scenarioId))
    if (!entry) return null
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
      cache.value.delete(getCacheKey(planId, scenarioId))
      return null
    }
    return entry.result
  }

  function isLoading(planId: string, scenarioId: string): boolean {
    return loadingIds.value.has(getCacheKey(planId, scenarioId))
  }

  function getError(planId: string, scenarioId: string): string | null {
    return errors.value.get(getCacheKey(planId, scenarioId)) ?? null
  }

  async function fetchIfNeeded(planId: string, scenarioId: string): Promise<void> {
    const key = getCacheKey(planId, scenarioId)
    // Cache hit — skip
    const existing = cache.value.get(key)
    if (existing && Date.now() - existing.fetchedAt <= CACHE_TTL_MS) return
    // Already in-flight
    if (loadingIds.value.has(key)) return

    loadingIds.value.add(key)
    errors.value.delete(key)
    const aiApi = useAIApi()
    try {
      const res = await aiApi.get<ScenarioAnalysisResult>(
        `/api/v1/plans/${planId}/scenarios/${scenarioId}/analysis`,
      )
      cache.value.set(key, { result: res.data, fetchedAt: Date.now() })
    } catch (e: any) {
      errors.value.set(key, e?.response?.data?.message ?? 'Analysis unavailable')
    } finally {
      loadingIds.value.delete(key)
    }
  }

  function invalidate(scenarioId: string): void {
    for (const key of cache.value.keys()) {
      if (key.endsWith(`:${scenarioId}`)) {
        cache.value.delete(key)
      }
    }
  }

  function reset(): void {
    cache.value.clear()
    loadingIds.value.clear()
    errors.value.clear()
  }

  return { getAnalysis, isLoading, getError, fetchIfNeeded, invalidate, reset }
})
