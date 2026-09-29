import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import type { User, AuthTokens } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  // E2E testing hook: Playwright injects window.__E2E_AUTH__ via addInitScript so
  // that auth state survives page.goto() calls without a real OAuth flow.
  const _e2e = typeof window !== 'undefined' ? (window as any).__E2E_AUTH__ : undefined

  const user = ref<User | null>(_e2e?.user ?? null)
  const accessToken = ref<string | null>(_e2e?.accessToken ?? null)
  const refreshToken = ref<string | null>(_e2e?.refreshToken ?? null)

  const isAuthenticated = computed(() => !!accessToken.value)

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

  async function callback(code: string, codeVerifier: string) {
    const response = await axios.post<AuthTokens>(
      `${apiBase}/auth/callback`,
      { code, codeVerifier, redirectUri: import.meta.env.VITE_SOCRATE_REDIRECT_URI }
    )
    accessToken.value = response.data.accessToken
    refreshToken.value = response.data.refreshToken

    // Fetch user profile after obtaining tokens
    await fetchMe()
  }

  // Socrate rotates refresh tokens: every refresh returns a new one and the one
  // sent is spent, so the new one must be kept for the next refresh.
  async function refresh() {
    if (!refreshToken.value) throw new Error('No refresh token')
    const response = await axios.post<AuthTokens>(
      `${apiBase}/auth/refresh`,
      { refreshToken: refreshToken.value }
    )
    const { accessToken: access, refreshToken: next } = response.data
    if (!access || !next) throw new Error('Refresh response without tokens')
    accessToken.value = access
    refreshToken.value = next
  }

  async function fetchMe() {
    const response = await axios.get<User>(`${apiBase}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${accessToken.value}` },
    })
    user.value = response.data
  }

  // Passwordless sign-in: redeem the single-use token from a Socrate magic
  // link. The backend exchanges it at Socrate and answers like /auth/callback.
  async function magicLink(token: string) {
    const response = await axios.post<AuthTokens>(`${apiBase}/auth/magic-link/verify`, { token })
    accessToken.value = response.data.accessToken
    refreshToken.value = response.data.refreshToken
    await fetchMe()
  }

  async function logout() {
    // Revoke the refresh token at Socrate, which also ends its rotation chain.
    if (refreshToken.value) {
      try {
        await axios.post(`${apiBase}/auth/logout`, { token: refreshToken.value })
      } catch {
        // Best effort: the local session is cleared either way.
      }
    }
    user.value = null
    accessToken.value = null
    refreshToken.value = null
  }

  return {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    callback,
    magicLink,
    refresh,
    fetchMe,
    logout,
  }
})
