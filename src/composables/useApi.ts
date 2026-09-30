import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth'
import { devlog } from '@/utils/logger'

// ── Same-origin API client ────────────────────────────────────────────────────
// The backend's BFF keeps the OAuth tokens; the browser sends its HttpOnly
// session cookie, which it does for same-origin requests only. Every call is
// therefore a relative path on the SPA's own origin (Caddy routes /api, /bff
// and /auth to the backend), and never carries an Authorization header.
// withCredentials stays false: no cookie would ever go to another origin.

const UNSAFE_METHODS = new Set(['post', 'put', 'patch', 'delete'])

/** True for a URL that names an origin (scheme or protocol-relative). */
export function isAbsoluteUrl(url: string | undefined): boolean {
  return !!url && (/^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith('//'))
}

type RetriableConfig = InternalAxiosRequestConfig & { _csrfRetried?: boolean }

// ── Request interceptor: same-origin only, CSRF on unsafe methods ─────────────
function addSessionInterceptor(instance: AxiosInstance) {
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (isAbsoluteUrl(config.baseURL) || isAbsoluteUrl(config.url)) {
      throw new Error(`[api] refusing a cross-origin request to ${config.url}`)
    }
    config.headers.delete('Authorization')
    if (UNSAFE_METHODS.has((config.method ?? 'get').toLowerCase())) {
      const csrf = useAuthStore().csrf
      if (csrf) config.headers.set('X-CSRF-Token', csrf)
    }
    return config
  })
}

/** Where to go after the session is lost: a fresh sign-in, back to this page. */
function signInAgain() {
  const here = window.location.pathname + window.location.search + window.location.hash
  useAuthStore().login(here)
}

// ── Response interceptor: session loss, stale CSRF token, error logging ───────
function addResponseInterceptor(instance: AxiosInstance) {
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error.config as RetriableConfig | undefined
      const status = error.response?.status

      // Log every API error but 401 so individual stores don't need their own
      // console.error calls. A 401 is handled below.
      if (status !== 401) {
        const method = (config?.method ?? '?').toUpperCase()
        const url = config?.url ?? '?'
        devlog.error(`[api] ${method} ${url} → ${status ?? 'no-response'}`, error.response?.data ?? error.message)
      }

      const auth = useAuthStore()

      // A 401 means the session is gone (expired, signed out elsewhere, or its
      // refresh token rejected). Ask the backend once; without a session, sign in again.
      if (status === 401) {
        devlog.debug('[api] 401 — re-checking the session')
        const stillSignedIn = await auth.recheckSession()
        if (!stillSignedIn) signInAgain()
        return Promise.reject(error)
      }

      // A 403 for the CSRF token means this tab holds a stale one (e.g. a
      // sign-in in another tab replaced the session): fetch the current one
      // and retry once.
      const message = String(error.response?.data?.message ?? '')
      if (status === 403 && /csrf/i.test(message) && config && !config._csrfRetried) {
        config._csrfRetried = true
        if (await auth.recheckSession()) return instance(config)
        signInAgain()
      }
      return Promise.reject(error)
    },
  )
}

function createApi(timeoutMs: number): AxiosInstance {
  const instance = axios.create({
    baseURL: '',
    timeout: timeoutMs,
    withCredentials: false,
    headers: { 'Content-Type': 'application/json' },
  })
  addSessionInterceptor(instance)
  addResponseInterceptor(instance)
  return instance
}

// ── Base API instance (default 5s timeout) ────────────────────────────────────
const api: AxiosInstance = createApi(5000)

// ── Named instances for specific use-cases ────────────────────────────────────
// Each call returns a NEW instance — create once per component / composable,
// not per request.

/**
 * useReportApi — 30s timeout for heavy computed report endpoints
 * (P&L report, BEP report, WCR report, full report, etc.)
 */
export function useReportApi(): AxiosInstance {
  return createApi(30_000)
}

/**
 * useSnapshotApi — 60s timeout for snapshot create/restore operations
 * which deep-copy entire scenario data sets.
 */
export function useSnapshotApi(): AxiosInstance {
  return createApi(60_000)
}

/**
 * useAIApi — 120s timeout for AI narration / LLM endpoints.
 * LLM inference is slow and must not be cancelled by the default 5s timeout.
 */
export function useAIApi(): AxiosInstance {
  return createApi(120_000)
}

export function useApi() {
  return api
}

export default api
