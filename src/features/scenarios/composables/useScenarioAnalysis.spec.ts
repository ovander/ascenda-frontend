/**
 * Unit tests for useScenarioAnalysis composable.
 *
 * Verifies: initial state, successful fetch, API error handling,
 * generic network error handling, and reset().
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ScenarioAnalysisResult } from '../types'

// ── Mock useAIApi ──────────────────────────────────────────────────────────────
// vi.mock() is hoisted before ALL other code — do NOT close over `const` variables
// declared in this file (they'd be in the TDZ). Instead, mock the shape here and
// use vi.mocked().mockReturnValue() at runtime in beforeEach.

vi.mock('@/composables/useApi', () => ({
  useAIApi: vi.fn(),
  // Keep the default export intact so other modules using useApi don't break
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

import { useAIApi } from '@/composables/useApi'
import { useScenarioAnalysis } from './useScenarioAnalysis'

// ── Fixture data ───────────────────────────────────────────────────────────────

const PLAN_ID     = 'plan-aaaa'
const SCENARIO_ID = 'scen-bbbb'

const MOCK_ANALYSIS: ScenarioAnalysisResult = {
  viability: {
    score:     72,
    label:     'Viable',
    rationale: 'The plan shows moderate viability with controlled risk exposure.',
  },
  highlights: {
    headline:   'Solid foundation with manageable risks',
    strengths:  ['Strong cash position', 'Diversified revenue streams'],
    weaknesses: ['High burn rate in Q1', 'Limited market penetration'],
  },
  risks: [
    { title: 'Cash flow risk',   description: 'Burn exceeds projections', urgency: 'high' },
    { title: 'Operational risk', description: 'Team scaling challenges',  urgency: 'low'  },
  ],
  drivers: [
    { title: 'Revenue growth', description: 'Primary growth driver', impact: 'positive', priority: 1 },
  ],
  trends: [
    { metric: 'Revenue', direction: 'up', description: 'Month-over-month growth' },
  ],
  narration: {
    text:            'Overall the scenario shows promising fundamentals.',
    language:        'en',
    is_ai_generated: true,
  },
  generated_at: '2026-04-01T12:00:00Z',
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useScenarioAnalysis', () => {
  // Fresh mock instance for each test
  let mockGet: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockGet = vi.fn()
    vi.mocked(useAIApi).mockReturnValue({ get: mockGet } as any)
  })

  // ── Initial state ────────────────────────────────────────────────────────────

  it('has null analysis, false loading and null error initially', () => {
    const { analysis, loading, error } = useScenarioAnalysis()

    expect(analysis.value).toBeNull()
    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  // ── Successful fetch ─────────────────────────────────────────────────────────

  it('sets loading=true during fetch then analysis on success', async () => {
    mockGet.mockResolvedValue({ data: MOCK_ANALYSIS })
    const { analysis, loading, error, fetch } = useScenarioAnalysis()

    const fetchPromise = fetch(PLAN_ID, SCENARIO_ID)
    expect(loading.value).toBe(true)

    await fetchPromise

    expect(loading.value).toBe(false)
    expect(analysis.value).toEqual(MOCK_ANALYSIS)
    expect(error.value).toBeNull()
  })

  it('calls the correct API endpoint', async () => {
    mockGet.mockResolvedValue({ data: MOCK_ANALYSIS })
    const { fetch } = useScenarioAnalysis()

    await fetch(PLAN_ID, SCENARIO_ID)

    expect(mockGet).toHaveBeenCalledOnce()
    expect(mockGet).toHaveBeenCalledWith(
      `/api/v1/plans/${PLAN_ID}/scenarios/${SCENARIO_ID}/analysis`,
    )
  })

  // ── Error handling ───────────────────────────────────────────────────────────

  it('captures API error message from response.data.message', async () => {
    mockGet.mockRejectedValue({
      response: { data: { message: 'Scenario not found' } },
    })
    const { analysis, loading, error, fetch } = useScenarioAnalysis()

    await fetch(PLAN_ID, SCENARIO_ID)

    expect(loading.value).toBe(false)
    expect(analysis.value).toBeNull()
    expect(error.value).toBe('Scenario not found')
  })

  it('falls back to generic message when error has no response body', async () => {
    mockGet.mockRejectedValue(new Error('Network error'))
    const { error, fetch } = useScenarioAnalysis()

    await fetch(PLAN_ID, SCENARIO_ID)

    expect(error.value).toBe('Analysis unavailable')
  })

  // ── Reset ────────────────────────────────────────────────────────────────────

  it('reset() clears analysis, error and loading', async () => {
    mockGet.mockResolvedValue({ data: MOCK_ANALYSIS })
    const { analysis, loading, error, fetch, reset } = useScenarioAnalysis()

    await fetch(PLAN_ID, SCENARIO_ID)
    expect(analysis.value).not.toBeNull()

    reset()

    expect(analysis.value).toBeNull()
    expect(error.value).toBeNull()
    expect(loading.value).toBe(false)
  })
})
