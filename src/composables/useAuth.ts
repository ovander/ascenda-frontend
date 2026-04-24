import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

function generateRandomString(length: number): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, length)
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function useAuth() {
  const store = useAuthStore()

  const isAuthenticated = computed(() => store.isAuthenticated)
  const user = computed(() => store.user)
  // Workspace owner: full plan access + team management
  const isOwner = computed(() => store.user?.role === 'owner')
  // Platform-wide admin — sees all tenants; no plan routes
  const isAdmin = computed(() => store.user?.role === 'admin')
  // Can write plan data (owner or editor)
  const isEditor = computed(() =>
    store.user?.role === 'owner' || store.user?.role === 'editor'
  )
  // Read-only plan access
  const isReader = computed(() => store.user?.role === 'reader')
  // Any business user (not platform admin)
  const isBusinessUser = computed(() =>
    store.user?.role === 'owner' || store.user?.role === 'editor' || store.user?.role === 'reader'
  )
  // Can access the Operate (data entry) section — owners and editors only
  const canOperate = computed(() =>
    store.user?.role === 'owner' || store.user?.role === 'editor'
  )

  async function initiateLogin() {
    const codeVerifier = generateRandomString(128)
    const codeChallenge = await generateCodeChallenge(codeVerifier)
    const state = generateRandomString(32)

    sessionStorage.setItem('pkce_code_verifier', codeVerifier)
    sessionStorage.setItem('oauth_state', state)

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: import.meta.env.VITE_SOCRATE_CLIENT_ID,
      redirect_uri: import.meta.env.VITE_SOCRATE_REDIRECT_URI,
      scope: 'openid email profile api',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    })

    window.location.href = `${import.meta.env.VITE_SOCRATE_BASE_URL}/oauth/authorize?${params}`
  }

  async function handleCallback(code: string, state: string) {
    const savedState = sessionStorage.getItem('oauth_state')
    if (state !== savedState) {
      throw new Error('Invalid OAuth state parameter')
    }

    const codeVerifier = sessionStorage.getItem('pkce_code_verifier')
    if (!codeVerifier) {
      throw new Error('Missing PKCE code verifier')
    }

    await store.callback(code, codeVerifier)

    sessionStorage.removeItem('pkce_code_verifier')
    sessionStorage.removeItem('oauth_state')
  }

  async function logout() {
    await store.logout()
  }

  return {
    isAuthenticated,
    user,
    isOwner,
    isAdmin,
    isEditor,
    isReader,
    isBusinessUser,
    canOperate,
    initiateLogin,
    handleCallback,
    logout,
  }
}
