import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const { mockApi } = vi.hoisted(() => {
  const mockApi = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }
  return { mockApi }
})
vi.mock('@/composables/useApi', () => ({ default: mockApi }))

let mockAuthUser: any = { id: 'user-1', role: 'editor' }
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({ user: mockAuthUser })),
}))

import { usePlanMembersStore } from './planMembers'

const PLAN_ID = 'plan-42'
const BASE = `/api/v1/plans/${PLAN_ID}/members`

const mockMembers = [
  { id: 'm1', planId: PLAN_ID, userId: 'user-1', role: 'editor' },
  { id: 'm2', planId: PLAN_ID, userId: 'user-2', role: 'viewer' },
]

describe('usePlanMembersStore', () => {
  let store: ReturnType<typeof usePlanMembersStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = usePlanMembersStore()
    mockAuthUser = { id: 'user-1', role: 'editor' }
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('members is empty', () => { expect(store.members).toEqual([]) })
    it('myPlanRole is null', () => { expect(store.myPlanRole).toBeNull() })
    it('loading is false', () => { expect(store.loading).toBe(false) })
    it('error is null', () => { expect(store.error).toBeNull() })
  })

  describe('canEdit computed', () => {
    it('returns true for owner role', () => {
      mockAuthUser = { id: 'user-1', role: 'owner' }
      setActivePinia(createPinia())
      store = usePlanMembersStore()
      expect(store.canEdit).toBe(true)
    })

    it('returns true when myPlanRole is editor', () => {
      store.myPlanRole = 'editor'
      expect(store.canEdit).toBe(true)
    })

    it('returns false when myPlanRole is viewer', () => {
      mockAuthUser = { id: 'user-1', role: 'editor' }
      setActivePinia(createPinia())
      store = usePlanMembersStore()
      store.myPlanRole = 'viewer'
      expect(store.canEdit).toBe(false)
    })
  })

  describe('canView computed', () => {
    it('returns true for owner', () => {
      mockAuthUser = { id: 'user-1', role: 'owner' }
      setActivePinia(createPinia())
      store = usePlanMembersStore()
      expect(store.canView).toBe(true)
    })

    it('returns true when myPlanRole is viewer', () => {
      store.myPlanRole = 'viewer'
      expect(store.canView).toBe(true)
    })

    it('returns false when myPlanRole is null', () => {
      mockAuthUser = { id: 'user-1', role: 'editor' }
      setActivePinia(createPinia())
      store = usePlanMembersStore()
      expect(store.canView).toBe(false)
    })
  })

  describe('fetchMembers', () => {
    it('stores members on success', async () => {
      mockApi.get.mockResolvedValue({ data: mockMembers })
      await store.fetchMembers(PLAN_ID)
      expect(store.members).toEqual(mockMembers)
    })

    it('calls correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ data: [] })
      await store.fetchMembers(PLAN_ID)
      expect(mockApi.get).toHaveBeenCalledWith(BASE)
    })

    it('sets myPlanRole from matching member', async () => {
      mockApi.get.mockResolvedValue({ data: mockMembers })
      await store.fetchMembers(PLAN_ID)
      expect(store.myPlanRole).toBe('editor')
    })

    it('sets myPlanRole to owner when auth role is owner', async () => {
      mockAuthUser = { id: 'user-1', role: 'owner' }
      setActivePinia(createPinia())
      store = usePlanMembersStore()
      mockApi.get.mockResolvedValue({ data: mockMembers })
      await store.fetchMembers(PLAN_ID)
      expect(store.myPlanRole).toBe('owner')
    })

    it('sets members to empty array on API error', async () => {
      mockApi.get.mockRejectedValue({ response: { data: { error: { message: '404' } } } })
      await store.fetchMembers(PLAN_ID)
      expect(store.members).toEqual([])
    })

    it('clears loading after success', async () => {
      mockApi.get.mockResolvedValue({ data: [] })
      await store.fetchMembers(PLAN_ID)
      expect(store.loading).toBe(false)
    })
  })

  describe('grantAccess', () => {
    it('posts member and refreshes', async () => {
      mockApi.post.mockResolvedValue({})
      mockApi.get.mockResolvedValue({ data: mockMembers })
      await store.grantAccess(PLAN_ID, 'user-3', 'viewer')
      expect(mockApi.post).toHaveBeenCalledWith(BASE, { userId: 'user-3', role: 'viewer' })
      expect(store.members).toEqual(mockMembers)
    })
  })

  describe('changeRole', () => {
    it('puts role and refreshes', async () => {
      mockApi.put.mockResolvedValue({})
      mockApi.get.mockResolvedValue({ data: mockMembers })
      await store.changeRole(PLAN_ID, 'user-2', 'editor')
      expect(mockApi.put).toHaveBeenCalledWith(`${BASE}/user-2`, { role: 'editor' })
    })
  })

  describe('revokeAccess', () => {
    it('deletes member and refreshes', async () => {
      mockApi.delete.mockResolvedValue({})
      mockApi.get.mockResolvedValue({ data: [] })
      await store.revokeAccess(PLAN_ID, 'user-2')
      expect(mockApi.delete).toHaveBeenCalledWith(`${BASE}/user-2`)
    })
  })

  describe('$reset', () => {
    it('clears members, myPlanRole, and error', async () => {
      mockApi.get.mockResolvedValue({ data: mockMembers })
      await store.fetchMembers(PLAN_ID)
      store.$reset()
      expect(store.members).toEqual([])
      expect(store.myPlanRole).toBeNull()
      expect(store.error).toBeNull()
    })
  })
})
