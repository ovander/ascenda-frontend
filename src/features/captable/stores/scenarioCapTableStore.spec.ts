import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// ── Hoist mocks ─────────────────────────────────────────────────────────────
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
  usePlanStore: vi.fn(() => ({ activePlan: { id: 'plan-abc' } })),
}))
vi.mock('@/features/scenarios/stores/scenarioStore', () => ({
  useScenarioStore: vi.fn(() => ({ activeScenario: { id: 'scen-xyz' } })),
}))

import { useScenarioCapTableStore } from './scenarioCapTableStore'
import type { CapTableRound } from '@/types'

const BASE = '/api/v1/plans/plan-abc/scenarios/scen-xyz/cap-table'

function makeRound(overrides: Partial<CapTableRound> = {}): CapTableRound {
  return {
    id: 'round-1',
    scenarioId: 'scen-xyz',
    phaseNumber: 1,
    label: 'Seed',
    eventType: 'equity',
    nominalValueCents: 1,
    splitCoefficient: '1',
    newSharesCreated: 0,
    amountRaisedK: '500',
    pctGranted: '0.20',
    shareClassType: 'ordinary',
    sortOrder: 0,
    fiplanSynced: false,
    isSyncAmountDivergent: false,
    ...overrides,
  } as unknown as CapTableRound
}

describe('scenarioCapTableStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ── Fix-4: staleness / isSyncAmountDivergent ──────────────────────────────

  describe('fetchRounds', () => {
    it('stores rounds returned by the API, including isSyncAmountDivergent flag', async () => {
      const round = makeRound({ fiplanSynced: true, isSyncAmountDivergent: true })
      mockApi.get.mockResolvedValueOnce({ data: [round] })

      const store = useScenarioCapTableStore()
      await store.fetchRounds()

      expect(mockApi.get).toHaveBeenCalledWith(`${BASE}/rounds`)
      expect(store.rounds).toHaveLength(1)
      expect(store.rounds[0].isSyncAmountDivergent).toBe(true)
    })

    it('sets error when the request fails', async () => {
      mockApi.get.mockRejectedValueOnce({ response: { data: { message: 'Network error' } } })

      const store = useScenarioCapTableStore()
      await store.fetchRounds()

      expect(store.error).toBe('Network error')
      expect(store.rounds).toHaveLength(0)
    })
  })

  describe('syncRoundToFiplan', () => {
    it('calls the sync endpoint and updates the local round record', async () => {
      const initial = makeRound({ fiplanSynced: false, isSyncAmountDivergent: false })
      const synced = makeRound({
        fiplanSynced: true,
        isSyncAmountDivergent: false,
        fiplanSyncedAmountK: '500',
      } as any)

      // Pre-populate rounds
      mockApi.get.mockResolvedValueOnce({ data: [initial] })
      const store = useScenarioCapTableStore()
      await store.fetchRounds()

      mockApi.post.mockResolvedValueOnce({ data: synced })
      const result = await store.syncRoundToFiplan('round-1', 0)

      expect(mockApi.post).toHaveBeenCalledWith(`${BASE}/rounds/round-1/sync-to-fiplan`, {
        fiscalYearIndex: 0,
      })
      expect(result).toEqual(synced)
      // Local list updated in-place
      expect(store.rounds[0].fiplanSynced).toBe(true)
      expect(store.rounds[0].isSyncAmountDivergent).toBe(false)
    })

    it('sets syncError when the sync request fails', async () => {
      mockApi.post.mockRejectedValueOnce({
        response: { data: { error: { message: 'Sync failed' } } },
      })

      const store = useScenarioCapTableStore()
      const result = await store.syncRoundToFiplan('round-1', 0)

      expect(result).toBeNull()
      expect(store.syncError).toBe('Sync failed')
    })
  })

  describe('unlinkFromFiplan', () => {
    it('calls the unlink endpoint and clears the link on the local round', async () => {
      const linked = makeRound({ fiplanSynced: true, isSyncAmountDivergent: false })
      const unlinked = makeRound({ fiplanSynced: false, isSyncAmountDivergent: false })

      mockApi.get.mockResolvedValueOnce({ data: [linked] })
      const store = useScenarioCapTableStore()
      await store.fetchRounds()

      mockApi.delete.mockResolvedValueOnce({ data: unlinked })
      const result = await store.unlinkFromFiplan('round-1')

      expect(mockApi.delete).toHaveBeenCalledWith(`${BASE}/rounds/round-1/sync-to-fiplan`)
      expect(result).toEqual(unlinked)
      expect(store.rounds[0].fiplanSynced).toBe(false)
    })
  })

  describe('$reset', () => {
    it('clears all state', async () => {
      mockApi.get.mockResolvedValueOnce({ data: [makeRound()] })
      const store = useScenarioCapTableStore()
      await store.fetchRounds()
      expect(store.rounds).toHaveLength(1)

      store.$reset()
      expect(store.rounds).toHaveLength(0)
      expect(store.error).toBeNull()
      expect(store.syncError).toBeNull()
    })
  })
})
