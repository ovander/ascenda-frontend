// ScenarioAnalysis v2 — types mirroring the backend response contract.
// Endpoint: GET /api/v1/plans/:planId/scenarios/:scenarioId/analysis
//
// DO NOT transform this structure — the frontend renders it as-is.
// Adapter helpers live in useScenarioAnalysis.ts, not here.

// ── Primitive unions ────────────────────────────────────────────────────────────

export type ViabilityLabel = 'Strong' | 'Viable' | 'At Risk' | 'Critical'
export type RiskUrgency    = 'critical' | 'high' | 'medium' | 'low'
export type DriverImpact   = 'positive' | 'negative' | 'neutral'
export type TrendDirection = 'up' | 'down' | 'flat'

// ── Sub-objects ─────────────────────────────────────────────────────────────────

export interface ViabilityScore {
  /** 0–100 composite score. */
  score: number
  label: ViabilityLabel
  rationale: string
}

export interface AnalysisHighlights {
  /** One-line headline suitable for mobile cards. */
  headline: string
  strengths: string[]
  weaknesses: string[]
}

export interface AnalysisRisk {
  title: string
  description: string
  urgency: RiskUrgency
  /** Optional grouping tag (e.g. 'Cash', 'Revenue', 'Hiring'). */
  category?: string
}

export interface AnalysisDriver {
  title: string
  description: string
  impact: DriverImpact
  /** 1 = most impactful root cause. */
  priority: number
}

export interface TrendInsight {
  metric: string
  direction: TrendDirection
  description: string
}

export interface AnalysisNarration {
  text: string
  /** BCP-47 language tag (e.g. 'en', 'fr'). */
  language: string
  is_ai_generated: boolean
}

// ── Root response ───────────────────────────────────────────────────────────────

export interface ScenarioAnalysisResult {
  viability:  ViabilityScore
  highlights: AnalysisHighlights
  risks:      AnalysisRisk[]
  drivers:    AnalysisDriver[]
  trends:     TrendInsight[]
  /** Optional — may be absent when AI generation is disabled server-side. */
  narration?: AnalysisNarration
  /** ISO-8601 timestamp of when this analysis was generated. */
  generated_at: string
}
