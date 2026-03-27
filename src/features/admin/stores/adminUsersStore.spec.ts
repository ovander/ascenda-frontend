import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const { mockApi } = vi.hoisted(() => {
  const mockApi = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }
  return { mockApi }
})
vi.mock('@/composables/useApi', () => ({ default: mockApi }))

import { useAdminUsersStore } from './adminUsersStore'
import type { AdminUser, AdminTenant } from './adminUsersStore'

const mockUser: AdminUser = {
  socrateId: 1,
  email: 'alice@test.com',
  name: 'Alice',
  role: 'admin',
  status: 'active',
  isVerified: true,
  isActive: true,
  createdAt: '2025-01-01T00:00:00Z',
}

const mockTenant: AdminTenant = {
  id: 'tenant-1',
  name: 'Acme',
  slug: 'acme',
  tier: 'pro',
  isActive: true,
  maxUsers: 10,
  maxPlans: 5,
  createdAt: '2025-01-01T00:00:00Z',
}

const mockUserListResponse = { users: [mockUser], totalCount: 1, page: 1, pageSize: 20 }
const mockTenantListResponse = { tenants: [mockTenant], totalCount: 1, page: 1, pageSize: 20 }

describe('useAdminUsersStore', () => {
  let store: ReturnType<typeof useAdminUsersStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAdminUsersStore()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('users is empty', () => { expect(store.users).toEqual([]) })
    it('tenants is empty', () => { expect(store.tenants).toEqual([]) })
    it('usersLoading is false', () => { expect(store.usersLoading).toBe(false) })
    it('tenantsLoading is false', () => { expect(store.tenantsLoading).toBe(false) })
    it('totalUsers is 0', () => { expect(store.totalUsers).toBe(0) })
  })

  // ── Users ────────────────────────────────────────────────────────────────

  describe('fetchUsers', () => {
    it('sets users from response', async () => {
      mockApi.get.mockResolvedValue({ data: mockUserListResponse })
      await store.fetchUsers()
      expect(store.users).toEqual([mockUser])
      expect(store.totalUsers).toBe(1)
    })

    it('passes search param', async () => {
      mockApi.get.mockResolvedValue({ data: mockUserListResponse })
      await store.fetchUsers('alice')
      const url = mockApi.get.mock.calls[0][0] as string
      expect(url).toContain('search=alice')
    })

    it('passes page and pageSize params', async () => {
      mockApi.get.mockResolvedValue({ data: mockUserListResponse })
      await store.fetchUsers('', 2, 10)
      const url = mockApi.get.mock.calls[0][0] as string
      expect(url).toContain('page=2')
      expect(url).toContain('pageSize=10')
    })

    it('clears usersLoading after fetch', async () => {
      mockApi.get.mockResolvedValue({ data: mockUserListResponse })
      await store.fetchUsers()
      expect(store.usersLoading).toBe(false)
    })

    it('clears usersLoading on error', async () => {
      mockApi.get.mockRejectedValue(new Error('fail'))
      await expect(store.fetchUsers()).rejects.toThrow()
      expect(store.usersLoading).toBe(false)
    })
  })

  describe('createUser', () => {
    it('posts user and refreshes list', async () => {
      mockApi.post.mockResolvedValue({ data: mockUser })
      mockApi.get.mockResolvedValue({ data: mockUserListResponse })
      const result = await store.createUser({ email: 'alice@test.com', fullName: 'Alice' })
      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/admin/users', expect.objectContaining({ email: 'alice@test.com' }))
      expect(result).toEqual(mockUser)
    })
  })

  describe('updateUser', () => {
    it('puts user and updates list in place', async () => {
      store.users = [mockUser]
      const updated = { ...mockUser, name: 'Alice Smith' }
      mockApi.put.mockResolvedValue({ data: updated })
      const result = await store.updateUser(1, { fullName: 'Alice Smith' })
      expect(result).toEqual(updated)
      expect(store.users[0]).toEqual(updated)
    })

    it('calls correct endpoint', async () => {
      mockApi.put.mockResolvedValue({ data: mockUser })
      await store.updateUser(1, { role: 'user' })
      expect(mockApi.put).toHaveBeenCalledWith('/api/v1/admin/users/1', { role: 'user' })
    })
  })

  describe('deleteUser', () => {
    it('removes user from list and decrements totalUsers', async () => {
      store.users = [mockUser]
      store.totalUsers = 1
      mockApi.delete.mockResolvedValue({})
      await store.deleteUser(1)
      expect(store.users).toHaveLength(0)
      expect(store.totalUsers).toBe(0)
    })

    it('does not decrement totalUsers below 0', async () => {
      store.users = []
      store.totalUsers = 0
      mockApi.delete.mockResolvedValue({})
      await store.deleteUser(999)
      expect(store.totalUsers).toBe(0)
    })
  })

  describe('resendVerification', () => {
    it('calls correct endpoint', async () => {
      mockApi.post.mockResolvedValue({})
      await store.resendVerification(1)
      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/admin/users/1/resend-verification')
    })
  })

  describe('resetPassword', () => {
    it('calls correct endpoint', async () => {
      mockApi.post.mockResolvedValue({})
      await store.resetPassword(1)
      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/admin/users/1/reset-password')
    })
  })

  // ── Tenants ───────────────────────────────────────────────────────────────

  describe('fetchTenants', () => {
    it('sets tenants from response', async () => {
      mockApi.get.mockResolvedValue({ data: mockTenantListResponse })
      await store.fetchTenants()
      expect(store.tenants).toEqual([mockTenant])
      expect(store.totalTenants).toBe(1)
    })

    it('clears tenantsLoading after fetch', async () => {
      mockApi.get.mockResolvedValue({ data: mockTenantListResponse })
      await store.fetchTenants()
      expect(store.tenantsLoading).toBe(false)
    })
  })

  describe('createTenant', () => {
    it('posts tenant and refreshes list', async () => {
      mockApi.post.mockResolvedValue({ data: mockTenant })
      mockApi.get.mockResolvedValue({ data: mockTenantListResponse })
      const result = await store.createTenant({ name: 'Acme', slug: 'acme' })
      expect(result).toEqual(mockTenant)
    })
  })

  describe('updateTenant', () => {
    it('puts tenant and updates list in place', async () => {
      store.tenants = [mockTenant]
      const updated = { ...mockTenant, name: 'Acme Corp' }
      mockApi.put.mockResolvedValue({ data: updated })
      const result = await store.updateTenant('tenant-1', { name: 'Acme Corp' })
      expect(result).toEqual(updated)
      expect(store.tenants[0]).toEqual(updated)
    })
  })
})
