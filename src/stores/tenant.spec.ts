import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const { mockApi } = vi.hoisted(() => {
  const mockApi = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }
  return { mockApi }
})

vi.mock('@/composables/useApi', () => ({ default: mockApi }))

import { useTenantStore } from './tenant'

const mockTenant = { id: 'tenant-1', name: 'Acme', slug: 'acme', tier: 'pro', isActive: true }
const mockUsers = [
  { id: 'u1', email: 'alice@acme.com', name: 'Alice', role: 'editor' },
  { id: 'u2', email: 'bob@acme.com', name: 'Bob', role: 'viewer' },
]

describe('useTenantStore', () => {
  let store: ReturnType<typeof useTenantStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useTenantStore()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('tenant is null', () => { expect(store.tenant).toBeNull() })
    it('users is empty', () => { expect(store.users).toEqual([]) })
    it('loading is false', () => { expect(store.loading).toBe(false) })
    it('error is null', () => { expect(store.error).toBeNull() })
  })

  describe('fetchTenant', () => {
    it('sets tenant on success', async () => {
      mockApi.get.mockResolvedValue({ data: mockTenant })
      await store.fetchTenant()
      expect(store.tenant).toEqual(mockTenant)
    })

    it('calls correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ data: mockTenant })
      await store.fetchTenant()
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/tenant/')
    })

    it('sets loading true then false', async () => {
      let seenLoading = false
      mockApi.get.mockImplementation(async () => {
        seenLoading = store.loading
        return { data: mockTenant }
      })
      await store.fetchTenant()
      expect(seenLoading).toBe(true)
      expect(store.loading).toBe(false)
    })

    it('sets error on failure', async () => {
      mockApi.get.mockRejectedValue({ response: { data: { message: 'Not found' } } })
      await store.fetchTenant()
      expect(store.error).toBe('Not found')
    })

    it('sets fallback error message', async () => {
      mockApi.get.mockRejectedValue({})
      await store.fetchTenant()
      expect(store.error).toBe('Failed to fetch tenant')
    })
  })

  describe('updateTenant', () => {
    it('updates tenant on success', async () => {
      const updated = { ...mockTenant, name: 'Acme Corp' }
      mockApi.put.mockResolvedValue({ data: updated })
      await store.updateTenant({ name: 'Acme Corp' })
      expect(store.tenant).toEqual(updated)
    })

    it('calls correct endpoint with payload', async () => {
      mockApi.put.mockResolvedValue({ data: mockTenant })
      await store.updateTenant({ tier: 'enterprise' })
      expect(mockApi.put).toHaveBeenCalledWith('/api/v1/tenant/', { tier: 'enterprise' })
    })
  })

  describe('fetchUsers', () => {
    it('sets users from array response', async () => {
      mockApi.get.mockResolvedValue({ data: mockUsers })
      await store.fetchUsers()
      expect(store.users).toEqual(mockUsers)
    })

    it('sets users from { data } wrapper response', async () => {
      mockApi.get.mockResolvedValue({ data: { data: mockUsers } })
      await store.fetchUsers()
      expect(store.users).toEqual(mockUsers)
    })

    it('calls correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ data: [] })
      await store.fetchUsers()
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/users/')
    })

    it('sets error on failure', async () => {
      mockApi.get.mockRejectedValue({ response: { data: { error: { message: 'Forbidden' } } } })
      await store.fetchUsers()
      expect(store.error).toBe('Forbidden')
    })
  })

  describe('inviteUser', () => {
    it('posts invite and refreshes users', async () => {
      mockApi.post.mockResolvedValue({})
      mockApi.get.mockResolvedValue({ data: mockUsers })
      await store.inviteUser('new@acme.com', 'viewer')
      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/users/invite', { email: 'new@acme.com', role: 'viewer' })
      expect(store.users).toEqual(mockUsers)
    })
  })

  describe('updateUserRole', () => {
    it('puts role and refreshes users', async () => {
      mockApi.put.mockResolvedValue({})
      mockApi.get.mockResolvedValue({ data: mockUsers })
      await store.updateUserRole('u1', 'editor')
      expect(mockApi.put).toHaveBeenCalledWith('/api/v1/users/u1/role', { role: 'editor' })
    })
  })

  describe('deactivateUser', () => {
    it('posts deactivate and refreshes users', async () => {
      mockApi.post.mockResolvedValue({})
      mockApi.get.mockResolvedValue({ data: [] })
      await store.deactivateUser('u1')
      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/users/u1/deactivate')
    })
  })

  describe('reactivateUser', () => {
    it('posts reactivate and refreshes users', async () => {
      mockApi.post.mockResolvedValue({})
      mockApi.get.mockResolvedValue({ data: [] })
      await store.reactivateUser('u1')
      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/users/u1/reactivate')
    })
  })
})
