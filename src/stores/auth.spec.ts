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

  it('should successfully refresh tokens', async () => {
    const mockTokens = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    }

    vi.mocked(axios.post).mockResolvedValueOnce({
      data: { tokens: mockTokens },
    })

    const store = useAuthStore()
    store.refreshToken = 'old-refresh-token'

    await store.refresh()

    expect(store.accessToken).toBe('new-access-token')
    expect(store.refreshToken).toBe('new-refresh-token')
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

    expect(store.user).toBeNull()
    expect(store.accessToken).toBeNull()
    expect(store.refreshToken).toBeNull()
    expect(store.isAuthenticated).toBe(false)
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
