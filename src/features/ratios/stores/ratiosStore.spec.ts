import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const { mockApi } = vi.hoisted(() => ({
  mockApi: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))
vi.mock('@/composables/useApi', () => ({ default: mockApi }))
vi.mock('@/features/plans/stores/planStore', () => ({
  usePlanStore: vi.fn(() => ({ activePlan: { id: 'plan-1' } })),
}))
vi.mock('@/features/scenarios/stores/scenarioStore', () => ({
  useScenarioStore: vi.fn(() => ({ activeScenario: { id: 'sc-1' } })),
}))

import { useRatiosStore } from './ratiosStore'

const BASE = '/api/v1/plans/plan-1/scenarios/sc-1/ratios'
const mockReport = { rows: [] }
const mockChart = { labels: [], datasets: [] }

describe('useRatiosStore', () => {
  let store: ReturnType<typeof useRatiosStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useRatiosStore()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('report is null', () => { expect(store.report).toBeNull() })
    it('charts is empty object', () => { expect(store.charts).toEqual({}) })
    it('loading is false', () => { expect(store.loading).toBe(false) })
    it('error is null', () => { expect(store.error).toBeNull() })
  })

  describe('fetchReport', () => {
    it('sets report on success', async () => {
      mockApi.get.mockResolvedValue({ data: mockReport })
      await store.fetchReport()
      expect(store.report).toEqual(mockReport)
    })

    it('calls correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ data: mockReport })
      await store.fetchReport()
      expect(mockApi.get).toHaveBeenCalledWith(`${BASE}/report`)
    })

    it('sets error on failure', async () => {
      mockApi.get.mockRejectedValue({})
      await store.fetchReport()
      expect(store.error).toBe('Failed to fetch ratios report')
    })

    it('clears loading on success', async () => {
      mockApi.get.mockResolvedValue({ data: mockReport })
      await store.fetchReport()
      expect(store.loading).toBe(false)
    })
  })

  describe('fetchChart', () => {
    it('stores chart by name on success', async () => {
      mockApi.get.mockResolvedValue({ data: mockChart })
      await store.fetchChart('revenue')
      expect(store.charts['revenue']).toEqual(mockChart)
    })

    it('calls correct endpoint with chart name', async () => {
      mockApi.get.mockResolvedValue({ data: mockChart })
      await store.fetchChart('margin')
      expect(mockApi.get).toHaveBeenCalledWith(`${BASE}/chart?name=margin`)
    })

    it('sets error on failure', async () => {
      mockApi.get.mockRejectedValue({})
      await store.fetchChart('revenue')
      expect(store.error).toBe('Failed to fetch chart')
    })
  })

  describe('$reset', () => {
    it('clears report, charts, and error', async () => {
      mockApi.get.mockResolvedValue({ data: mockReport })
      await store.fetchReport()
      store.$reset()
      expect(store.report).toBeNull()
      expect(store.charts).toEqual({})
      expect(store.error).toBeNull()
    })
  })
})
