import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const mockCallback = vi.fn()
const mockLogout = vi.fn()

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    isAuthenticated: false,
    user: null,
    accessToken: null,
    refreshToken: null,
    callback: mockCallback,
    logout: mockLogout,
  })),
}))

// Mock crypto.subtle for PKCE
Object.defineProperty(globalThis, 'crypto', {
  value: {
    getRandomValues: (arr: Uint8Array) => {
      arr.fill(42)
      return arr
    },
    subtle: {
      digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
    },
  },
})

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

  it('initiateLogin stores PKCE verifier and state in sessionStorage', async () => {
    const auth = useAuth()
    // Mock window.location.href setter
    delete (window as any).location
    window.location = { href: '' } as any

    await auth.initiateLogin()

    expect(sessionStorage.getItem('pkce_code_verifier')).toBeTruthy()
    expect(sessionStorage.getItem('oauth_state')).toBeTruthy()
  })

  it('handleCallback throws on state mismatch', async () => {
    const auth = useAuth()
    sessionStorage.setItem('oauth_state', 'correct-state')

    await expect(auth.handleCallback('code', 'wrong-state')).rejects.toThrow('Invalid OAuth state parameter')
  })

  it('handleCallback throws if no code verifier stored', async () => {
    const auth = useAuth()
    sessionStorage.setItem('oauth_state', 'state-1')
    // No pkce_code_verifier set

    await expect(auth.handleCallback('code', 'state-1')).rejects.toThrow('Missing PKCE code verifier')
  })

  it('handleCallback calls store.callback on valid state', async () => {
    const auth = useAuth()
    sessionStorage.setItem('oauth_state', 'state-1')
    sessionStorage.setItem('pkce_code_verifier', 'verifier-1')

    await auth.handleCallback('auth-code', 'state-1')

    expect(mockCallback).toHaveBeenCalledWith('auth-code', 'verifier-1')
    expect(sessionStorage.getItem('pkce_code_verifier')).toBeNull()
    expect(sessionStorage.getItem('oauth_state')).toBeNull()
  })

  it('logout calls store.logout', async () => {
    const auth = useAuth()
    await auth.logout()
    expect(mockLogout).toHaveBeenCalled()
  })
})
