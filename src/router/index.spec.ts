import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { fetchAll } = vi.hoisted(() => ({ fetchAll: vi.fn() }))
vi.mock('@/features/admin/stores/featurePolicyStore', () => ({
  useFeaturePolicyStore: () => ({ fetchAll }),
}))

import router, { accessGuard } from './index'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { usePlanMembersStore } from '@/stores/planMembers'
import { useUiStore } from '@/stores/ui'
import type { Tenant, User } from '@/types'

const SCENARIO = '/plans/p1/scenarios/s1'

function signIn(role: string) {
  const auth = useAuthStore()
  auth.csrf = 'csrf-token'
  auth.user = { role } as User
}

const guard = (path: string) => accessGuard(router.resolve(path))

beforeEach(() => {
  setActivePinia(createPinia())
  fetchAll.mockReset()
  useUiStore().windowWidth = 1280
})

describe('accessGuard', () => {
  it('lets anyone through to the public pages', () => {
    for (const path of ['/landing', '/login', '/magic-link']) expect(guard(path)).toBe(true)
    expect(fetchAll).not.toHaveBeenCalled()
  })

  it('sends a signed-out visitor to the landing page, remembering where they were going', () => {
    expect(guard('/')).toBe('/landing')
    expect(guard(`${SCENARIO}/pnl`)).toBe(`/landing?redirect=${encodeURIComponent(`${SCENARIO}/pnl`)}`)
  })

  it('lets a signed-in user through and loads the feature policies', () => {
    signIn('owner')
    expect(guard(`${SCENARIO}/pnl`)).toBe(true)
    expect(fetchAll).toHaveBeenCalled()
  })

  it('keeps the admin pages to platform admins', () => {
    signIn('owner')
    expect(guard('/admin/users')).toEqual({ name: 'dashboard' })
    signIn('admin')
    expect(guard('/admin/users')).toBe(true)
  })

  it('keeps a platform admin out of plan and tenant pages', () => {
    signIn('admin')
    expect(guard(`${SCENARIO}/pnl`)).toEqual({ name: 'admin-dashboard' })
    expect(guard('/')).toEqual({ name: 'admin-dashboard' })
  })

  it('keeps the team pages to owners', () => {
    signIn('editor')
    expect(guard('/team/users')).toEqual({ name: 'dashboard' })
    signIn('owner')
    expect(guard('/team/users')).toBe(true)
  })

  it('sends a free-tier user away from Pro pages with the upgrade prompt', () => {
    signIn('owner')
    const tenants = useTenantStore()
    tenants.tenant = { tier: 'free' } as Tenant
    expect(guard(`${SCENARIO}/bep`)).toEqual({ name: 'dashboard', query: { upgrade: '1' } })
    tenants.tenant = { tier: 'pro' } as Tenant
    expect(guard(`${SCENARIO}/bep`)).toBe(true)
  })

  it('keeps phones out of data-entry pages, back to the scenario when there is one', () => {
    signIn('owner')
    useUiStore().windowWidth = 390
    expect(guard(`${SCENARIO}/products`)).toEqual({
      name: 'scenario-dashboard', params: { planId: 'p1', sid: 's1' },
    })
    expect(guard('/plans/new')).toEqual({ name: 'dashboard' })
    expect(guard(`${SCENARIO}/pnl`)).toBe(true)
  })

  it('keeps readers out of the Operate pages', () => {
    signIn('reader')
    expect(guard(`${SCENARIO}/products`)).toEqual({ name: 'dashboard' })
    expect(guard(`${SCENARIO}/pnl`)).toBe(true)
  })

  it('keeps plan viewers out of the editor-only pages', () => {
    signIn('editor')
    const members = usePlanMembersStore()
    members.myPlanRole = 'viewer'
    expect(guard(`${SCENARIO}/wizard`)).toEqual({ name: 'dashboard' })
    members.myPlanRole = 'editor'
    expect(guard(`${SCENARIO}/wizard`)).toBe(true)
  })
})

describe('router', () => {
  it('applies the guard on navigation', async () => {
    await router.push(`${SCENARIO}/pnl`)
    expect(router.currentRoute.value.name).toBe('landing')
    expect(router.currentRoute.value.query.redirect).toBe(`${SCENARIO}/pnl`)
  })
})
