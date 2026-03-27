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
  usePlanStore: vi.fn(() => ({ activePlan: { id: 'plan-123' } })),
}))

import { useCapTableStore } from './capTableStore'
import type { CapTableSummary, Shareholder } from '@/types'

const BASE = '/api/v1/plans/plan-123/cap-table'

const mockSummary: CapTableSummary = {
  planId: 'plan-123',
  shareholders: [
    {
      id: 'sh-1',
      planId: 'plan-123',
      name: 'Alice',
      type: 'founder',
      shares: 600,
      ownershipPct: '60',
      investedAmount: '50000',
      notes: '',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    },
    {
      id: 'sh-2',
      planId: 'plan-123',
      name: 'Bob',
      type: 'investor',
      shares: 400,
      ownershipPct: '40',
      investedAmount: '30000',
      notes: '',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    },
  ],
  totalShares: 1000,
  totalInvested: '80000',
}

describe('useCapTableStore', () => {
  let store: ReturnType<typeof useCapTableStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useCapTableStore()
    vi.clearAllMocks()
  })

  // ── Initial state ──────────────────────────────────────────────────────
  describe('initial state', () => {
    it('summary is null', () => {
      expect(store.summary).toBeNull()
    })

    it('loading is false', () => {
      expect(store.loading).toBe(false)
    })

    it('error is null', () => {
      expect(store.error).toBeNull()
    })
  })

  // ── fetchSummary ───────────────────────────────────────────────────────
  describe('fetchSummary', () => {
    it('sets summary on success', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockSummary })
      await store.fetchSummary()
      expect(store.summary).toEqual(mockSummary)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('calls the correct endpoint', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockSummary })
      await store.fetchSummary()
      expect(mockApi.get).toHaveBeenCalledWith(BASE)
    })

    it('sets error message on API failure', async () => {
      mockApi.get.mockRejectedValueOnce({ response: { data: { message: 'Not found' } } })
      await store.fetchSummary()
      expect(store.summary).toBeNull()
      expect(store.error).toBe('Not found')
      expect(store.loading).toBe(false)
    })

    it('uses fallback error message when response has no message', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('network error'))
      await store.fetchSummary()
      expect(store.error).toBe('Failed to load cap table')
    })

    it('resets error before each fetch', async () => {
      mockApi.get.mockRejectedValueOnce({ response: { data: { message: 'err1' } } })
      await store.fetchSummary()
      expect(store.error).toBe('err1')

      mockApi.get.mockResolvedValueOnce({ data: mockSummary })
      await store.fetchSummary()
      expect(store.error).toBeNull()
    })
  })

  // ── createShareholder ──────────────────────────────────────────────────
  describe('createShareholder', () => {
    const newShData = {
      name: 'Charlie',
      type: 'investor' as const,
      shares: 200,
      ownershipPct: '20',
      investedAmount: '15000',
    }

    const createdSh: Shareholder = {
      id: 'sh-3',
      planId: 'plan-123',
      name: 'Charlie',
      type: 'investor',
      shares: 200,
      ownershipPct: '20',
      investedAmount: '15000',
      notes: '',
      createdAt: '2025-06-01T00:00:00Z',
      updatedAt: '2025-06-01T00:00:00Z',
    }

    it('POSTs to the correct endpoint and returns the created shareholder', async () => {
      mockApi.post.mockResolvedValueOnce({ data: createdSh })
      mockApi.get.mockResolvedValueOnce({ data: mockSummary }) // fetchSummary call

      const result = await store.createShareholder(newShData)

      expect(mockApi.post).toHaveBeenCalledWith(`${BASE}/shareholders`, newShData)
      expect(result).toEqual(createdSh)
    })

    it('calls fetchSummary after creation', async () => {
      mockApi.post.mockResolvedValueOnce({ data: createdSh })
      mockApi.get.mockResolvedValueOnce({ data: mockSummary })

      await store.createShareholder(newShData)

      expect(mockApi.get).toHaveBeenCalledWith(BASE)
    })

    it('returns null and sets error on failure', async () => {
      mockApi.post.mockRejectedValueOnce({ response: { data: { message: 'Validation error' } } })

      const result = await store.createShareholder(newShData)

      expect(result).toBeNull()
      expect(store.error).toBe('Validation error')
    })

    it('uses fallback error message on unexpected failure', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('network'))

      const result = await store.createShareholder(newShData)

      expect(result).toBeNull()
      expect(store.error).toBe('Failed to add shareholder')
    })
  })

  // ── updateShareholder ──────────────────────────────────────────────────
  describe('updateShareholder', () => {
    it('PUTs to the correct endpoint and returns true on success', async () => {
      mockApi.put.mockResolvedValueOnce({})
      mockApi.get.mockResolvedValueOnce({ data: mockSummary })

      const result = await store.updateShareholder('sh-1', { shares: 700, ownershipPct: '70' })

      expect(mockApi.put).toHaveBeenCalledWith(`${BASE}/shareholders/sh-1`, { shares: 700, ownershipPct: '70' })
      expect(result).toBe(true)
    })

    it('calls fetchSummary after update', async () => {
      mockApi.put.mockResolvedValueOnce({})
      mockApi.get.mockResolvedValueOnce({ data: mockSummary })

      await store.updateShareholder('sh-1', { name: 'Alice Updated' })

      expect(mockApi.get).toHaveBeenCalledWith(BASE)
    })

    it('returns false and sets error on failure', async () => {
      mockApi.put.mockRejectedValueOnce({ response: { data: { message: 'Not found' } } })

      const result = await store.updateShareholder('sh-999', { name: 'Nobody' })

      expect(result).toBe(false)
      expect(store.error).toBe('Not found')
    })

    it('uses fallback error message on unexpected failure', async () => {
      mockApi.put.mockRejectedValueOnce(new Error())

      const result = await store.updateShareholder('sh-1', {})
      expect(result).toBe(false)
      expect(store.error).toBe('Failed to update shareholder')
    })
  })

  // ── deleteShareholder ──────────────────────────────────────────────────
  describe('deleteShareholder', () => {
    it('DELETEs the correct endpoint and returns true on success', async () => {
      mockApi.delete.mockResolvedValueOnce({})
      mockApi.get.mockResolvedValueOnce({ data: mockSummary })

      const result = await store.deleteShareholder('sh-1')

      expect(mockApi.delete).toHaveBeenCalledWith(`${BASE}/shareholders/sh-1`)
      expect(result).toBe(true)
    })

    it('calls fetchSummary after deletion', async () => {
      mockApi.delete.mockResolvedValueOnce({})
      mockApi.get.mockResolvedValueOnce({ data: mockSummary })

      await store.deleteShareholder('sh-2')

      expect(mockApi.get).toHaveBeenCalledWith(BASE)
    })

    it('returns false and sets error on failure', async () => {
      mockApi.delete.mockRejectedValueOnce({ response: { data: { message: 'Cannot delete' } } })

      const result = await store.deleteShareholder('sh-1')

      expect(result).toBe(false)
      expect(store.error).toBe('Cannot delete')
    })

    it('uses fallback error message on unexpected failure', async () => {
      mockApi.delete.mockRejectedValueOnce(new Error())

      const result = await store.deleteShareholder('sh-1')
      expect(result).toBe(false)
      expect(store.error).toBe('Failed to delete shareholder')
    })
  })

  // ── $reset ─────────────────────────────────────────────────────────────
  describe('$reset', () => {
    it('clears summary and error', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockSummary })
      await store.fetchSummary()
      expect(store.summary).not.toBeNull()

      store.$reset()
      expect(store.summary).toBeNull()
      expect(store.error).toBeNull()
    })
  })

  // ── basePath guard ─────────────────────────────────────────────────────
  describe('basePath guard', () => {
    it('sets error message when no active plan is set', async () => {
      // basePath() throws internally but fetchSummary catches it
      const { usePlanStore } = await import('@/features/plans/stores/planStore')
      vi.mocked(usePlanStore).mockReturnValueOnce({ activePlan: null } as any)

      await store.fetchSummary()
      // Error is caught internally; store should report it
      expect(store.error).toBeTruthy()
      expect(store.loading).toBe(false)
    })
  })

  // ── URL construction ───────────────────────────────────────────────────
  describe('URL construction', () => {
    it('builds correct base path from active plan id', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockSummary })
      await store.fetchSummary()
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/plans/plan-123/cap-table')
    })
  })
})
