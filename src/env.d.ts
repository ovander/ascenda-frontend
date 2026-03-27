/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_SOCRATE_CLIENT_ID: string
  readonly VITE_SOCRATE_BASE_URL: string
  readonly VITE_SOCRATE_REDIRECT_URI: string
  readonly VITE_DEFAULT_LOCALE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
