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

import { useSnapshotStore } from './snapshotStore'

const BASE = '/api/v1/plans/plan-1/scenarios/sc-1/snapshots'
const mockSnapshot = { id: 'snap-1', label: 'Q1 2025', createdAt: '2025-01-01T00:00:00Z' }
const mockSnapshotData = { pnl: {}, cash: {} }

describe('useSnapshotStore', () => {
  let store: ReturnType<typeof useSnapshotStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useSnapshotStore()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('snapshots is empty', () => { expect(store.snapshots).toEqual([]) })
    it('snapshotData is null', () => { expect(store.snapshotData).toBeNull() })
    it('loading is false', () => { expect(store.loading).toBe(false) })
    it('error is null', () => { expect(store.error).toBeNull() })
  })

  describe('fetchSnapshots', () => {
    it('sets snapshots on success', async () => {
      mockApi.get.mockResolvedValue({ data: [mockSnapshot] })
      await store.fetchSnapshots()
      expect(store.snapshots).toEqual([mockSnapshot])
    })

    it('handles wrapper response { data: [] }', async () => {
      mockApi.get.mockResolvedValue({ data: { data: [mockSnapshot] } })
      await store.fetchSnapshots()
      expect(store.snapshots).toEqual([mockSnapshot])
    })

    it('calls correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ data: [] })
      await store.fetchSnapshots()
      expect(mockApi.get).toHaveBeenCalledWith(`${BASE}/`)
    })

    it('sets error on failure and re-throws', async () => {
      mockApi.get.mockRejectedValue({})
      await expect(store.fetchSnapshots()).rejects.toThrow()
      expect(store.error).toBe('Failed to fetch snapshots')
    })
  })

  describe('createSnapshot', () => {
    it('creates snapshot and refreshes list', async () => {
      mockApi.post.mockResolvedValue({ data: mockSnapshot })
      mockApi.get.mockResolvedValue({ data: [mockSnapshot] })
      await store.createSnapshot({ label: 'Q1 2025' })
      expect(mockApi.post).toHaveBeenCalledWith(`${BASE}/`, { label: 'Q1 2025' })
      expect(store.snapshots).toEqual([mockSnapshot])
    })

    it('sets error on failure and re-throws', async () => {
      mockApi.post.mockRejectedValue({})
      await expect(store.createSnapshot({ label: 'Q1' })).rejects.toThrow()
      expect(store.error).toBe('Failed to create snapshot')
    })
  })

  describe('fetchSnapshotData', () => {
    it('sets snapshotData on success', async () => {
      mockApi.get.mockResolvedValue({ data: mockSnapshotData })
      await store.fetchSnapshotData('snap-1')
      expect(store.snapshotData).toEqual(mockSnapshotData)
    })

    it('calls correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ data: mockSnapshotData })
      await store.fetchSnapshotData('snap-1')
      expect(mockApi.get).toHaveBeenCalledWith(`${BASE}/snap-1/data`)
    })

    it('sets error on failure and re-throws', async () => {
      mockApi.get.mockRejectedValue({})
      await expect(store.fetchSnapshotData('snap-1')).rejects.toThrow()
      expect(store.error).toBe('Failed to fetch snapshot data')
    })
  })

  describe('restoreSnapshot', () => {
    it('calls correct endpoint', async () => {
      mockApi.post.mockResolvedValue({})
      mockApi.get.mockResolvedValue({ data: [] })
      await store.restoreSnapshot('snap-1')
      expect(mockApi.post).toHaveBeenCalledWith(`${BASE}/snap-1/restore`)
    })

    it('sets error on failure and re-throws', async () => {
      mockApi.post.mockRejectedValue({})
      await expect(store.restoreSnapshot('snap-1')).rejects.toThrow()
      expect(store.error).toBe('Failed to restore snapshot')
    })
  })

  describe('$reset', () => {
    it('clears snapshots, snapshotData, and error', async () => {
      mockApi.get.mockResolvedValue({ data: [mockSnapshot] })
      await store.fetchSnapshots()
      store.$reset()
      expect(store.snapshots).toEqual([])
      expect(store.snapshotData).toBeNull()
      expect(store.error).toBeNull()
    })
  })
})
