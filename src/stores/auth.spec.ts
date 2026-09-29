import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from './auth'
import axios from 'axios'

vi.mock('axios')

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with null user and tokens', () => {
    const store = useAuthStore()
    expect(store.user).toBeNull()
    expect(store.accessToken).toBeNull()
    expect(store.refreshToken).toBeNull()
  })

  it('should set isAuthenticated computed property to false when no token', () => {
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)
  })

  it('should set isAuthenticated computed property to true when token exists', () => {
    const store = useAuthStore()
    store.accessToken = 'test-token'
    expect(store.isAuthenticated).toBe(true)
  })

  it('should successfully authenticate with callback', async () => {
    const mockUser = {
      id: '1',
      tenantId: 'tenant-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'owner' as const,
      isActive: true,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }

    // callback() now returns flat tokens then calls fetchMe()
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: { accessToken: 'access-token-123', refreshToken: 'refresh-token-456' },
    })
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: mockUser,
    })

    const store = useAuthStore()
    await store.callback('auth-code', 'code-verifier')

    expect(store.user).toEqual(mockUser)
    expect(store.accessToken).toBe('access-token-123')
    expect(store.refreshToken).toBe('refresh-token-456')
    expect(store.isAuthenticated).toBe(true)
  })

  it('signs in with a magic-link token', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: { accessToken: 'ml-access', refreshToken: 'ml-refresh', expiresIn: 900 },
    })
    vi.mocked(axios.get).mockResolvedValueOnce({ data: { id: '1', role: 'owner' } })

    const store = useAuthStore()
    await store.magicLink('link-token')

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/auth/magic-link/verify'),
      { token: 'link-token' },
    )
    expect(store.accessToken).toBe('ml-access')
    expect(store.refreshToken).toBe('ml-refresh')
    expect(store.user).toEqual({ id: '1', role: 'owner' })
  })

  it('should successfully refresh tokens', async () => {
    // POST /auth/refresh answers with the same flat shape as /auth/callback.
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: { accessToken: 'new-access-token', refreshToken: 'new-refresh-token', expiresIn: 900 },
    })

    const store = useAuthStore()
    store.refreshToken = 'old-refresh-token'

    await store.refresh()

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      { refreshToken: 'old-refresh-token' },
    )
    expect(store.accessToken).toBe('new-access-token')
    expect(store.refreshToken).toBe('new-refresh-token')
  })

  it('uses the rotated refresh token for the next refresh', async () => {
    // Socrate rotates refresh tokens and revokes the whole chain when a used
    // one is replayed, so each refresh must send the token from the last one.
    vi.mocked(axios.post)
      .mockResolvedValueOnce({ data: { accessToken: 'a1', refreshToken: 'r1', expiresIn: 900 } })
      .mockResolvedValueOnce({ data: { accessToken: 'a2', refreshToken: 'r2', expiresIn: 900 } })

    const store = useAuthStore()
    store.refreshToken = 'r0'
    await store.refresh()
    await store.refresh()

    expect(vi.mocked(axios.post).mock.calls.map((c) => c[1])).toEqual([
      { refreshToken: 'r0' },
      { refreshToken: 'r1' },
    ])
    expect(store.accessToken).toBe('a2')
    expect(store.refreshToken).toBe('r2')
  })

  it('keeps the tokens unchanged when the refresh response has none', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({ data: {} })

    const store = useAuthStore()
    store.accessToken = 'old-access'
    store.refreshToken = 'old-refresh'

    await expect(store.refresh()).rejects.toThrow()
    expect(store.accessToken).toBe('old-access')
    expect(store.refreshToken).toBe('old-refresh')
  })

  it('should throw error when refreshing without refresh token', async () => {
    const store = useAuthStore()
    store.refreshToken = null

    await expect(store.refresh()).rejects.toThrow('No refresh token')
  })

  it('should successfully fetch current user', async () => {
    const mockUser = {
      id: '1',
      tenantId: 'tenant-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin' as const,
      isActive: true,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }

    vi.mocked(axios.get).mockResolvedValueOnce({
      data: mockUser,
    })

    const store = useAuthStore()
    store.accessToken = 'valid-token'
    await store.fetchMe()

    expect(store.user).toEqual(mockUser)
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/users/me'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer valid-token' },
      })
    )
  })

  it('should clear user and tokens on logout', async () => {
    const store = useAuthStore()
    store.user = {
      id: '1',
      tenantId: 'tenant-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'viewer' as const,
      isActive: true,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }
    store.accessToken = 'token'
    store.refreshToken = 'refresh'

    vi.mocked(axios.post).mockResolvedValueOnce({
      data: {},
    })

    await store.logout()

    // The backend revokes whatever it receives as `token` at Socrate.
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/auth/logout'),
      { token: 'refresh' },
    )
    expect(store.user).toBeNull()
    expect(store.accessToken).toBeNull()
    expect(store.refreshToken).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  it('does not call the server on logout without a refresh token', async () => {
    const store = useAuthStore()
    store.accessToken = 'token'
    store.refreshToken = null

    await store.logout()

    expect(axios.post).not.toHaveBeenCalled()
    expect(store.accessToken).toBeNull()
  })

  it('should clear tokens on logout even if server call fails', async () => {
    const store = useAuthStore()
    store.accessToken = 'token'
    store.refreshToken = 'refresh'
    store.user = {
      id: '1',
      tenantId: 'tenant-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'editor' as const,
      isActive: true,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }

    vi.mocked(axios.post).mockRejectedValueOnce(new Error('Network error'))

    await store.logout()

    expect(store.user).toBeNull()
    expect(store.accessToken).toBeNull()
    expect(store.refreshToken).toBeNull()
  })
})
