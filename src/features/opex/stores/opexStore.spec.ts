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

import { useOpexStore } from './opexStore'

const BASE = '/api/v1/plans/plan-1/scenarios/sc-1/opex'
const mockEntries = [{ id: 'e1', name: 'Rent', amount: 2000 }]
const mockSummary = { total: 2000, byCategory: [] }

describe('useOpexStore', () => {
  let store: ReturnType<typeof useOpexStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useOpexStore()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('manualEntries is empty', () => { expect(store.manualEntries).toEqual([]) })
    it('summary is null', () => { expect(store.summary).toBeNull() })
    it('loading is false', () => { expect(store.loading).toBe(false) })
    it('error is null', () => { expect(store.error).toBeNull() })
  })

  describe('fetchManualEntries', () => {
    it('sets entries on success', async () => {
      mockApi.get.mockResolvedValue({ data: mockEntries })
      await store.fetchManualEntries()
      expect(store.manualEntries).toEqual(mockEntries)
    })

    it('calls correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ data: [] })
      await store.fetchManualEntries()
      expect(mockApi.get).toHaveBeenCalledWith(`${BASE}/`)
    })

    it('sets error on failure and re-throws', async () => {
      mockApi.get.mockRejectedValue({})
      await expect(store.fetchManualEntries()).rejects.toThrow()
      expect(store.error).toBe('Failed to fetch opex entries')
    })

    it('clears loading after success', async () => {
      mockApi.get.mockResolvedValue({ data: [] })
      await store.fetchManualEntries()
      expect(store.loading).toBe(false)
    })
  })

  describe('updateManualEntries', () => {
    it('puts entries to correct endpoint', async () => {
      mockApi.put.mockResolvedValue({})
      await store.updateManualEntries(mockEntries as any)
      expect(mockApi.put).toHaveBeenCalledWith(`${BASE}/`, mockEntries)
    })
  })

  describe('fetchSummary', () => {
    it('sets summary on success', async () => {
      mockApi.get.mockResolvedValue({ data: mockSummary })
      await store.fetchSummary()
      expect(store.summary).toEqual(mockSummary)
    })

    it('calls correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ data: mockSummary })
      await store.fetchSummary()
      expect(mockApi.get).toHaveBeenCalledWith(`${BASE}/summary`)
    })

    it('sets error on failure and re-throws', async () => {
      mockApi.get.mockRejectedValue({})
      await expect(store.fetchSummary()).rejects.toThrow()
      expect(store.error).toBe('Failed to fetch opex summary')
    })
  })

  describe('fetchAll', () => {
    it('calls both fetchManualEntries and fetchSummary', async () => {
      mockApi.get.mockResolvedValue({ data: [] })
      await store.fetchAll()
      expect(mockApi.get).toHaveBeenCalledTimes(2)
    })
  })

  describe('$reset', () => {
    it('clears manualEntries, summary, and error', async () => {
      mockApi.get.mockResolvedValue({ data: mockEntries })
      await store.fetchManualEntries()
      store.$reset()
      expect(store.manualEntries).toEqual([])
      expect(store.summary).toBeNull()
      expect(store.error).toBeNull()
    })
  })

  describe('URL and request body verification', () => {
    it('fetchManualEntries calls correct endpoint URL', async () => {
      mockApi.get.mockResolvedValue({ data: mockEntries })
      await store.fetchManualEntries()
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/plans/plan-1/scenarios/sc-1/opex/')
    })

    it('updateManualEntries sends exact request body to PUT endpoint', async () => {
      mockApi.put.mockResolvedValue({})
      const testData = [
        { id: 'e1', category: 'salaries', amount: '5000', yearIndex: 1 },
        { id: 'e2', category: 'rent', amount: '2000', yearIndex: 1 },
      ]
      await store.updateManualEntries(testData as any)
      expect(mockApi.put).toHaveBeenCalledWith('/api/v1/plans/plan-1/scenarios/sc-1/opex/', testData)
    })

    it('fetchSummary calls summary endpoint with correct URL', async () => {
      mockApi.get.mockResolvedValue({ data: mockSummary })
      await store.fetchSummary()
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/plans/plan-1/scenarios/sc-1/opex/summary')
    })

    it('handles empty array response from fetchManualEntries', async () => {
      mockApi.get.mockResolvedValue({ data: [] })
      await store.fetchManualEntries()
      expect(store.manualEntries).toEqual([])
    })
  })
})
