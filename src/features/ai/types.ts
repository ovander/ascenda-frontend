// AI narration feature — TypeScript types mirroring the Go backend models.

// ── Request types ────────────────────────────────────────────────────────────

export interface FinancialMetric {
  label: string
  value: number
  currency?: string
  unit?: string
  note?: string
}

export interface VarianceLine {
  label: string
  budget: number
  actual: number
  variance: number
  variance_pct: number
  favourable: boolean
}

export interface ScenarioSummary {
  scenario_name: string
  revenue?: number
  ebitda?: number
  net_income?: number
  currency?: string
}

export interface ProductEconomics {
  product_name: string
  driver_type: string
  metrics: FinancialMetric[]
  driver_params?: Record<string, unknown>
}

export interface AssumptionFlag {
  product_name: string
  field_name: string
  value: number
  reason: string
}

export interface SensitivityLever {
  lever_name: string
  driver_type: string
  base_value: number
  stress_value: number
  revenue_impact: number
  ebitda_impact: number
  unit?: string
}

export type NarrationType =
  | 'plan_summary'
  | 'variance_analysis'
  | 'scenario_comparison'
  | 'anomaly_detection'
  | 'cash_runway'
  | 'unit_economics'
  | 'assumption_review'
  | 'benchmark_commentary'
  | 'portfolio_mix'
  | 'driver_advisor'
  | 'scenario_suggestion'
  | 'sensitivity_narrative'
  | 'investor_memo'

export type NarrationUserRole = 'admin' | 'owner' | 'user' | 'viewer'

export interface NarrationContext {
  plan_name: string
  scenario_name: string
  period_label: string
  currency: string
  language: 'fr' | 'en'
  user_role: NarrationUserRole
  narration_type?: NarrationType

  // Standard financial metrics
  revenue?: FinancialMetric
  ebitda?: FinancialMetric
  net_income?: FinancialMetric
  variance_lines?: VarianceLine[]
  anomalies?: string[]
  scenarios?: ScenarioSummary[]
  cash_runway_months?: FinancialMetric
  burn_rate?: FinancialMetric
  cash_position?: FinancialMetric

  // Pro driver-aware fields
  primary_driver_type?: string
  product_economics?: ProductEconomics[]
  assumption_flags?: AssumptionFlag[]
  sensitivity_levers?: SensitivityLever[]
  scenario_type?: string
}

export interface AIFeatureRequest {
  context: NarrationContext
}

// ── Response types ───────────────────────────────────────────────────────────

export interface NarrationParagraph {
  content: string
  type: 'info' | 'warning' | 'highlight' | 'risk'
}

export interface NarrationOutput {
  title: string
  summary: string
  paragraphs: NarrationParagraph[]
  key_takeaways: string[]
  is_ai_generated: boolean
  structured_data?: Record<string, unknown>
}

export interface AIFeatureResponse {
  narration: NarrationOutput
}

// ── Feature descriptor ───────────────────────────────────────────────────────

export type AIFeatureTier = 'standard' | 'pro' | 'enterprise'

export interface AIFeatureDef {
  key: string
  /** Stable English label for internal use (gate() modals, tests, admin views). */
  label: string
  /** vue-i18n message key for the localised display label. */
  labelKey: string
  icon: string
  tier: AIFeatureTier
  endpoint: string
  narration_type: NarrationType
  /** Stable English description for internal use. */
  description: string
  /** vue-i18n message key for the localised description. */
  descriptionKey: string
}

export const AI_FEATURES: AIFeatureDef[] = [
  {
    key: 'narrate',
    label: 'AI Narration',
    labelKey: 'ai.features.narrate.label',
    icon: 'pi pi-sparkles',
    tier: 'standard',
    endpoint: 'narrate',
    narration_type: 'plan_summary',
    description: 'AI-powered plain-language summary of your financial plan.',
    descriptionKey: 'ai.features.narrate.description',
  },
  {
    key: 'unit-economics',
    label: 'Unit Economics',
    labelKey: 'ai.features.unit-economics.label',
    icon: 'pi pi-calculator',
    tier: 'pro',
    endpoint: 'unit-economics',
    narration_type: 'unit_economics',
    description: 'Driver-specific KPI narration for each product line.',
    descriptionKey: 'ai.features.unit-economics.description',
  },
  {
    key: 'assumption-review',
    label: 'Assumption Review',
    labelKey: 'ai.features.assumption-review.label',
    icon: 'pi pi-flag',
    tier: 'pro',
    endpoint: 'assumption-review',
    narration_type: 'assumption_review',
    description: 'Red-flag detection on plan inputs vs. industry norms.',
    descriptionKey: 'ai.features.assumption-review.description',
  },
  {
    key: 'benchmark-commentary',
    label: 'Benchmark Commentary',
    labelKey: 'ai.features.benchmark-commentary.label',
    icon: 'pi pi-chart-bar',
    tier: 'pro',
    endpoint: 'benchmark-commentary',
    narration_type: 'benchmark_commentary',
    description: 'Positions your KPIs against driver-specific industry benchmarks.',
    descriptionKey: 'ai.features.benchmark-commentary.description',
  },
  {
    key: 'portfolio-mix',
    label: 'Portfolio Mix',
    labelKey: 'ai.features.portfolio-mix.label',
    icon: 'pi pi-chart-pie',
    tier: 'pro',
    endpoint: 'portfolio-mix',
    narration_type: 'portfolio_mix',
    description: 'Multi-driver product portfolio commentary.',
    descriptionKey: 'ai.features.portfolio-mix.description',
  },
  {
    key: 'driver-advisor',
    label: 'Driver Advisor',
    labelKey: 'ai.features.driver-advisor.label',
    icon: 'pi pi-compass',
    tier: 'pro',
    endpoint: 'driver-advisor',
    narration_type: 'driver_advisor',
    description: 'Recommends the best structured driver for your products.',
    descriptionKey: 'ai.features.driver-advisor.description',
  },
  {
    key: 'scenario-suggestion',
    label: 'Scenario Suggestion',
    labelKey: 'ai.features.scenario-suggestion.label',
    icon: 'pi pi-code-branch',
    tier: 'pro',
    endpoint: 'scenario-suggestion',
    narration_type: 'scenario_suggestion',
    description: 'Generates bear / bull / stress parameter diffs for your scenario.',
    descriptionKey: 'ai.features.scenario-suggestion.description',
  },
  {
    key: 'sensitivity-narrative',
    label: 'Sensitivity Narrative',
    labelKey: 'ai.features.sensitivity-narrative.label',
    icon: 'pi pi-sliders-h',
    tier: 'pro',
    endpoint: 'sensitivity-narrative',
    narration_type: 'sensitivity_narrative',
    description: 'Ranks and narrates the key sensitivity levers affecting EBITDA.',
    descriptionKey: 'ai.features.sensitivity-narrative.description',
  },
  {
    key: 'investor-memo',
    label: 'Investor Memo',
    labelKey: 'ai.features.investor-memo.label',
    icon: 'pi pi-file',
    tier: 'enterprise',
    endpoint: 'investor-memo',
    narration_type: 'investor_memo',
    description: 'Full investor-ready plan narrative: model, projections, risks.',
    descriptionKey: 'ai.features.investor-memo.description',
  },
]
