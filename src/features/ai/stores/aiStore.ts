import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/composables/useApi'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import { useAuth } from '@/composables/useAuth'
import type {
  NarrationContext,
  NarrationOutput,
  AIFeatureResponse,
  NarrationType,
  NarrationUserRole,
} from '@/features/ai/types'

export const useAIStore = defineStore('ai', () => {
  // ── State ──────────────────────────────────────────────────────
  const narration = ref<NarrationOutput | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ── Base path ──────────────────────────────────────────────────
  function aiBase(): string {
    const planStore = usePlanStore()
    const scenarioStore = useScenarioStore()
    const planId = planStore.activePlan?.id
    const scenarioId = scenarioStore.activeScenario?.id
    if (!planId || !scenarioId) throw new Error('No active plan/scenario')
    return `/api/v1/plans/${planId}/scenarios/${scenarioId}/ai`
  }

  // ── Role mapping ───────────────────────────────────────────────
  // Maps the app's auth role to the backend narration role.
  function resolveRole(): NarrationUserRole {
    const { user } = useAuth()
    const role = user.value?.role ?? 'viewer'
    if (role === 'admin') return 'admin'
    if (role === 'owner') return 'owner'
    if (role === 'user') return 'user'
    return 'viewer'
  }

  // ── Context builder ────────────────────────────────────────────
  // Builds a minimal NarrationContext from currently loaded plan/scenario data.
  // Pro/Enterprise callers can spread additional fields on top before calling
  // fetchNarration().
  function buildBaseContext(): NarrationContext {
    const planStore = usePlanStore()
    const scenarioStore = useScenarioStore()

    const plan = planStore.activePlan
    const scenario = scenarioStore.activeScenario

    return {
      plan_name: plan?.name ?? 'Financial Plan',
      scenario_name: scenario?.name ?? 'Base Scenario',
      period_label: '',   // enriched by callers when available
      currency: 'EUR',    // enriched by callers when available
      user_role: resolveRole(),
    }
  }

  // ── API actions ────────────────────────────────────────────────

  /**
   * Generic narration fetch. Sends `context` to the given AI endpoint and
   * stores the result. Each Pro/Enterprise endpoint overrides narration_type
   * server-side, so passing it in the context is optional but recommended for
   * client-side clarity.
   */
  async function fetchNarration(
    endpoint: string,
    extraContext: Partial<NarrationContext> = {},
  ): Promise<void> {
    loading.value = true
    error.value = null
    narration.value = null

    try {
      const context: NarrationContext = {
        ...buildBaseContext(),
        ...extraContext,
      }

      const res = await api.post<AIFeatureResponse>(`${aiBase()}/${endpoint}`, { context })
      narration.value = res.data.narration
    } catch (err: any) {
      error.value = err.response?.data?.error?.message ?? 'AI narration failed'
    } finally {
      loading.value = false
    }
  }

  /** Convenience wrappers — one per endpoint. */
  function fetchPlanNarration(narratType?: NarrationType) {
    return fetchNarration('narrate', narratType ? { narration_type: narratType } : {})
  }

  function fetchUnitEconomics() {
    return fetchNarration('unit-economics')
  }

  function fetchAssumptionReview() {
    return fetchNarration('assumption-review')
  }

  function fetchBenchmarkCommentary() {
    return fetchNarration('benchmark-commentary')
  }

  function fetchPortfolioMix() {
    return fetchNarration('portfolio-mix')
  }

  function fetchDriverAdvisor() {
    return fetchNarration('driver-advisor')
  }

  function fetchScenarioSuggestion(scenarioType?: string) {
    return fetchNarration('scenario-suggestion', scenarioType ? { scenario_type: scenarioType } : {})
  }

  function fetchSensitivityNarrative() {
    return fetchNarration('sensitivity-narrative')
  }

  function fetchInvestorMemo() {
    return fetchNarration('investor-memo')
  }

  function reset() {
    narration.value = null
    error.value = null
    loading.value = false
  }

  return {
    narration,
    loading,
    error,
    buildBaseContext,
    fetchNarration,
    fetchPlanNarration,
    fetchUnitEconomics,
    fetchAssumptionReview,
    fetchBenchmarkCommentary,
    fetchPortfolioMix,
    fetchDriverAdvisor,
    fetchScenarioSuggestion,
    fetchSensitivityNarrative,
    fetchInvestorMemo,
    reset,
  }
})
