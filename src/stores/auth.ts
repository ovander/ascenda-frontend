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

  async function refresh() {
    if (!refreshToken.value) throw new Error('No refresh token')
    const response = await axios.post<{ tokens: AuthTokens }>(
      `${apiBase}/auth/refresh`,
      { refreshToken: refreshToken.value }
    )
    accessToken.value = response.data.tokens.accessToken
    refreshToken.value = response.data.tokens.refreshToken
  }

  async function fetchMe() {
    const response = await axios.get<User>(`${apiBase}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${accessToken.value}` },
    })
    user.value = response.data
  }

  async function logout() {
    try {
      await axios.post(`${apiBase}/auth/logout`, { refreshToken: refreshToken.value }, {
        headers: { Authorization: `Bearer ${accessToken.value}` },
      })
    } catch {
      // Best effort
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
    refresh,
    fetchMe,
    logout,
  }
})
