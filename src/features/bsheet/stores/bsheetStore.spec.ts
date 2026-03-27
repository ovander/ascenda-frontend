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

import { useBSheetStore } from './bsheetStore'

const BASE = '/api/v1/plans/plan-1/scenarios/sc-1/bsheet'
const mockReport = { assets: [], liabilities: [], equity: [] }

describe('useBSheetStore', () => {
  let store: ReturnType<typeof useBSheetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useBSheetStore()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('report is null', () => { expect(store.report).toBeNull() })
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
      mockApi.get.mockRejectedValue({ response: { data: { message: 'Server error' } } })
      await store.fetchReport()
      expect(store.error).toBe('Server error')
    })

    it('uses fallback error', async () => {
      mockApi.get.mockRejectedValue({})
      await store.fetchReport()
      expect(store.error).toBe('Failed to fetch balance sheet report')
    })

    it('clears loading on success', async () => {
      mockApi.get.mockResolvedValue({ data: mockReport })
      await store.fetchReport()
      expect(store.loading).toBe(false)
    })
  })

  describe('fetchAll (alias)', () => {
    it('is equivalent to fetchReport', async () => {
      mockApi.get.mockResolvedValue({ data: mockReport })
      await store.fetchAll()
      expect(store.report).toEqual(mockReport)
    })
  })

  describe('$reset', () => {
    it('clears report and error', async () => {
      mockApi.get.mockResolvedValue({ data: mockReport })
      await store.fetchReport()
      store.$reset()
      expect(store.report).toBeNull()
      expect(store.error).toBeNull()
    })
  })
})
