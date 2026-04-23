import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const { mockApi } = vi.hoisted(() => {
  const mockApi = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }
  return { mockApi }
})
vi.mock('@/composables/useApi', () => ({ default: mockApi }))

import { useAdminAiUsageStore } from './adminAiUsageStore'
import type { AdminAIUsageStats } from './adminAiUsageStore'

// ── fixtures ──────────────────────────────────────────────────────────────

const mockStats: AdminAIUsageStats = {
  periodStart: '2026-02-25T00:00:00Z',
  periodEnd:   '2026-03-27T00:00:00Z',
  callsToday:  12,
  callsWeek:   84,
  callsMonth:  310,
  byFeature: [
    {
      feature:            'AI_PLAN_NARRATION',
      totalCalls:         200,
      successfulCalls:    195,
      totalTokens:        40000,
      estimatedCostCents: 120.50,
    },
    {
      feature:            'AI_VARIANCE_ANALYSIS',
      totalCalls:         110,
      successfulCalls:    108,
      totalTokens:        22000,
      estimatedCostCents: 66.00,
    },
  ],
  byTenant: [
    {
      tenantId:           'tenant-uuid-1',
      totalCalls:         180,
      successfulCalls:    175,
      totalTokens:        36000,
      estimatedCostCents: 108.00,
    },
  ],
}

// ── tests ─────────────────────────────────────────────────────────────────

describe('useAdminAiUsageStore', () => {
  let store: ReturnType<typeof useAdminAiUsageStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAdminAiUsageStore()
    vi.clearAllMocks()
  })

  // ── initial state ──────────────────────────────────────────────────────

  describe('initial state', () => {
    it('stats is null', () => { expect(store.stats).toBeNull() })
    it('loading is false', () => { expect(store.loading).toBe(false) })
    it('error is null', () => { expect(store.error).toBeNull() })
  })

  // ── fetchStats ─────────────────────────────────────────────────────────

  describe('fetchStats', () => {
    it('sets stats on success', async () => {
      mockApi.get.mockResolvedValue({ data: mockStats })
      await store.fetchStats()
      expect(store.stats).toEqual(mockStats)
    })

    it('calls the correct endpoint without params', async () => {
      mockApi.get.mockResolvedValue({ data: mockStats })
      await store.fetchStats()
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/admin/ai-usage', { params: {} })
    })

    it('passes start param when provided', async () => {
      mockApi.get.mockResolvedValue({ data: mockStats })
      await store.fetchStats('2026-01-01T00:00:00Z')
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/admin/ai-usage', {
        params: { start: '2026-01-01T00:00:00Z' },
      })
    })

    it('passes both start and end params when provided', async () => {
      mockApi.get.mockResolvedValue({ data: mockStats })
      await store.fetchStats('2026-01-01T00:00:00Z', '2026-01-08T00:00:00Z')
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/admin/ai-usage', {
        params: { start: '2026-01-01T00:00:00Z', end: '2026-01-08T00:00:00Z' },
      })
    })

    it('sets loading true while fetching then false after', async () => {
      let seenLoading = false
      mockApi.get.mockImplementation(async () => {
        seenLoading = store.loading
        return { data: mockStats }
      })
      await store.fetchStats()
      expect(seenLoading).toBe(true)
      expect(store.loading).toBe(false)
    })

    it('clears error before fetching', async () => {
      store.error = 'old error'
      mockApi.get.mockResolvedValue({ data: mockStats })
      await store.fetchStats()
      expect(store.error).toBeNull()
    })

    it('populates byFeature correctly', async () => {
      mockApi.get.mockResolvedValue({ data: mockStats })
      await store.fetchStats()
      expect(store.stats!.byFeature).toHaveLength(2)
      expect(store.stats!.byFeature[0].feature).toBe('AI_PLAN_NARRATION')
      expect(store.stats!.byFeature[0].totalCalls).toBe(200)
      expect(store.stats!.byFeature[0].successfulCalls).toBe(195)
      expect(store.stats!.byFeature[0].totalTokens).toBe(40000)
      expect(store.stats!.byFeature[0].estimatedCostCents).toBeCloseTo(120.50)
    })

    it('populates byTenant correctly', async () => {
      mockApi.get.mockResolvedValue({ data: mockStats })
      await store.fetchStats()
      expect(store.stats!.byTenant).toHaveLength(1)
      expect(store.stats!.byTenant[0].tenantId).toBe('tenant-uuid-1')
      expect(store.stats!.byTenant[0].totalCalls).toBe(180)
    })

    it('populates live call counts correctly', async () => {
      mockApi.get.mockResolvedValue({ data: mockStats })
      await store.fetchStats()
      expect(store.stats!.callsToday).toBe(12)
      expect(store.stats!.callsWeek).toBe(84)
      expect(store.stats!.callsMonth).toBe(310)
    })
  })

  // ── error handling ─────────────────────────────────────────────────────

  describe('error handling', () => {
    it('sets error message from API response', async () => {
      mockApi.get.mockRejectedValue({
        response: { data: { error: { message: 'Forbidden' } } },
      })
      await store.fetchStats()
      expect(store.error).toBe('Forbidden')
    })

    it('uses fallback error message when response has no structured error', async () => {
      mockApi.get.mockRejectedValue({})
      await store.fetchStats()
      expect(store.error).toBe('Failed to load AI usage stats')
    })

    it('clears loading on error', async () => {
      mockApi.get.mockRejectedValue({})
      await store.fetchStats()
      expect(store.loading).toBe(false)
    })

    it('leaves stats null on error', async () => {
      mockApi.get.mockRejectedValue({})
      await store.fetchStats()
      expect(store.stats).toBeNull()
    })
  })

  // ── empty state ────────────────────────────────────────────────────────

  describe('empty API response', () => {
    it('handles zero calls and empty arrays', async () => {
      const empty: AdminAIUsageStats = {
        periodStart: '2026-03-01T00:00:00Z',
        periodEnd:   '2026-03-27T00:00:00Z',
        callsToday:  0,
        callsWeek:   0,
        callsMonth:  0,
        byFeature:   [],
        byTenant:    [],
      }
      mockApi.get.mockResolvedValue({ data: empty })
      await store.fetchStats()
      expect(store.stats!.callsToday).toBe(0)
      expect(store.stats!.byFeature).toHaveLength(0)
      expect(store.stats!.byTenant).toHaveLength(0)
    })
  })
})
