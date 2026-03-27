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

import { useReportStore } from './reportStore'

const BASE = '/api/v1/plans/plan-1/scenarios/sc-1/report'
const mockReport = {
  warnings: [{ code: 'W001', message: 'Low revenue' }],
  pnl: {},
  cash: {},
}

describe('useReportStore', () => {
  let store: ReturnType<typeof useReportStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useReportStore()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('fullReport is null', () => { expect(store.fullReport).toBeNull() })
    it('warnings is empty', () => { expect(store.warnings).toEqual([]) })
    it('loading is false', () => { expect(store.loading).toBe(false) })
    it('error is null', () => { expect(store.error).toBeNull() })
  })

  describe('fetchFullReport', () => {
    it('sets fullReport on success', async () => {
      mockApi.get.mockResolvedValue({ data: mockReport })
      await store.fetchFullReport()
      expect(store.fullReport).toEqual(mockReport)
    })

    it('extracts warnings from response', async () => {
      mockApi.get.mockResolvedValue({ data: mockReport })
      await store.fetchFullReport()
      expect(store.warnings).toEqual(mockReport.warnings)
    })

    it('calls correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ data: mockReport })
      await store.fetchFullReport()
      expect(mockApi.get).toHaveBeenCalledWith(BASE)
    })

    it('sets error on failure and re-throws', async () => {
      mockApi.get.mockRejectedValue({})
      await expect(store.fetchFullReport()).rejects.toThrow()
      expect(store.error).toBe('Failed to fetch full report')
    })

    it('clears loading on success', async () => {
      mockApi.get.mockResolvedValue({ data: mockReport })
      await store.fetchFullReport()
      expect(store.loading).toBe(false)
    })

    it('clears loading on error', async () => {
      mockApi.get.mockRejectedValue({})
      await expect(store.fetchFullReport()).rejects.toThrow()
      expect(store.loading).toBe(false)
    })

    it('uses cache when valid and forceRefresh is false', async () => {
      mockApi.get.mockResolvedValue({ data: mockReport })
      await store.fetchFullReport()
      vi.clearAllMocks()
      await store.fetchFullReport(false)
      // Should not call API again — cache still valid
      expect(mockApi.get).not.toHaveBeenCalled()
    })

    it('bypasses cache when forceRefresh is true', async () => {
      mockApi.get.mockResolvedValue({ data: mockReport })
      await store.fetchFullReport()
      vi.clearAllMocks()
      mockApi.get.mockResolvedValue({ data: mockReport })
      await store.fetchFullReport(true)
      expect(mockApi.get).toHaveBeenCalledTimes(1)
    })
  })

  describe('$reset', () => {
    it('clears fullReport, warnings, and error', async () => {
      mockApi.get.mockResolvedValue({ data: mockReport })
      await store.fetchFullReport()
      store.$reset()
      expect(store.fullReport).toBeNull()
      expect(store.warnings).toEqual([])
      expect(store.error).toBeNull()
    })
  })
})
