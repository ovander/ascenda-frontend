import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

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

  // Sign-in runs on the backend (BFF): a navigation to /bff/login, which sends
  // the browser to Socrate and back with a session cookie. returnTo defaults
  // to the current page.
  function initiateLogin(returnTo?: string) {
    const here = window.location.pathname + window.location.search + window.location.hash
    store.login(typeof returnTo === 'string' ? returnTo : here)
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
    logout,
  }
}
