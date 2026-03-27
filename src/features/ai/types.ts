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
  label: string
  icon: string
  tier: AIFeatureTier
  endpoint: string
  narration_type: NarrationType
  description: string
}

export const AI_FEATURES: AIFeatureDef[] = [
  {
    key: 'narrate',
    label: 'AI Narration',
    icon: 'pi pi-sparkles',
    tier: 'standard',
    endpoint: 'narrate',
    narration_type: 'plan_summary',
    description: 'AI-powered plain-language summary of your financial plan.',
  },
  {
    key: 'unit-economics',
    label: 'Unit Economics',
    icon: 'pi pi-calculator',
    tier: 'pro',
    endpoint: 'unit-economics',
    narration_type: 'unit_economics',
    description: 'Driver-specific KPI narration for each product line.',
  },
  {
    key: 'assumption-review',
    label: 'Assumption Review',
    icon: 'pi pi-flag',
    tier: 'pro',
    endpoint: 'assumption-review',
    narration_type: 'assumption_review',
    description: 'Red-flag detection on plan inputs vs. industry norms.',
  },
  {
    key: 'benchmark-commentary',
    label: 'Benchmark Commentary',
    icon: 'pi pi-chart-bar',
    tier: 'pro',
    endpoint: 'benchmark-commentary',
    narration_type: 'benchmark_commentary',
    description: 'Positions your KPIs against driver-specific industry benchmarks.',
  },
  {
    key: 'portfolio-mix',
    label: 'Portfolio Mix',
    icon: 'pi pi-chart-pie',
    tier: 'pro',
    endpoint: 'portfolio-mix',
    narration_type: 'portfolio_mix',
    description: 'Multi-driver product portfolio commentary.',
  },
  {
    key: 'driver-advisor',
    label: 'Driver Advisor',
    icon: 'pi pi-compass',
    tier: 'pro',
    endpoint: 'driver-advisor',
    narration_type: 'driver_advisor',
    description: 'Recommends the best structured driver for your products.',
  },
  {
    key: 'scenario-suggestion',
    label: 'Scenario Suggestion',
    icon: 'pi pi-code-branch',
    tier: 'pro',
    endpoint: 'scenario-suggestion',
    narration_type: 'scenario_suggestion',
    description: 'Generates bear / bull / stress parameter diffs for your scenario.',
  },
  {
    key: 'sensitivity-narrative',
    label: 'Sensitivity Narrative',
    icon: 'pi pi-sliders-h',
    tier: 'pro',
    endpoint: 'sensitivity-narrative',
    narration_type: 'sensitivity_narrative',
    description: 'Ranks and narrates the key sensitivity levers affecting EBITDA.',
  },
  {
    key: 'investor-memo',
    label: 'Investor Memo',
    icon: 'pi pi-file',
    tier: 'enterprise',
    endpoint: 'investor-memo',
    narration_type: 'investor_memo',
    description: 'Full investor-ready plan narrative: model, projections, risks.',
  },
]
