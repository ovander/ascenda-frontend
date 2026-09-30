import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import type { User } from '@/types'

/**
 * Authentication through the backend's Backend-for-Frontend (BFF).
 *
 * The backend runs the whole OAuth flow and keeps the tokens. The browser
 * holds only an HttpOnly session cookie it cannot read, and this store holds
 * only what GET /bff/session returns: whether there is a session and its CSRF
 * token, sent back in X-CSRF-Token on every POST, PUT, PATCH and DELETE
 * (useApi). No token, and nothing about the session, is kept in browser
 * storage (src/test/noBrowserTokens.spec.ts).
 *
 * Every call is same-origin (a relative path): the session cookie is sent to
 * the SPA's own host only.
 */

/** The body of GET /bff/session and POST /bff/magic-link/verify. */
interface BffSession {
  authenticated: boolean
  user?: { sub: string; email?: string; name?: string }
  csrf?: string
}

/** Where the backend starts a sign-in; it redirects to Socrate. */
export function loginUrl(returnTo = '/'): string {
  return `/bff/login?return_to=${encodeURIComponent(returnTo)}`
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const csrf = ref<string | null>(null)
  // Whether /bff/session has answered since the page loaded.
  const checked = ref(false)

  const isAuthenticated = computed(() => csrf.value !== null)

  function clear() {
    user.value = null
    csrf.value = null
  }

  /** Takes a session body; anything but an authenticated one with a CSRF token clears the state. */
  function apply(data: unknown): boolean {
    const s = data as BffSession | null
    if (s && s.authenticated === true && typeof s.csrf === 'string' && s.csrf !== '') {
      csrf.value = s.csrf
      return true
    }
    clear()
    return false
  }

  async function fetchMe() {
    const response = await axios.get<User>('/api/v1/users/me')
    user.value = response.data
  }

  /**
   * Asks the backend whether this browser has a session, and loads the user
   * when it does. The session's existence is the BFF's answer alone: a user
   * profile that fails to load does not end it (the API reports why), so a
   * misbehaving API cannot bounce the browser between here and Socrate.
   */
  async function loadSession(): Promise<boolean> {
    try {
      const response = await axios.get<BffSession>('/bff/session')
      if (apply(response.data)) {
        try {
          await fetchMe()
        } catch {
          user.value = null
        }
      }
    } catch {
      clear()
    }
    checked.value = true
    return isAuthenticated.value
  }

  let inflight: Promise<boolean> | null = null

  /** loadSession once per page load; concurrent callers share the request. */
  function ensureSession(): Promise<boolean> {
    if (checked.value) return Promise.resolve(isAuthenticated.value)
    inflight ??= loadSession().finally(() => { inflight = null })
    return inflight
  }

  /** Re-asks the backend (after a 401 or a CSRF refusal), sharing one request. */
  function recheckSession(): Promise<boolean> {
    inflight ??= loadSession().finally(() => { inflight = null })
    return inflight
  }

  /** Starts a sign-in: a navigation to the backend, which sends the browser to Socrate. */
  function login(returnTo = '/') {
    window.location.assign(loginUrl(returnTo))
  }

  // Passwordless sign-in: the backend redeems the single-use token from a
  // Socrate magic link and starts a session.
  async function magicLink(token: string) {
    const response = await axios.post<BffSession>('/bff/magic-link/verify', { token })
    checked.value = true
    if (!apply(response.data)) throw new Error('Sign-in failed')
    await fetchMe()
  }

  // The backend revokes the refresh token at Socrate and ends the session.
  async function logout() {
    if (csrf.value) {
      try {
        await axios.post('/bff/logout', null, { headers: { 'X-CSRF-Token': csrf.value } })
      } catch {
        // Best effort: the local state is cleared either way.
      }
    }
    clear()
    checked.value = true
  }

  return {
    user,
    csrf,
    checked,
    isAuthenticated,
    ensureSession,
    loadSession,
    recheckSession,
    fetchMe,
    login,
    magicLink,
    logout,
  }
})
