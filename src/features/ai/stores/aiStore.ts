import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAIApi } from '@/composables/useApi'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import { useReportStore } from '@/features/report/stores/reportStore'
import { useSettingsStore } from '@/features/settings/stores/settingsStore'
import { useProductStore } from '@/features/products/stores/productStore'
import { useAuth } from '@/composables/useAuth'
import type {
  NarrationContext,
  NarrationOutput,
  AIFeatureResponse,
  NarrationType,
  NarrationUserRole,
  FinancialMetric,
  ProductEconomics,
} from '@/features/ai/types'
import type {
  Product,
  DriverParams,
  SaaSParams,
  ConsultingParams,
  IndustryParams,
  MarketplaceParams,
  MediaParams,
  SessionBasedParams,
  CompetitionParams,
  ContractParams,
} from '@/types'

// ── Driver context helpers ──────────────────────────────────────────────────

/** Returns key KPI metrics extracted from a product's driver params. */
function driverMetrics(driverType: string, params: DriverParams, currency: string): FinancialMetric[] {
  if (!params) return []
  const metrics: FinancialMetric[] = []

  // Build a Y1–Y5 note string from an array of values.
  const toSeries = (arr: (string | number)[]): string =>
    arr.map((v, i) => `Y${i + 1}: ${v}`).join(' | ')
  // Parse the last (most forward-looking) year value as a number.
  const lastNum = (arr: (string | number)[]): number =>
    parseFloat(String(arr[arr.length - 1] ?? arr[0] ?? 0)) || 0

  switch (driverType) {
    case 'saas': {
      const p = params as SaaSParams
      metrics.push({ label: 'Active Users (Y5)', value: p.activeUsers[4] ?? p.activeUsers[0], note: toSeries(p.activeUsers) })
      metrics.push({ label: 'Monthly Fee', value: lastNum(p.monthlyFee), currency, note: toSeries(p.monthlyFee) })
      if (p.churnRate) metrics.push({ label: 'Churn Rate', value: lastNum(p.churnRate), unit: '%' })
      if (p.expansionRate) metrics.push({ label: 'Expansion Rate', value: lastNum(p.expansionRate), unit: '%' })
      break
    }
    case 'consulting': {
      const p = params as ConsultingParams
      metrics.push({ label: 'Headcount (Y5)', value: lastNum(p.headcount), note: toSeries(p.headcount) })
      metrics.push({ label: 'Utilization Rate', value: lastNum(p.utilizationRate), unit: '%' })
      metrics.push({ label: 'Monthly Gross', value: lastNum(p.monthlyGross), currency, note: toSeries(p.monthlyGross) })
      break
    }
    case 'marketplace': {
      const p = params as MarketplaceParams
      metrics.push({ label: 'Transactions (Y5)', value: p.transactions[4] ?? p.transactions[0], note: toSeries(p.transactions) })
      metrics.push({ label: 'GMV per Transaction', value: lastNum(p.gmvPerTransaction), currency })
      metrics.push({ label: 'Take Rate', value: lastNum(p.takeRate), unit: '%' })
      break
    }
    case 'media': {
      const p = params as MediaParams
      metrics.push({ label: 'Impressions (Y5)', value: p.impressions[4] ?? p.impressions[0], note: toSeries(p.impressions) })
      metrics.push({ label: 'CPM', value: lastNum(p.cpm), currency })
      metrics.push({ label: 'Fill Rate', value: lastNum(p.fillRate), unit: '%' })
      break
    }
    case 'industry': {
      const p = params as IndustryParams
      metrics.push({ label: 'Production Capacity (Y5)', value: p.productionCapacity[4] ?? p.productionCapacity[0], note: toSeries(p.productionCapacity) })
      metrics.push({ label: 'Scrap Rate', value: lastNum(p.scrapRate), unit: '%' })
      break
    }
    case 'competition': {
      const p = params as CompetitionParams
      metrics.push({ label: 'Events Played (Y5)', value: p.events[4] ?? p.events[0], note: toSeries(p.events) })
      metrics.push({ label: 'Cuts Made (Y5)', value: p.cuts[4] ?? p.cuts[0], note: toSeries(p.cuts) })
      metrics.push({ label: 'Wins (Y5)', value: p.wins[4] ?? p.wins[0], note: toSeries(p.wins) })
      metrics.push({ label: 'Prize per Win', value: lastNum(p.prizePerWin), currency, note: p.circuit[4] ?? '' })
      break
    }
    case 'contract': {
      const p = params as ContractParams
      const perYear = [0, 1, 2, 3, 4].map((y) =>
        p.contracts.reduce((sum, c) => sum + (parseFloat(String(c.amounts[y] ?? 0)) || 0), 0))
      metrics.push({ label: 'Contracts', value: p.contracts.length })
      metrics.push({ label: 'Contract Value (Y5)', value: perYear[4] ?? 0, currency, note: toSeries(perYear) })
      break
    }
    case 'session_based': {
      const p = params as SessionBasedParams
      metrics.push({ label: 'Sessions (Y5)', value: p.sessions[4] ?? p.sessions[0], note: toSeries(p.sessions) })
      metrics.push({ label: 'Price per Participant', value: lastNum(p.pricePerParticipant), currency })
      metrics.push({ label: 'Fill Rate', value: lastNum(p.fillRate), unit: '%' })
      break
    }
  }

  return metrics
}

/**
 * Derives the dominant (most-used) non-generic driver type across products.
 * Returns undefined when all products use the generic driver.
 */
function derivePrimaryDriverType(products: Product[]): string | undefined {
  const counts: Record<string, number> = {}
  for (const p of products) {
    if (p.driverType && p.driverType !== 'generic') {
      counts[p.driverType] = (counts[p.driverType] ?? 0) + 1
    }
  }
  const entries = Object.entries(counts)
  if (entries.length === 0) return undefined
  return entries.reduce((a, b) => (a[1] >= b[1] ? a : b))[0]
}

/** Builds the product_economics array for non-generic products. */
function buildProductEconomics(products: Product[], currency: string): ProductEconomics[] {
  return products
    .filter((p) => p.driverType && p.driverType !== 'generic' && p.driverParams != null)
    .map((p) => ({
      product_name: p.name,
      driver_type: p.driverType,
      metrics: driverMetrics(p.driverType, p.driverParams!, currency),
      driver_params: p.driverParams as unknown as Record<string, unknown>,
    }))
}

// ─────────────────────────────────────────────────────────────────────────────

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
    return 'viewer'
  }

  // ── Context builder ────────────────────────────────────────────
  // Builds a NarrationContext enriched with actual P&L metrics from the
  // report store and driver economics from the product store.
  // Requires that fetchFullReport() and fetchProducts() have already been
  // called (or the cache is warm) — fetchNarration() ensures this.
  function buildBaseContext(): NarrationContext {
    const planStore = usePlanStore()
    const scenarioStore = useScenarioStore()
    const reportStore = useReportStore()
    const settingsStore = useSettingsStore()
    const productStore = useProductStore()

    const plan = planStore.activePlan
    const scenario = scenarioStore.activeScenario
    const pnlYears = reportStore.fullReport?.pnl?.years ?? []
    const currency = settingsStore.config?.currency ?? 'EUR'
    const language = settingsStore.config?.language ?? 'fr'

    // Period label: "FY 2024–2027" derived from the forecast year range.
    const yearNums = pnlYears.map((y) => y.year)
    const periodLabel =
      yearNums.length > 0
        ? `FY ${yearNums[0]}–${yearNums[yearNums.length - 1]}`
        : ''

    // Use the last forecast year as the primary metric value (most forward-
    // looking). Include the full multi-year time-series in the note so the
    // AI model has trend context without needing extra round-trips.
    const lastYear = pnlYears[pnlYears.length - 1]

    function toMetric(
      label: string,
      value: number | undefined,
      note?: string,
    ): FinancialMetric | undefined {
      if (value == null) return undefined
      return { label, value, currency, note }
    }

    const revenueNote = pnlYears.map((y) => `${y.year}: ${y.sales}`).join(' | ')
    const ebitdaNote = pnlYears.map((y) => `${y.year}: ${y.ebitda}`).join(' | ')
    const netIncomeNote = pnlYears.map((y) => `${y.year}: ${y.netProfit}`).join(' | ')
    const cashNote = pnlYears.map((y) => `${y.year}: ${y.cashFlow}`).join(' | ')

    // ── Business driver context ────────────────────────────────
    // All AI features require Pro plan minimum, so product driver data is
    // always available. Feed the dominant driver type and per-product
    // economics to give the AI model driver-specific benchmark context.
    const products = productStore.products
    const primaryDriverType = derivePrimaryDriverType(products)
    const productEconomics = buildProductEconomics(products, currency)

    return {
      plan_name: plan?.name ?? 'Financial Plan',
      scenario_name: scenario?.name ?? 'Base Scenario',
      period_label: periodLabel,
      currency,
      language,
      user_role: resolveRole(),
      revenue: toMetric('Revenue', lastYear?.sales, revenueNote),
      ebitda: toMetric('EBITDA', lastYear?.ebitda, ebitdaNote),
      net_income: toMetric('Net Income', lastYear?.netProfit, netIncomeNote),
      cash_position: toMetric('Cash Flow', lastYear?.cashFlow, cashNote),
      // Driver context (undefined when all products use the generic driver)
      ...(primaryDriverType && { primary_driver_type: primaryDriverType }),
      ...(productEconomics.length > 0 && { product_economics: productEconomics }),
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
      // Pre-warm the report and product caches so buildBaseContext() has
      // both P&L metrics and driver economics. Failures are swallowed —
      // the AI call still proceeds with whatever context is available.
      const reportStore = useReportStore()
      const productStore = useProductStore()
      await Promise.allSettled([
        reportStore.fetchFullReport(),
        // Only fetch products if not already loaded to avoid redundant calls.
        productStore.products.length === 0 ? productStore.fetchProducts() : Promise.resolve(),
      ])

      const context: NarrationContext = {
        ...buildBaseContext(),
        ...extraContext,
      }

      const res = await useAIApi().post<AIFeatureResponse>(`${aiBase()}/${endpoint}`, { context })
      narration.value = res.data.narration
    } catch (err: any) {
      // No HTTP response at all (e.g. ERR_EMPTY_RESPONSE / Go panic / timeout):
      // err.response is undefined but err.request was sent — backend crashed.
      if (!err.response) {
        error.value = 'AI service is temporarily unavailable. Please try again later.'
      } else {
        error.value = err.response?.data?.error?.message ?? 'AI narration failed'
      }
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
