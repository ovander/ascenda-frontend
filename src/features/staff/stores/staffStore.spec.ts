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

import { useStaffStore } from './staffStore'

const BASE = '/api/v1/plans/plan-1/scenarios/sc-1/staff'
const mockHeadcounts = [{ id: 'h1', role: 'Engineer', fte: [2, 3, 4, 4, 5] }]
const mockSalaries = [{ id: 's1', role: 'Engineer', annualCost: 60000 }]
const mockIncentives = [{ id: 'i1', role: 'Engineer', bonusPct: 0.1 }]
const mockPayrollSummary = { totalCost: 180000, byYear: [] }

describe('useStaffStore', () => {
  let store: ReturnType<typeof useStaffStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useStaffStore()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('headcounts is empty', () => { expect(store.headcounts).toEqual([]) })
    it('salaries is empty', () => { expect(store.salaries).toEqual([]) })
    it('incentives is empty', () => { expect(store.incentives).toEqual([]) })
    it('payrollSummary is null', () => { expect(store.payrollSummary).toBeNull() })
    it('loading is false', () => { expect(store.loading).toBe(false) })
    it('error is null', () => { expect(store.error).toBeNull() })
  })

  describe('fetchHeadcounts', () => {
    it('sets headcounts on success', async () => {
      mockApi.get.mockResolvedValue({ data: mockHeadcounts })
      await store.fetchHeadcounts()
      expect(store.headcounts).toEqual(mockHeadcounts)
    })

    it('calls correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ data: [] })
      await store.fetchHeadcounts()
      expect(mockApi.get).toHaveBeenCalledWith(`${BASE}/headcounts`)
    })

    it('sets error on failure and re-throws', async () => {
      mockApi.get.mockRejectedValue({})
      await expect(store.fetchHeadcounts()).rejects.toThrow()
      expect(store.error).toBe('Failed to fetch headcounts')
    })
  })

  describe('updateHeadcounts', () => {
    it('puts headcounts and re-fetches', async () => {
      mockApi.put.mockResolvedValue({})
      mockApi.get.mockResolvedValue({ data: mockHeadcounts }) // chained fetchHeadcounts()
      await store.updateHeadcounts(mockHeadcounts as any)
      expect(mockApi.put).toHaveBeenCalledWith(`${BASE}/headcounts`, mockHeadcounts)
    })
  })

  describe('fetchSalaries', () => {
    it('sets salaries on success', async () => {
      mockApi.get.mockResolvedValue({ data: mockSalaries })
      await store.fetchSalaries()
      expect(store.salaries).toEqual(mockSalaries)
    })

    it('calls correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ data: [] })
      await store.fetchSalaries()
      expect(mockApi.get).toHaveBeenCalledWith(`${BASE}/salaries`)
    })

    it('sets error on failure and re-throws', async () => {
      mockApi.get.mockRejectedValue({})
      await expect(store.fetchSalaries()).rejects.toThrow()
      expect(store.error).toBe('Failed to fetch salaries')
    })
  })

  describe('updateSalaries', () => {
    it('puts salaries and re-fetches', async () => {
      mockApi.put.mockResolvedValue({})
      mockApi.get.mockResolvedValue({ data: mockSalaries }) // chained fetchSalaries()
      await store.updateSalaries(mockSalaries as any)
      expect(mockApi.put).toHaveBeenCalledWith(`${BASE}/salaries`, mockSalaries)
    })
  })

  describe('fetchIncentives', () => {
    it('sets incentives on success', async () => {
      mockApi.get.mockResolvedValue({ data: mockIncentives })
      await store.fetchIncentives()
      expect(store.incentives).toEqual(mockIncentives)
    })

    it('calls correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ data: [] })
      await store.fetchIncentives()
      expect(mockApi.get).toHaveBeenCalledWith(`${BASE}/incentives`)
    })

    it('sets error on failure and re-throws', async () => {
      mockApi.get.mockRejectedValue({})
      await expect(store.fetchIncentives()).rejects.toThrow()
      expect(store.error).toBe('Failed to fetch incentives')
    })
  })

  describe('updateIncentives', () => {
    it('puts incentives and re-fetches', async () => {
      mockApi.put.mockResolvedValue({})
      mockApi.get.mockResolvedValue({ data: mockIncentives }) // chained fetchIncentives()
      await store.updateIncentives(mockIncentives as any)
      expect(mockApi.put).toHaveBeenCalledWith(`${BASE}/incentives`, mockIncentives)
    })
  })

  describe('fetchPayrollSummary', () => {
    it('sets payrollSummary on success', async () => {
      mockApi.get.mockResolvedValue({ data: mockPayrollSummary })
      await store.fetchPayrollSummary()
      expect(store.payrollSummary).toEqual(mockPayrollSummary)
    })

    it('calls correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ data: mockPayrollSummary })
      await store.fetchPayrollSummary()
      expect(mockApi.get).toHaveBeenCalledWith(`${BASE}/summary`)
    })
  })

  describe('fetchAll', () => {
    it('fetches headcounts, salaries, incentives, and summary', async () => {
      mockApi.get.mockResolvedValue({ data: [] })
      await store.fetchAll()
      expect(mockApi.get).toHaveBeenCalledTimes(4)
    })
  })

  describe('$reset', () => {
    it('clears all state', async () => {
      mockApi.get.mockResolvedValue({ data: mockHeadcounts })
      await store.fetchHeadcounts()
      store.$reset()
      expect(store.headcounts).toEqual([])
      expect(store.salaries).toEqual([])
      expect(store.incentives).toEqual([])
      expect(store.payrollSummary).toBeNull()
      expect(store.error).toBeNull()
    })
  })

  describe('URL and request body verification', () => {
    it('fetchHeadcounts calls correct endpoint URL', async () => {
      mockApi.get.mockResolvedValue({ data: mockHeadcounts })
      await store.fetchHeadcounts()
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/plans/plan-1/scenarios/sc-1/staff/headcounts')
    })

    it('updateHeadcounts sends exact request body to PUT endpoint', async () => {
      mockApi.put.mockResolvedValue({})
      mockApi.get.mockResolvedValue({ data: mockHeadcounts })
      const testData = [
        { id: 'h1', category: 'engineers', fte: '5', yearIndex: 1 },
        { id: 'h2', category: 'sales', fte: '3', yearIndex: 1 },
      ]
      await store.updateHeadcounts(testData as any)
      expect(mockApi.put).toHaveBeenCalledWith('/api/v1/plans/plan-1/scenarios/sc-1/staff/headcounts', testData)
    })

    it('fetchSalaries calls correct endpoint URL', async () => {
      mockApi.get.mockResolvedValue({ data: mockSalaries })
      await store.fetchSalaries()
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/plans/plan-1/scenarios/sc-1/staff/salaries')
    })

    it('updateSalaries sends exact request body to PUT endpoint', async () => {
      mockApi.put.mockResolvedValue({})
      mockApi.get.mockResolvedValue({ data: mockSalaries })
      const testData = [
        { id: 's1', category: 'engineers', monthlyGrossSalary: '5000', yearIndex: 1 },
      ]
      await store.updateSalaries(testData as any)
      expect(mockApi.put).toHaveBeenCalledWith('/api/v1/plans/plan-1/scenarios/sc-1/staff/salaries', testData)
    })

    it('fetchIncentives calls correct endpoint URL', async () => {
      mockApi.get.mockResolvedValue({ data: mockIncentives })
      await store.fetchIncentives()
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/plans/plan-1/scenarios/sc-1/staff/incentives')
    })

    it('updateIncentives sends exact request body to PUT endpoint', async () => {
      mockApi.put.mockResolvedValue({})
      mockApi.get.mockResolvedValue({ data: mockIncentives })
      const testData = [
        { id: 'i1', category: 'engineers', bonusPct: '0.15', yearIndex: 1 },
      ]
      await store.updateIncentives(testData as any)
      expect(mockApi.put).toHaveBeenCalledWith('/api/v1/plans/plan-1/scenarios/sc-1/staff/incentives', testData)
    })

    it('fetchPayrollSummary calls correct endpoint URL', async () => {
      mockApi.get.mockResolvedValue({ data: mockPayrollSummary })
      await store.fetchPayrollSummary()
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/plans/plan-1/scenarios/sc-1/staff/summary')
    })

    it('handles empty arrays from fetch endpoints', async () => {
      mockApi.get.mockResolvedValue({ data: [] })
      await store.fetchHeadcounts()
      expect(store.headcounts).toEqual([])
      await store.fetchSalaries()
      expect(store.salaries).toEqual([])
      await store.fetchIncentives()
      expect(store.incentives).toEqual([])
    })
  })
})
