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

import { useCapexStore } from './capexStore'

const BASE = '/api/v1/plans/plan-1/scenarios/sc-1/capex'
const mockEntries = [{ id: 'e1', name: 'Server', amount: 5000 }]
const mockSummary = { total: 5000, byYear: [] }

describe('useCapexStore', () => {
  let store: ReturnType<typeof useCapexStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useCapexStore()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('entries is empty', () => { expect(store.entries).toEqual([]) })
    it('summary is null', () => { expect(store.summary).toBeNull() })
    it('loading is false', () => { expect(store.loading).toBe(false) })
    it('error is null', () => { expect(store.error).toBeNull() })
  })

  describe('fetchEntries', () => {
    it('sets entries on success', async () => {
      mockApi.get.mockResolvedValue({ data: mockEntries })
      await store.fetchEntries()
      expect(store.entries).toEqual(mockEntries)
    })

    it('calls correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ data: [] })
      await store.fetchEntries()
      expect(mockApi.get).toHaveBeenCalledWith(`${BASE}/`)
    })

    it('sets error on failure and re-throws', async () => {
      mockApi.get.mockRejectedValue({})
      await expect(store.fetchEntries()).rejects.toThrow()
      expect(store.error).toBe('Failed to fetch capex entries')
    })
  })

  describe('updateEntries', () => {
    it('puts entries and merges optimistically', async () => {
      // capexStore uses an optimistic local merge (no re-fetch) keyed on category+yearIndex.
      const testData = [{ id: 'e1', category: 'equipment', yearIndex: 0, amount: 5000 }]
      mockApi.put.mockResolvedValue({})
      mockApi.get.mockResolvedValue({ data: testData }) // fetchSummary background refresh
      await store.updateEntries(testData as any)
      expect(mockApi.put).toHaveBeenCalledWith(`${BASE}/`, testData)
      // Entry is pushed via optimistic merge since category+yearIndex are present.
      expect(store.entries).toEqual(testData)
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
      expect(store.error).toBe('Failed to fetch capex summary')
    })
  })

  describe('fetchAll', () => {
    it('fetches both entries and summary', async () => {
      mockApi.get.mockResolvedValue({ data: [] })
      await store.fetchAll()
      expect(mockApi.get).toHaveBeenCalledTimes(2)
    })
  })

  describe('$reset', () => {
    it('clears entries, summary, and error', async () => {
      mockApi.get.mockResolvedValue({ data: mockEntries })
      await store.fetchEntries()
      store.$reset()
      expect(store.entries).toEqual([])
      expect(store.summary).toBeNull()
      expect(store.error).toBeNull()
    })
  })

  describe('URL and request body verification', () => {
    it('fetchEntries calls correct URL with basePath', async () => {
      mockApi.get.mockResolvedValue({ data: mockEntries })
      await store.fetchEntries()
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/plans/plan-1/scenarios/sc-1/capex/')
    })

    it('updateEntries sends exact request body to PUT endpoint', async () => {
      mockApi.put.mockResolvedValue({})
      mockApi.get.mockResolvedValue({ data: mockEntries })
      const testData = [
        { id: 'e1', category: 'equipment', amount: '1000' },
        { id: 'e2', category: 'software', amount: '500' },
      ]
      await store.updateEntries(testData as any)
      expect(mockApi.put).toHaveBeenCalledWith('/api/v1/plans/plan-1/scenarios/sc-1/capex/', testData)
    })

    it('fetchSummary calls summary endpoint', async () => {
      mockApi.get.mockResolvedValue({ data: mockSummary })
      await store.fetchSummary()
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/plans/plan-1/scenarios/sc-1/capex/summary')
    })

    it('handles empty array response from fetchEntries', async () => {
      mockApi.get.mockResolvedValue({ data: [] })
      await store.fetchEntries()
      expect(store.entries).toEqual([])
    })
  })
})
