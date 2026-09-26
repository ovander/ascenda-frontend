/// <reference types="vite/client" />

import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
    requiresAdmin?: boolean
    requiresOwner?: boolean
    requiresEditor?: boolean
    requiresPro?: boolean
    layer?: 'operate' | 'understand' | 'admin'
    /** Block this route on mobile (phones). Redirects to scenario-dashboard or dashboard. */
    mobileBlocked?: boolean
  }
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_SOCRATE_CLIENT_ID: string
  readonly VITE_SOCRATE_BASE_URL: string
  readonly VITE_SOCRATE_REDIRECT_URI: string
  /** Release version (vX.Y.Z), set by scripts/push.sh; unset in development. */
  readonly VITE_APP_VERSION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
