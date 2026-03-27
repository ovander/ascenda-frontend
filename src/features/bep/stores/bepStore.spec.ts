import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// ── Hoist mocks so vi.mock factories can reference them ────────────────────
const { mockApi } = vi.hoisted(() => {
  const mockApi = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
  return { mockApi }
})

vi.mock('@/composables/useApi', () => ({ default: mockApi }))

vi.mock('@/features/plans/stores/planStore', () => ({
  usePlanStore: vi.fn(() => ({ activePlan: { id: 'plan-42' } })),
}))
vi.mock('@/features/scenarios/stores/scenarioStore', () => ({
  useScenarioStore: vi.fn(() => ({ activeScenario: { id: 'sc-99' } })),
}))

import { useBEPStore } from './bepStore'
import type { BEPSnapshot, BEPReport, OptimisationPlan } from '@/types'

const SCENARIO_BASE = '/api/v1/plans/plan-42/scenarios/sc-99/bep'
const SNAPSHOTS_URL = `${SCENARIO_BASE}/snapshots`
const snap = (id: string) => `${SNAPSHOTS_URL}/${id}`

// ── Sample fixtures ────────────────────────────────────────────────────────
const mockSnapshot: BEPSnapshot = {
  id: 'snap-1',
  scenarioId: 'sc-99',
  name: 'FY2025',
  description: 'Annual BEP',
  status: 'ready',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
}

const mockReport: BEPReport = {
  snapshotId: 'snap-1',
  bepRevenue: '240000',
  bepVolume: '1200',
  monthlyBEP: '20000',
  variableCostPct: '35',
  ebeRows: [],
  marginSensRows: [],
  fixedCostSensRows: [],
  warnings: [],
}

const mockPlan: OptimisationPlan = {
  id: 'plan-op-1',
  snapshotId: 'snap-1',
  name: 'Cost Reduction A',
  notes: '',
  createdAt: '2025-02-01T00:00:00Z',
  updatedAt: '2025-02-01T00:00:00Z',
}

describe('useBEPStore', () => {
  let store: ReturnType<typeof useBEPStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useBEPStore()
    vi.clearAllMocks()
  })

  // ── Initial state ──────────────────────────────────────────────────────
  describe('initial state', () => {
    it('snapshots is empty', () => { expect(store.snapshots).toEqual([]) })
    it('activeSnapshot is null', () => { expect(store.activeSnapshot).toBeNull() })
    it('report is null', () => { expect(store.report).toBeNull() })
    it('plans is empty', () => { expect(store.plans).toEqual([]) })
    it('activePlan is null', () => { expect(store.activePlan).toBeNull() })
    it('loading is false', () => { expect(store.loading).toBe(false) })
    it('error is null', () => { expect(store.error).toBeNull() })
  })

  // ── scenarioBase URL construction ──────────────────────────────────────
  describe('URL construction', () => {
    it('fetchSnapshots uses the correct scenario base URL', async () => {
      mockApi.get.mockResolvedValueOnce({ data: [mockSnapshot] })
      await store.fetchSnapshots()
      expect(mockApi.get).toHaveBeenCalledWith(SNAPSHOTS_URL)
    })

    it('fetchReport uses snapshot-scoped URL', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockReport })
      await store.fetchReport('snap-1')
      expect(mockApi.get).toHaveBeenCalledWith(`${snap('snap-1')}/report`)
    })

    it('createSnapshot POSTs to the scenario snapshots endpoint', async () => {
      mockApi.post.mockResolvedValueOnce({ data: mockSnapshot })
      mockApi.get.mockResolvedValueOnce({ data: [mockSnapshot] })
      await store.createSnapshot({ name: 'FY2025' })
      expect(mockApi.post).toHaveBeenCalledWith(SNAPSHOTS_URL, { name: 'FY2025' })
    })
  })

  // ── fetchSnapshots ─────────────────────────────────────────────────────
  describe('fetchSnapshots', () => {
    it('sets snapshots on success', async () => {
      mockApi.get.mockResolvedValueOnce({ data: [mockSnapshot] })
      await store.fetchSnapshots()
      expect(store.snapshots).toEqual([mockSnapshot])
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('sets error and keeps loading false on failure', async () => {
      mockApi.get.mockRejectedValueOnce({ response: { data: { message: 'Unauthorised' } } })
      await store.fetchSnapshots()
      expect(store.snapshots).toEqual([])
      expect(store.error).toBe('Unauthorised')
      expect(store.loading).toBe(false)
    })

    it('uses fallback error message when no response body', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('network'))
      await store.fetchSnapshots()
      expect(store.error).toBe('Failed to load snapshots')
    })

    it('clears previous error before new fetch', async () => {
      mockApi.get.mockRejectedValueOnce(new Error())
      await store.fetchSnapshots()
      expect(store.error).toBeTruthy()

      mockApi.get.mockResolvedValueOnce({ data: [mockSnapshot] })
      await store.fetchSnapshots()
      expect(store.error).toBeNull()
    })
  })

  // ── createSnapshot ─────────────────────────────────────────────────────
  describe('createSnapshot', () => {
    it('returns the created snapshot and refreshes list', async () => {
      mockApi.post.mockResolvedValueOnce({ data: mockSnapshot })
      mockApi.get.mockResolvedValueOnce({ data: [mockSnapshot] })

      const result = await store.createSnapshot({ name: 'FY2025' })
      expect(result).toEqual(mockSnapshot)
      expect(store.snapshots).toEqual([mockSnapshot])
    })

    it('returns null and sets error on failure', async () => {
      mockApi.post.mockRejectedValueOnce({ response: { data: { message: 'Invalid data' } } })
      const result = await store.createSnapshot({ name: '' })
      expect(result).toBeNull()
      expect(store.error).toBe('Invalid data')
    })

    it('uses fallback error message', async () => {
      mockApi.post.mockRejectedValueOnce(new Error())
      const result = await store.createSnapshot({})
      expect(result).toBeNull()
      expect(store.error).toBe('Failed to create snapshot')
    })
  })

  // ── updateSnapshot ─────────────────────────────────────────────────────
  describe('updateSnapshot', () => {
    it('PUTs to the correct URL and returns true', async () => {
      const updated = { ...mockSnapshot, name: 'Updated' }
      mockApi.put.mockResolvedValueOnce({ data: updated })
      mockApi.get.mockResolvedValueOnce({ data: [updated] })

      const result = await store.updateSnapshot('snap-1', { name: 'Updated' })
      expect(result).toBe(true)
      expect(mockApi.put).toHaveBeenCalledWith(snap('snap-1'), { name: 'Updated' })
      expect(store.activeSnapshot).toEqual(updated)
    })

    it('updates activeSnapshot with the response data', async () => {
      const updated = { ...mockSnapshot, description: 'New desc' }
      mockApi.put.mockResolvedValueOnce({ data: updated })
      mockApi.get.mockResolvedValueOnce({ data: [updated] })

      await store.updateSnapshot('snap-1', { description: 'New desc' })
      expect(store.activeSnapshot?.description).toBe('New desc')
    })

    it('returns false and sets error on failure', async () => {
      mockApi.put.mockRejectedValueOnce({ response: { data: { message: 'Conflict' } } })
      const result = await store.updateSnapshot('snap-1', {})
      expect(result).toBe(false)
      expect(store.error).toBe('Conflict')
    })
  })

  // ── deleteSnapshot ─────────────────────────────────────────────────────
  describe('deleteSnapshot', () => {
    it('DELETEs the correct URL and returns true', async () => {
      mockApi.delete.mockResolvedValueOnce({})
      mockApi.get.mockResolvedValueOnce({ data: [] })

      const result = await store.deleteSnapshot('snap-1')
      expect(result).toBe(true)
      expect(mockApi.delete).toHaveBeenCalledWith(snap('snap-1'))
    })

    it('clears activeSnapshot and report when deleting the active snapshot', async () => {
      store.activeSnapshot = mockSnapshot
      store.report = mockReport

      mockApi.delete.mockResolvedValueOnce({})
      mockApi.get.mockResolvedValueOnce({ data: [] })

      await store.deleteSnapshot('snap-1')
      expect(store.activeSnapshot).toBeNull()
      expect(store.report).toBeNull()
    })

    it('does NOT clear activeSnapshot when deleting a different snapshot', async () => {
      store.activeSnapshot = mockSnapshot // snap-1

      mockApi.delete.mockResolvedValueOnce({})
      mockApi.get.mockResolvedValueOnce({ data: [mockSnapshot] })

      await store.deleteSnapshot('snap-999') // different id
      expect(store.activeSnapshot).toEqual(mockSnapshot)
    })

    it('returns false and sets error on failure', async () => {
      mockApi.delete.mockRejectedValueOnce({ response: { data: { message: 'Not found' } } })
      const result = await store.deleteSnapshot('snap-x')
      expect(result).toBe(false)
      expect(store.error).toBe('Not found')
    })
  })

  // ── selectSnapshot ─────────────────────────────────────────────────────
  describe('selectSnapshot', () => {
    it('sets activeSnapshot when found in the list', async () => {
      store.snapshots = [mockSnapshot]

      // selectSnapshot calls: fixedCosts, variableCosts, sensitivityConfigs, plans
      mockApi.get.mockResolvedValue({ data: [] })

      await store.selectSnapshot('snap-1')
      expect(store.activeSnapshot).toEqual(mockSnapshot)
    })

    it('does not change activeSnapshot when id not in list', async () => {
      store.snapshots = [mockSnapshot]
      store.activeSnapshot = mockSnapshot
      mockApi.get.mockResolvedValue({ data: [] })

      await store.selectSnapshot('snap-not-found')
      // activeSnapshot unchanged — stays as the previously set value
      expect(store.activeSnapshot).toEqual(mockSnapshot)
    })

    it('fires parallel fetches for cost lines, sensitivity, and plans', async () => {
      store.snapshots = [mockSnapshot]
      mockApi.get.mockResolvedValue({ data: [] })

      await store.selectSnapshot('snap-1')

      const calledUrls = mockApi.get.mock.calls.map((c: any[]) => c[0])
      expect(calledUrls).toContain(`${snap('snap-1')}/fixed-costs`)
      expect(calledUrls).toContain(`${snap('snap-1')}/variable-costs`)
      expect(calledUrls).toContain(`${snap('snap-1')}/sensitivity-config`)
      expect(calledUrls).toContain(`${snap('snap-1')}/plans`)
    })
  })

  // ── fetchReport ────────────────────────────────────────────────────────
  describe('fetchReport', () => {
    it('sets report on success', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockReport })
      await store.fetchReport('snap-1')
      expect(store.report).toEqual(mockReport)
      expect(store.reportLoading).toBe(false)
    })

    it('sets error on failure', async () => {
      mockApi.get.mockRejectedValueOnce({ response: { data: { message: 'Compute failed' } } })
      await store.fetchReport('snap-1')
      expect(store.report).toBeNull()
      expect(store.error).toBe('Compute failed')
      expect(store.reportLoading).toBe(false)
    })

    it('uses fallback error message', async () => {
      mockApi.get.mockRejectedValueOnce(new Error())
      await store.fetchReport('snap-1')
      expect(store.error).toBe('Failed to compute BEP report')
    })
  })

  // ── cost line invalidation ─────────────────────────────────────────────
  describe('report invalidation on cost changes', () => {
    it('clears report when fixed cost lines are upserted', async () => {
      store.report = mockReport

      mockApi.put.mockResolvedValueOnce({})
      mockApi.get.mockResolvedValueOnce({ data: [] }) // fetchFixedCostLines

      await store.upsertFixedCostLines('snap-1', [])
      expect(store.report).toBeNull()
    })

    it('clears report when variable cost lines are upserted', async () => {
      store.report = mockReport

      mockApi.put.mockResolvedValueOnce({})
      mockApi.get.mockResolvedValueOnce({ data: [] })

      await store.upsertVariableCostLines('snap-1', [])
      expect(store.report).toBeNull()
    })

    it('clears report when sensitivity config is upserted', async () => {
      store.report = mockReport

      mockApi.put.mockResolvedValueOnce({})
      mockApi.get.mockResolvedValueOnce({ data: [] })

      await store.upsertSensitivityConfig('snap-1', 'margin', { stepSizePct: '5', rangePct: '20' })
      expect(store.report).toBeNull()
    })
  })

  // ── createOptimisationPlan ─────────────────────────────────────────────
  describe('createOptimisationPlan', () => {
    it('returns the plan and refreshes the plan list', async () => {
      mockApi.post.mockResolvedValueOnce({ data: mockPlan })
      mockApi.get.mockResolvedValueOnce({ data: [mockPlan] })

      const result = await store.createOptimisationPlan('snap-1', { name: 'Cost Reduction A' })
      expect(result).toEqual(mockPlan)
      expect(mockApi.post).toHaveBeenCalledWith(`${snap('snap-1')}/plans`, { name: 'Cost Reduction A' })
      expect(store.plans).toEqual([mockPlan])
    })

    it('returns null and sets error on failure', async () => {
      mockApi.post.mockRejectedValueOnce({ response: { data: { message: 'Duplicate name' } } })
      const result = await store.createOptimisationPlan('snap-1', { name: 'Cost Reduction A' })
      expect(result).toBeNull()
      expect(store.error).toBe('Duplicate name')
    })
  })

  // ── deleteOptimisationPlan ─────────────────────────────────────────────
  describe('deleteOptimisationPlan', () => {
    it('DELETEs and clears activePlan when it matches', async () => {
      store.activePlan = mockPlan
      store.optimisedReport = {} as any

      mockApi.delete.mockResolvedValueOnce({})
      mockApi.get.mockResolvedValueOnce({ data: [] })

      const result = await store.deleteOptimisationPlan('snap-1', 'plan-op-1')
      expect(result).toBe(true)
      expect(store.activePlan).toBeNull()
      expect(store.optimisedReport).toBeNull()
    })

    it('does NOT clear activePlan when deleting a different plan', async () => {
      store.activePlan = mockPlan // plan-op-1

      mockApi.delete.mockResolvedValueOnce({})
      mockApi.get.mockResolvedValueOnce({ data: [mockPlan] })

      await store.deleteOptimisationPlan('snap-1', 'plan-op-999')
      expect(store.activePlan).toEqual(mockPlan)
    })

    it('returns false and sets error on failure', async () => {
      mockApi.delete.mockRejectedValueOnce({ response: { data: { message: 'Cannot delete' } } })
      const result = await store.deleteOptimisationPlan('snap-1', 'plan-op-1')
      expect(result).toBe(false)
      expect(store.error).toBe('Cannot delete')
    })
  })

  // ── selectPlan ─────────────────────────────────────────────────────────
  describe('selectPlan', () => {
    it('sets activePlan when found in plans list', async () => {
      store.plans = [mockPlan]
      store.activeSnapshot = mockSnapshot // needed for savings URLs

      mockApi.get.mockResolvedValue({ data: [] })

      await store.selectPlan('snap-1', 'plan-op-1')
      expect(store.activePlan).toEqual(mockPlan)
    })

    it('fetches savings and PCG review items for the plan', async () => {
      store.plans = [mockPlan]
      store.activeSnapshot = mockSnapshot
      mockApi.get.mockResolvedValue({ data: [] })

      await store.selectPlan('snap-1', 'plan-op-1')

      const calledUrls = mockApi.get.mock.calls.map((c: any[]) => c[0])
      expect(calledUrls.some((u: string) => u.includes('/savings/fixed'))).toBe(true)
      expect(calledUrls.some((u: string) => u.includes('/savings/variable'))).toBe(true)
      expect(calledUrls.some((u: string) => u.includes('/pcg-review'))).toBe(true)
    })
  })

  // ── PCG accounts cache ─────────────────────────────────────────────────
  describe('fetchPCGAccounts', () => {
    it('fetches from the correct endpoint', async () => {
      mockApi.get.mockResolvedValueOnce({ data: [] })
      await store.fetchPCGAccounts()
      expect(mockApi.get).toHaveBeenCalledWith(`${SCENARIO_BASE}/pcg-accounts`)
    })

    it('does not re-fetch if pcgAccounts already populated', async () => {
      store.pcgAccounts = [{ id: 'acc-1', code: '600', label: 'Sales', amount: '100000', category: 'revenue' }]
      await store.fetchPCGAccounts()
      expect(mockApi.get).not.toHaveBeenCalled()
    })
  })

  // ── scenarioBase guard ─────────────────────────────────────────────────
  describe('scenarioBase guard', () => {
    it('sets error when no active plan (guard caught internally)', async () => {
      const { usePlanStore } = await import('@/features/plans/stores/planStore')
      vi.mocked(usePlanStore).mockReturnValueOnce({ activePlan: null } as any)

      await store.fetchSnapshots()
      expect(store.error).toBeTruthy()
      expect(store.loading).toBe(false)
    })

    it('sets error when no active scenario (guard caught internally)', async () => {
      const { useScenarioStore } = await import('@/features/scenarios/stores/scenarioStore')
      vi.mocked(useScenarioStore).mockReturnValueOnce({ activeScenario: null } as any)

      await store.fetchSnapshots()
      expect(store.error).toBeTruthy()
      expect(store.loading).toBe(false)
    })
  })

  // ── upsertFixedCostLines / upsertVariableCostLines ─────────────────────
  describe('upsertFixedCostLines', () => {
    it('PUTs to the correct URL', async () => {
      mockApi.put.mockResolvedValueOnce({})
      mockApi.get.mockResolvedValueOnce({ data: [] })

      await store.upsertFixedCostLines('snap-1', [])
      expect(mockApi.put).toHaveBeenCalledWith(`${snap('snap-1')}/fixed-costs`, [])
    })

    it('returns true on success', async () => {
      mockApi.put.mockResolvedValueOnce({})
      mockApi.get.mockResolvedValueOnce({ data: [] })
      expect(await store.upsertFixedCostLines('snap-1', [])).toBe(true)
    })

    it('returns false and sets error on failure', async () => {
      mockApi.put.mockRejectedValueOnce({ response: { data: { message: 'Bad lines' } } })
      expect(await store.upsertFixedCostLines('snap-1', [])).toBe(false)
      expect(store.error).toBe('Bad lines')
    })
  })

  describe('upsertVariableCostLines', () => {
    it('PUTs to the correct URL', async () => {
      mockApi.put.mockResolvedValueOnce({})
      mockApi.get.mockResolvedValueOnce({ data: [] })

      await store.upsertVariableCostLines('snap-1', [])
      expect(mockApi.put).toHaveBeenCalledWith(`${snap('snap-1')}/variable-costs`, [])
    })

    it('returns false and sets error on failure', async () => {
      mockApi.put.mockRejectedValueOnce({ response: { data: { message: 'Invalid pct' } } })
      expect(await store.upsertVariableCostLines('snap-1', [])).toBe(false)
      expect(store.error).toBe('Invalid pct')
    })
  })

  // ── previewFromPlan ────────────────────────────────────────────────────
  describe('previewFromPlan', () => {
    const mockPreview = {
      fixedCostsTotal: '150000',
      contributionMarginPct: '42.5',
      avgOrderValue: '500',
      yearIndex: 0,
    }

    it('GETs the correct scenario-level URL with the year query param', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockPreview })

      await store.previewFromPlan(1)

      expect(mockApi.get).toHaveBeenCalledWith(`${SCENARIO_BASE}/plan-preview?year=1`)
    })

    it('encodes the year correctly for year 5', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockPreview })

      await store.previewFromPlan(5)

      expect(mockApi.get).toHaveBeenCalledWith(`${SCENARIO_BASE}/plan-preview?year=5`)
    })

    it('returns the preview data on success', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockPreview })

      const result = await store.previewFromPlan(2)

      expect(result).toEqual(mockPreview)
    })

    it('returns null and sets error on API failure', async () => {
      mockApi.get.mockRejectedValueOnce({
        response: { data: { error: { message: 'Plan not found' } } },
      })

      const result = await store.previewFromPlan(1)

      expect(result).toBeNull()
      expect(store.error).toBe('Plan not found')
    })

    it('uses fallback error message when no response body', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('network'))

      const result = await store.previewFromPlan(1)

      expect(result).toBeNull()
      expect(store.error).toBe('Failed to load plan preview')
    })

    it('does NOT modify snapshots or activeSnapshot (read-only)', async () => {
      store.snapshots = [mockSnapshot]
      store.activeSnapshot = mockSnapshot
      mockApi.get.mockResolvedValueOnce({ data: mockPreview })

      await store.previewFromPlan(3)

      expect(store.snapshots).toEqual([mockSnapshot])
      expect(store.activeSnapshot).toEqual(mockSnapshot)
    })

    it('returns null without avgOrderValue when omitted by the API', async () => {
      const previewNoAvg = { fixedCostsTotal: '80000', contributionMarginPct: '35', yearIndex: 1 }
      mockApi.get.mockResolvedValueOnce({ data: previewNoAvg })

      const result = await store.previewFromPlan(2)

      expect(result).toEqual(previewNoAvg)
      expect(result?.avgOrderValue).toBeUndefined()
    })
  })

  // ── importFromPlan ──────────────────────────────────────────────────────
  describe('importFromPlan', () => {
    const importedSnap: BEPSnapshot = {
      ...mockSnapshot,
      // @ts-expect-error — extra fields used by backend but not typed in full on BEPSnapshot
      source: 'imported',
      fixedCostsTotal: '150000',
      contributionMarginPct: '42.5',
    }

    it('POSTs to the correct URL with the year query param', async () => {
      mockApi.post.mockResolvedValueOnce({ data: importedSnap })
      mockApi.get.mockResolvedValueOnce({ data: [importedSnap] }) // fetchSnapshots refresh

      await store.importFromPlan('snap-1', 1)

      expect(mockApi.post).toHaveBeenCalledWith(
        `${snap('snap-1')}/import-from-plan?year=1`,
      )
    })

    it('encodes the year correctly for year 5', async () => {
      mockApi.post.mockResolvedValueOnce({ data: importedSnap })
      mockApi.get.mockResolvedValueOnce({ data: [importedSnap] })

      await store.importFromPlan('snap-1', 5)

      expect(mockApi.post).toHaveBeenCalledWith(
        `${snap('snap-1')}/import-from-plan?year=5`,
      )
    })

    it('updates activeSnapshot with the returned snapshot data', async () => {
      mockApi.post.mockResolvedValueOnce({ data: importedSnap })
      mockApi.get.mockResolvedValueOnce({ data: [importedSnap] })

      await store.importFromPlan('snap-1', 2)

      expect(store.activeSnapshot).toEqual(importedSnap)
    })

    it('refreshes the snapshots list after a successful import', async () => {
      mockApi.post.mockResolvedValueOnce({ data: importedSnap })
      mockApi.get.mockResolvedValueOnce({ data: [importedSnap] })

      await store.importFromPlan('snap-1', 3)

      expect(mockApi.get).toHaveBeenCalledWith(SNAPSHOTS_URL)
      expect(store.snapshots).toEqual([importedSnap])
    })

    it('returns true on success', async () => {
      mockApi.post.mockResolvedValueOnce({ data: importedSnap })
      mockApi.get.mockResolvedValueOnce({ data: [importedSnap] })

      const result = await store.importFromPlan('snap-1', 1)
      expect(result).toBe(true)
    })

    it('returns false and sets error on API failure', async () => {
      mockApi.post.mockRejectedValueOnce({
        response: { data: { error: { message: 'Plan report unavailable' } } },
      })

      const result = await store.importFromPlan('snap-1', 1)
      expect(result).toBe(false)
      expect(store.error).toBe('Plan report unavailable')
    })

    it('uses fallback error message when no response body', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('network'))

      const result = await store.importFromPlan('snap-1', 1)
      expect(result).toBe(false)
      expect(store.error).toBe('Failed to import from plan')
    })

    it('does NOT modify activeSnapshot when the request fails', async () => {
      store.activeSnapshot = mockSnapshot
      mockApi.post.mockRejectedValueOnce(new Error())

      await store.importFromPlan('snap-1', 1)
      expect(store.activeSnapshot).toEqual(mockSnapshot)
    })

    it('does NOT call fetchSnapshots when the request fails', async () => {
      mockApi.post.mockRejectedValueOnce(new Error())

      await store.importFromPlan('snap-1', 1)
      expect(mockApi.get).not.toHaveBeenCalled()
    })
  })

  // ── fetchMultiYearReport ─────────────────────────────────────────────────
  describe('fetchMultiYearReport', () => {
    const mockMultiYearReport = {
      years: [
        {
          year: 1,
          fixedCosts: '600000',
          revenue: '1000000',
          contributionMarginPct: '40',
          bepRevenue: '1500000',
          bepRevenueUndefined: false,
          revenueAboveBep: false,
          annualEbe: '-200000',
          cumulativeEbe: '-200000',
          isFirstAnnualBep: false,
          isCumulativeBepCrossover: false,
        },
        {
          year: 2,
          fixedCosts: '700000',
          revenue: '2000000',
          contributionMarginPct: '42',
          bepRevenue: '1666667',
          bepRevenueUndefined: false,
          revenueAboveBep: true,
          annualEbe: '140000',
          cumulativeEbe: '-60000',
          isFirstAnnualBep: true,
          isCumulativeBepCrossover: false,
        },
        {
          year: 3,
          fixedCosts: '750000',
          revenue: '2500000',
          contributionMarginPct: '44',
          bepRevenue: '1704545',
          bepRevenueUndefined: false,
          revenueAboveBep: true,
          annualEbe: '350000',
          cumulativeEbe: '290000',
          isFirstAnnualBep: false,
          isCumulativeBepCrossover: true,
        },
        {
          year: 4,
          fixedCosts: '800000',
          revenue: '3000000',
          contributionMarginPct: '46',
          bepRevenue: '1739130',
          bepRevenueUndefined: false,
          revenueAboveBep: true,
          annualEbe: '580000',
          cumulativeEbe: '870000',
          isFirstAnnualBep: false,
          isCumulativeBepCrossover: false,
        },
        {
          year: 5,
          fixedCosts: '850000',
          revenue: '3500000',
          contributionMarginPct: '48',
          bepRevenue: '1770833',
          bepRevenueUndefined: false,
          revenueAboveBep: true,
          annualEbe: '830000',
          cumulativeEbe: '1700000',
          isFirstAnnualBep: false,
          isCumulativeBepCrossover: false,
        },
      ],
      firstProfitableYear: 2,
      cumulativeBepYear: 3,
      cumulativeBepMonth: 3,
      totalCumulativeEbe: '1700000',
    }

    it('GETs the correct scenario-level URL', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockMultiYearReport })

      await store.fetchMultiYearReport()

      expect(mockApi.get).toHaveBeenCalledWith(`${SCENARIO_BASE}/multi-year-report`)
    })

    it('sets multiYearReport on success', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockMultiYearReport })

      await store.fetchMultiYearReport()

      expect(store.multiYearReport).toEqual(mockMultiYearReport)
    })

    it('sets multiYearLoading to true during request then false after', async () => {
      let loadingDuring = false
      mockApi.get.mockImplementationOnce(async () => {
        loadingDuring = store.multiYearLoading
        return { data: mockMultiYearReport }
      })

      await store.fetchMultiYearReport()

      expect(loadingDuring).toBe(true)
      expect(store.multiYearLoading).toBe(false)
    })

    it('clears multiYearLoading to false even on API failure', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('timeout'))

      await store.fetchMultiYearReport()

      expect(store.multiYearLoading).toBe(false)
    })

    it('clears previous error before fetching', async () => {
      store.error = 'stale error'
      mockApi.get.mockResolvedValueOnce({ data: mockMultiYearReport })

      await store.fetchMultiYearReport()

      expect(store.error).toBeNull()
    })

    it('sets error on API failure', async () => {
      mockApi.get.mockRejectedValueOnce({
        response: { data: { error: { message: 'Plan not compiled' } } },
      })

      await store.fetchMultiYearReport()

      expect(store.error).toBe('Plan not compiled')
      expect(store.multiYearReport).toBeNull()
    })

    it('uses fallback error message when no response body', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('network'))

      await store.fetchMultiYearReport()

      expect(store.error).toBe('Failed to compute multi-year BEP')
    })

    it('uses .data.message as secondary error source', async () => {
      mockApi.get.mockRejectedValueOnce({
        response: { data: { message: 'scenario not found' } },
      })

      await store.fetchMultiYearReport()

      expect(store.error).toBe('scenario not found')
    })

    it('does NOT overwrite multiYearReport on failure (keeps previous data)', async () => {
      store.multiYearReport = mockMultiYearReport as any
      mockApi.get.mockRejectedValueOnce(new Error('timeout'))

      await store.fetchMultiYearReport()

      // report should be unchanged — store does not clear it on error
      expect(store.multiYearReport).toEqual(mockMultiYearReport)
    })

    it('multiYearReport remains null initially (not undefined)', () => {
      expect(store.multiYearReport).toBeNull()
    })

    it('does NOT affect snapshots, activeSnapshot, or report state', async () => {
      store.snapshots = [mockSnapshot]
      store.activeSnapshot = mockSnapshot
      store.report = mockReport
      mockApi.get.mockResolvedValueOnce({ data: mockMultiYearReport })

      await store.fetchMultiYearReport()

      expect(store.snapshots).toEqual([mockSnapshot])
      expect(store.activeSnapshot).toEqual(mockSnapshot)
      expect(store.report).toEqual(mockReport)
    })

    it('$reset clears multiYearReport', async () => {
      store.multiYearReport = mockMultiYearReport as any

      store.$reset()

      expect(store.multiYearReport).toBeNull()
    })
  })
})
