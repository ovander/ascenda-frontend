import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const { mockApi } = vi.hoisted(() => {
  const mockApi = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }
  return { mockApi }
})
vi.mock('@/composables/useApi', () => ({ default: mockApi }))

import { useAdminStatsStore } from './adminStatsStore'
import type { AdminStats } from './adminStatsStore'

const mockStats: AdminStats = {
  users: { total: 10, active: 8, inactive: 2, byRole: { owner: 1, admin: 2, user: 7 } },
  plans: { total: 5, byStatus: { draft: 1, active: 3, archived: 1 } },
  scenarios: { total: 12 },
  recentActivity: [],
  topUsers: [],
}

describe('useAdminStatsStore', () => {
  let store: ReturnType<typeof useAdminStatsStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAdminStatsStore()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('stats is null', () => { expect(store.stats).toBeNull() })
    it('loading is false', () => { expect(store.loading).toBe(false) })
    it('error is null', () => { expect(store.error).toBeNull() })
  })

  describe('fetchStats', () => {
    it('sets stats on success', async () => {
      mockApi.get.mockResolvedValue({ data: mockStats })
      await store.fetchStats()
      expect(store.stats).toEqual(mockStats)
    })

    it('calls correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ data: mockStats })
      await store.fetchStats()
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/admin/stats')
    })

    it('clears error before fetching', async () => {
      store.error = 'old error'
      mockApi.get.mockResolvedValue({ data: mockStats })
      await store.fetchStats()
      expect(store.error).toBeNull()
    })

    it('sets loading true while fetching then false', async () => {
      let seenLoading = false
      mockApi.get.mockImplementation(async () => {
        seenLoading = store.loading
        return { data: mockStats }
      })
      await store.fetchStats()
      expect(seenLoading).toBe(true)
      expect(store.loading).toBe(false)
    })

    it('sets error on API failure', async () => {
      mockApi.get.mockRejectedValue({
        response: { data: { error: { message: 'Forbidden' } } },
      })
      await store.fetchStats()
      expect(store.error).toBe('Forbidden')
    })

    it('sets fallback error message', async () => {
      mockApi.get.mockRejectedValue({})
      await store.fetchStats()
      expect(store.error).toBe('Failed to load dashboard stats')
    })

    it('clears loading on error', async () => {
      mockApi.get.mockRejectedValue({})
      await store.fetchStats()
      expect(store.loading).toBe(false)
    })
  })
})
