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

import { useCashStore } from './cashStore'

const BASE = '/api/v1/plans/plan-1/scenarios/sc-1/cash'
const mockOverrides = [{ id: 'o1', month: '2025-01', value: 1000 }]
const mockReport = { months: [], totals: {} }

describe('useCashStore', () => {
  let store: ReturnType<typeof useCashStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useCashStore()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('overrides is empty', () => { expect(store.overrides).toEqual([]) })
    it('report is null', () => { expect(store.report).toBeNull() })
    it('loading is false', () => { expect(store.loading).toBe(false) })
    it('error is null', () => { expect(store.error).toBeNull() })
  })

  describe('fetchOverrides', () => {
    it('sets overrides on success', async () => {
      mockApi.get.mockResolvedValue({ data: mockOverrides })
      await store.fetchOverrides()
      expect(store.overrides).toEqual(mockOverrides)
    })

    it('calls correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ data: [] })
      await store.fetchOverrides()
      expect(mockApi.get).toHaveBeenCalledWith(`${BASE}/`)
    })

    it('sets error on failure and re-throws', async () => {
      mockApi.get.mockRejectedValue({})
      await expect(store.fetchOverrides()).rejects.toThrow()
      expect(store.error).toBe('Failed to fetch cash overrides')
    })
  })

  describe('updateOverrides', () => {
    it('puts overrides and stores result', async () => {
      mockApi.put.mockResolvedValue({ data: mockOverrides })
      await store.updateOverrides(mockOverrides as any)
      expect(mockApi.put).toHaveBeenCalledWith(`${BASE}/`, mockOverrides)
      expect(store.overrides).toEqual(mockOverrides)
    })

    it('sets error on failure and re-throws', async () => {
      mockApi.put.mockRejectedValue({})
      await expect(store.updateOverrides([])).rejects.toThrow()
      expect(store.error).toBe('Failed to update cash overrides')
    })
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

    it('sets error on failure and re-throws', async () => {
      mockApi.get.mockRejectedValue({})
      await expect(store.fetchReport()).rejects.toThrow()
      expect(store.error).toBe('Failed to fetch cash report')
    })
  })

  describe('$reset', () => {
    it('clears overrides, report, and error', async () => {
      mockApi.get.mockResolvedValue({ data: mockOverrides })
      await store.fetchOverrides()
      store.$reset()
      expect(store.overrides).toEqual([])
      expect(store.report).toBeNull()
      expect(store.error).toBeNull()
    })
  })

  describe('URL and request body verification', () => {
    it('fetchOverrides calls correct endpoint URL', async () => {
      mockApi.get.mockResolvedValue({ data: mockOverrides })
      await store.fetchOverrides()
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/plans/plan-1/scenarios/sc-1/cash/')
    })

    it('updateOverrides sends exact request body to PUT endpoint', async () => {
      mockApi.put.mockResolvedValue({ data: mockOverrides })
      const testData = [
        { id: 'o1', month: '2025-01', value: 1000 },
        { id: 'o2', month: '2025-02', value: 2000 },
      ]
      await store.updateOverrides(testData as any)
      expect(mockApi.put).toHaveBeenCalledWith('/api/v1/plans/plan-1/scenarios/sc-1/cash/', testData)
    })

    it('fetchReport calls correct endpoint URL', async () => {
      mockApi.get.mockResolvedValue({ data: mockReport })
      await store.fetchReport()
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/plans/plan-1/scenarios/sc-1/cash/report')
    })

    it('handles empty array response from fetchOverrides', async () => {
      mockApi.get.mockResolvedValue({ data: [] })
      await store.fetchOverrides()
      expect(store.overrides).toEqual([])
    })
  })
})
