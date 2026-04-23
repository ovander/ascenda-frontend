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

import { useFiplanStore } from './fiplanStore'

const BASE = '/api/v1/plans/plan-1/scenarios/sc-1/fiplan'
const mockEntries = [{ id: 'e1', label: 'Grant A', amount: 50000 }]
const mockReport = { rows: [], totals: {} }
const mockGrants = [{ id: 'g1', name: 'EU Grant', amount: 25000 }]

describe('useFiplanStore', () => {
  let store: ReturnType<typeof useFiplanStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useFiplanStore()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('entries is empty', () => { expect(store.entries).toEqual([]) })
    it('report is null', () => { expect(store.report).toBeNull() })
    it('grants is empty', () => { expect(store.grants).toEqual([]) })
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
      await expect(store.fetchEntries()).rejects.toBeTruthy()
      expect(store.error).toBe('Failed to fetch financial plan entries')
    })
  })

  describe('updateEntries', () => {
    it('puts entries and re-fetches', async () => {
      mockApi.put.mockResolvedValue({})
      mockApi.get
        .mockResolvedValueOnce({ data: mockEntries }) // fetchEntries()
        .mockResolvedValueOnce({ data: mockReport })  // fetchReport()
      await store.updateEntries(mockEntries as any)
      expect(mockApi.put).toHaveBeenCalledWith(`${BASE}/`, expect.anything())
    })

    it('sets error on failure and re-throws', async () => {
      mockApi.put.mockRejectedValue({})
      await expect(store.updateEntries([])).rejects.toThrow()
      expect(store.error).toBe('Failed to update financial plan entries')
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
      await expect(store.fetchReport()).rejects.toBeTruthy()
      expect(store.error).toBe('Failed to fetch financial plan report')
    })
  })

  describe('fetchGrants', () => {
    it('sets grants on success', async () => {
      mockApi.get.mockResolvedValue({ data: mockGrants })
      await store.fetchGrants()
      expect(store.grants).toEqual(mockGrants)
    })

    it('calls correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ data: [] })
      await store.fetchGrants()
      expect(mockApi.get).toHaveBeenCalledWith(`${BASE}/grants`)
    })
  })

  describe('fetchAll', () => {
    it('calls fetchEntries, fetchReport, and fetchGrants', async () => {
      mockApi.get.mockResolvedValue({ data: [] })
      await store.fetchAll()
      expect(mockApi.get).toHaveBeenCalledTimes(3)
    })
  })

  describe('$reset', () => {
    it('clears entries, report, grants, and error', async () => {
      mockApi.get.mockResolvedValue({ data: mockEntries })
      await store.fetchEntries()
      store.$reset()
      expect(store.entries).toEqual([])
      expect(store.report).toBeNull()
      expect(store.grants).toEqual([])
      expect(store.error).toBeNull()
    })
  })
})
