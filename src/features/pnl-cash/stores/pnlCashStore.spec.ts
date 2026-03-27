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

import { usePnlCashStore } from './pnlCashStore'

const BASE = '/api/v1/plans/plan-1/scenarios/sc-1/pnl-cash'
const mockEntries = [{ id: 'e1', label: 'Accrual adj', value: 200 }]
const mockReport = { rows: [], totals: {} }
const mockChartApiResponse = {
  years: [2025, 2026],
  chartData: { labels: ['2025', '2026'], datasets: [] },
}

describe('usePnlCashStore', () => {
  let store: ReturnType<typeof usePnlCashStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = usePnlCashStore()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('entries is empty', () => { expect(store.entries).toEqual([]) })
    it('report is null', () => { expect(store.report).toBeNull() })
    it('chartData is null', () => { expect(store.chartData).toBeNull() })
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
      expect(store.error).toBe('Failed to fetch P&L Cash entries')
    })
  })

  describe('updateEntries', () => {
    it('puts entries and re-fetches', async () => {
      mockApi.put.mockResolvedValue({})
      mockApi.get
        .mockResolvedValueOnce({ data: mockEntries }) // fetchEntries()
        .mockResolvedValueOnce({ data: mockReport })  // fetchReport()
      await store.updateEntries(mockEntries as any)
      expect(mockApi.put).toHaveBeenCalledWith(`${BASE}/`, mockEntries)
    })

    it('sets error on failure and re-throws', async () => {
      mockApi.put.mockRejectedValue({})
      await expect(store.updateEntries([])).rejects.toThrow()
      expect(store.error).toBe('Failed to update P&L Cash entries')
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
      expect(store.error).toBe('Failed to fetch P&L Cash report')
    })
  })

  describe('fetchChart', () => {
    it('sets chartData on success', async () => {
      mockApi.get.mockResolvedValue({ data: mockChartApiResponse })
      await store.fetchChart()
      expect(store.chartData).toBeTruthy()
    })

    it('calls correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ data: mockChartApiResponse })
      await store.fetchChart()
      expect(mockApi.get).toHaveBeenCalledWith(`${BASE}/chart`)
    })

    it('sets error on failure', async () => {
      mockApi.get.mockRejectedValue({})
      await store.fetchChart()
      expect(store.error).toBe('Failed to fetch P&L Cash chart')
    })
  })

  describe('fetchAll', () => {
    it('fetches entries, report, and chart', async () => {
      mockApi.get.mockResolvedValue({ data: [] })
      mockApi.get.mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: mockReport })
        .mockResolvedValueOnce({ data: mockChartApiResponse })
      await store.fetchAll()
      expect(mockApi.get).toHaveBeenCalledTimes(3)
    })
  })

  describe('$reset', () => {
    it('clears entries, report, chartData, and error', async () => {
      mockApi.get.mockResolvedValue({ data: mockEntries })
      await store.fetchEntries()
      store.$reset()
      expect(store.entries).toEqual([])
      expect(store.report).toBeNull()
      expect(store.chartData).toBeNull()
      expect(store.error).toBeNull()
    })
  })
})
