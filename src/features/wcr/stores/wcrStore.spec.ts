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

import { useWcrStore } from './wcrStore'

const BASE = '/api/v1/plans/plan-1/scenarios/sc-1/wcr'
const mockEntries = [{ id: 'e1', label: 'AR Days', value: 30 }]
const mockReport = { rows: [], summary: {} }

describe('useWcrStore', () => {
  let store: ReturnType<typeof useWcrStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useWcrStore()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('entries is empty', () => { expect(store.entries).toEqual([]) })
    it('report is null', () => { expect(store.report).toBeNull() })
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

    it('sets error on failure', async () => {
      mockApi.get.mockRejectedValue({})
      await store.fetchEntries()
      expect(store.error).toBe('Failed to fetch WCR entries')
    })
  })

  describe('updateEntries', () => {
    it('puts entries and stores result', async () => {
      mockApi.put.mockResolvedValue({ data: mockEntries })
      await store.updateEntries(mockEntries as any)
      expect(mockApi.put).toHaveBeenCalledWith(`${BASE}/`, mockEntries)
      expect(store.entries).toEqual(mockEntries)
    })

    it('sets error on failure', async () => {
      mockApi.put.mockRejectedValue({})
      await store.updateEntries([])
      expect(store.error).toBe('Failed to update WCR entries')
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

    it('sets error on failure', async () => {
      mockApi.get.mockRejectedValue({})
      await store.fetchReport()
      expect(store.error).toBe('Failed to fetch WCR report')
    })
  })

  describe('$reset', () => {
    it('clears entries, report, and error', async () => {
      mockApi.get.mockResolvedValue({ data: mockEntries })
      await store.fetchEntries()
      store.$reset()
      expect(store.entries).toEqual([])
      expect(store.report).toBeNull()
      expect(store.error).toBeNull()
    })
  })

  describe('URL and request body verification', () => {
    it('fetchEntries calls correct endpoint URL', async () => {
      mockApi.get.mockResolvedValue({ data: mockEntries })
      await store.fetchEntries()
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/plans/plan-1/scenarios/sc-1/wcr/')
    })

    it('updateEntries sends exact request body to PUT endpoint', async () => {
      mockApi.put.mockResolvedValue({ data: mockEntries })
      const testData = [
        { id: 'e1', label: 'AR Days', value: 30, yearIndex: 1 },
        { id: 'e2', label: 'Inventory Days', value: 20, yearIndex: 1 },
      ]
      await store.updateEntries(testData as any)
      expect(mockApi.put).toHaveBeenCalledWith('/api/v1/plans/plan-1/scenarios/sc-1/wcr/', testData)
    })

    it('fetchReport calls correct endpoint URL', async () => {
      mockApi.get.mockResolvedValue({ data: mockReport })
      await store.fetchReport()
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/plans/plan-1/scenarios/sc-1/wcr/report')
    })

    it('handles empty array response from fetchEntries', async () => {
      mockApi.get.mockResolvedValue({ data: [] })
      await store.fetchEntries()
      expect(store.entries).toEqual([])
    })
  })
})
