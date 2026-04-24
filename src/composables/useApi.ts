import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth'
import { devlog } from '@/utils/logger'

// ── Base API instance (default 5s timeout) ────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: 5000,
  headers: { 'Content-Type': 'application/json' },
})

let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: any) => void
}> = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve(token!)
  })
  failedQueue = []
}

// ── Request interceptor: attach Bearer token ──────────────────────────────────
function addAuthInterceptor(instance: AxiosInstance) {
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const auth = useAuthStore()
    if (auth.accessToken) {
      config.headers.Authorization = `Bearer ${auth.accessToken}`
    }
    return config
  })
}

// ── Response interceptor: silent token refresh + error logging ────────────────
function addResponseInterceptor(instance: AxiosInstance) {
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config

      // Log every non-401 API error so individual stores don't need their own
      // console.error calls. 401s are handled by the refresh flow below.
      if (error.response?.status !== 401) {
        const method = (error.config?.method ?? '?').toUpperCase()
        const url = error.config?.url ?? '?'
        const status = error.response?.status ?? 'no-response'
        devlog.error(`[api] ${method} ${url} → ${status}`, error.response?.data ?? error.message)
      }

      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          }).then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return instance(originalRequest)
          })
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
          devlog.debug('[api] access token expired — attempting silent refresh')
          const auth = useAuthStore()
          await auth.refresh()
          devlog.debug('[api] token refreshed successfully')
          processQueue(null, auth.accessToken)
          originalRequest.headers.Authorization = `Bearer ${auth.accessToken}`
          return instance(originalRequest)
        } catch (refreshError) {
          devlog.error('[api] token refresh failed — logging out', refreshError)
          processQueue(refreshError, null)
          const auth = useAuthStore()
          auth.logout()
          // Session fully expired — send user back to the landing page
          window.location.href = '/landing.html'
          return Promise.reject(refreshError)
        } finally {
          isRefreshing = false
        }
      }
      return Promise.reject(error)
    },
  )
}

// Wire interceptors onto the base instance.
addAuthInterceptor(api)
addResponseInterceptor(api)

// ── Per-timeout instance factory ─────────────────────────────────────────────
// Creates a new Axios instance with the given timeout and fresh interceptors.
// Each call returns a NEW instance — do not call inside a hot render path.
function createTimedApi(timeoutMs: number): AxiosInstance {
  const instance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
    timeout: timeoutMs,
    headers: { 'Content-Type': 'application/json' },
  })
  addAuthInterceptor(instance)
  addResponseInterceptor(instance)
  return instance
}

// ── Named instances for specific use-cases ────────────────────────────────────

/**
 * useReportApi — 30s timeout for heavy computed report endpoints
 * (P&L report, BEP report, WCR report, full report, etc.)
 * Create once per component / composable, not per request.
 */
export function useReportApi(): AxiosInstance {
  return createTimedApi(30_000)
}

/**
 * useSnapshotApi — 60s timeout for snapshot create/restore operations
 * which deep-copy entire scenario data sets.
 */
export function useSnapshotApi(): AxiosInstance {
  return createTimedApi(60_000)
}

/**
 * useAIApi — 120s timeout for AI narration / LLM endpoints.
 * LLM inference is slow and must not be cancelled by the default 5s timeout.
 */
export function useAIApi(): AxiosInstance {
  return createTimedApi(120_000)
}

export function useApi() {
  return api
}

export default api
