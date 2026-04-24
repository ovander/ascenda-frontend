import { ref } from 'vue'
import { useAIApi } from '@/composables/useApi'
import type { ScenarioAnalysisResult } from '@/features/scenarios/types'

/**
 * useScenarioAnalysis — fetches ScenarioAnalysis v2 from the dedicated endpoint.
 *
 * Design decisions:
 *
 * 1. NOT a Pinia store — analysis is scoped to a single (planId, scenarioId)
 *    pair and is always fetched fresh when the component mounts. A global store
 *    would cache stale results across scenario navigations.
 *
 * 2. Uses useAIApi() (120 s timeout) because the endpoint is LLM-backed and can
 *    take longer than the default 5 s axios timeout.
 *
 * 3. Errors are captured in `error` but do NOT throw — callers wrap this in
 *    Promise.allSettled so a failed analysis never blocks the dashboard render.
 *
 * Usage:
 *   const { analysis, loading, error, fetch, reset } = useScenarioAnalysis()
 *   await fetch(planId, scenarioId)   // safe inside Promise.allSettled
 */
export function useScenarioAnalysis() {
  // Create one AI API instance per composable invocation (not per request).
  const aiApi = useAIApi()

  const analysis = ref<ScenarioAnalysisResult | null>(null)
  const loading  = ref(false)
  const error    = ref<string | null>(null)

  async function fetch(planId: string, scenarioId: string): Promise<void> {
    loading.value = true
    error.value   = null
    try {
      const res = await aiApi.get<ScenarioAnalysisResult>(
        `/api/v1/plans/${planId}/scenarios/${scenarioId}/analysis`,
      )
      analysis.value = res.data
    } catch (e: any) {
      // Silently capture — callers decide whether to surface this.
      error.value = e?.response?.data?.message ?? 'Analysis unavailable'
    } finally {
      loading.value = false
    }
  }

  function reset(): void {
    analysis.value = null
    error.value    = null
    loading.value  = false
  }

  return { analysis, loading, error, fetch, reset }
}
