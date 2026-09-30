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
  /** Release version (vX.Y.Z), set by scripts/push.sh; unset in development. */
  readonly VITE_APP_VERSION?: string
}

declare global {
  /** Build facts embedded by vite.config.ts — read them through useBuildInfo(). */
  const __APP_BUILD__: {
    version: string
    commit: string
    buildTime: string
    toolchain: { node: string; vite: string; vue: string; typescript: string }
  }
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
