import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const mockLogin = vi.fn()
const mockLogout = vi.fn()

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    isAuthenticated: false,
    user: null,
    csrf: null,
    login: mockLogin,
    logout: mockLogout,
  })),
}))

import { useAuth } from './useAuth'

describe('useAuth', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  it('returns isAuthenticated computed', () => {
    const auth = useAuth()
    expect(auth.isAuthenticated).toBeDefined()
    expect(auth.isAuthenticated.value).toBe(false)
  })

  it('returns user computed', () => {
    const auth = useAuth()
    expect(auth.user).toBeDefined()
    expect(auth.user.value).toBeNull()
  })

  it('isAdmin returns false when no user', () => {
    const auth = useAuth()
    expect(auth.isAdmin.value).toBe(false)
  })

  it('isBusinessUser returns false when no user', () => {
    const auth = useAuth()
    // user is null, role is undefined, not 'owner' or 'user'
    expect(auth.isBusinessUser.value).toBe(false)
  })

  it('isOwner returns false when no user', () => {
    const auth = useAuth()
    expect(auth.isOwner.value).toBe(false)
  })

  it('initiateLogin hands sign-in to the backend, returning to the current page', () => {
    window.history.replaceState(null, '', '/plans/7?tab=pnl#top')
    useAuth().initiateLogin()
    expect(mockLogin).toHaveBeenCalledWith('/plans/7?tab=pnl#top')
  })

  it('initiateLogin takes an explicit destination, and ignores a click event', () => {
    const auth = useAuth()
    auth.initiateLogin('/admin/users')
    expect(mockLogin).toHaveBeenLastCalledWith('/admin/users')
    window.history.replaceState(null, '', '/')
    ;(auth.initiateLogin as (e: unknown) => void)(new MouseEvent('click'))
    expect(mockLogin).toHaveBeenLastCalledWith('/')
  })

  it('keeps no PKCE state or token in browser storage', () => {
    useAuth().initiateLogin()
    expect(sessionStorage.length).toBe(0)
  })

  it('logout calls store.logout', async () => {
    const auth = useAuth()
    await auth.logout()
    expect(mockLogout).toHaveBeenCalled()
  })
})
