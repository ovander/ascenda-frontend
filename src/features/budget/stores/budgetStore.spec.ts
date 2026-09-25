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
vi.mock('@/utils/format', () => ({
  debounce: (fn: (...args: unknown[]) => unknown) => fn,
}))
vi.mock('@/utils/constants', () => ({ DEBOUNCE_MS: 0 }))

import { useBudgetStore } from './budgetStore'

const BASE = '/api/v1/plans/plan-1/scenarios/sc-1/budget'
const mockOverrides = [{ id: 'o1', month: '2025-01', amount: 1000 }]
const mockBudget1 = { rows: [], totals: {} }
const mockBudget2 = { rows: [], views: [] }

describe('useBudgetStore', () => {
  let store: ReturnType<typeof useBudgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useBudgetStore()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('overrides is empty', () => { expect(store.overrides).toEqual([]) })
    it('budget1Report is null', () => { expect(store.budget1Report).toBeNull() })
    it('budget2Report is null', () => { expect(store.budget2Report).toBeNull() })
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
      expect(store.error).toBe('Failed to fetch budget overrides')
    })
  })

  describe('updateOverrides', () => {
    it('puts overrides', async () => {
      mockApi.put.mockResolvedValue({ data: mockOverrides })
      await store.updateOverrides(mockOverrides as any)
      expect(mockApi.put).toHaveBeenCalledWith(`${BASE}/`, mockOverrides)
    })

    it('sets error on failure and re-throws', async () => {
      mockApi.put.mockRejectedValue({})
      await expect(store.updateOverrides([])).rejects.toThrow()
      expect(store.error).toBe('Failed to update budget overrides')
    })
  })

  describe('fetchBudget1', () => {
    it('sets budget1Report on success', async () => {
      mockApi.get.mockResolvedValue({ data: mockBudget1 })
      await store.fetchBudget1()
      expect(store.budget1Report).toEqual(mockBudget1)
    })

    it('calls correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ data: mockBudget1 })
      await store.fetchBudget1()
      expect(mockApi.get).toHaveBeenCalledWith(`${BASE}/year1`)
    })

    it('sets error on failure and re-throws', async () => {
      mockApi.get.mockRejectedValue({})
      await expect(store.fetchBudget1()).rejects.toThrow()
      expect(store.error).toBe('Failed to fetch year 1 budget')
    })
  })

  describe('fetchBudget2', () => {
    it('sets budget2Report on success', async () => {
      mockApi.get.mockResolvedValue({ data: mockBudget2 })
      await store.fetchBudget2()
      expect(store.budget2Report).toEqual(mockBudget2)
    })

    it('calls correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ data: mockBudget2 })
      await store.fetchBudget2()
      expect(mockApi.get).toHaveBeenCalledWith(`${BASE}/year2`)
    })

    it('sets error on failure and re-throws', async () => {
      mockApi.get.mockRejectedValue({})
      await expect(store.fetchBudget2()).rejects.toThrow()
      expect(store.error).toBe('Failed to fetch year 2 budget')
    })
  })

  describe('$reset', () => {
    it('clears overrides, reports, and error', async () => {
      mockApi.get.mockResolvedValue({ data: mockBudget1 })
      await store.fetchBudget1()
      store.$reset()
      expect(store.overrides).toEqual([])
      expect(store.budget1Report).toBeNull()
      expect(store.budget2Report).toBeNull()
      expect(store.error).toBeNull()
    })
  })
})
