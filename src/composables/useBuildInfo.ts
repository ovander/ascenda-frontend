/**
 * useBuildInfo — what is running: the version, commit, build time and
 * toolchain of this frontend bundle (embedded at build time by vite.config.ts)
 * and of the backend it talks to (GET /api/v1/version, fetched once).
 */
import { ref } from 'vue'
import api from '@/composables/useApi'

export interface BuildInfo {
  version: string
  commit: string
  buildTime: string
  toolchain: { name: string; version: string }[]
}

/** Shape of GET /api/v1/version (backend MetadataHandler.GetVersion). */
interface BackendVersion {
  version: string
  buildTime?: string
  gitCommit?: string
  goVersion: string
}

// Read once: every mention of __APP_BUILD__ is replaced by the whole object.
const built = __APP_BUILD__

export const frontendBuild: BuildInfo = {
  version: built.version,
  commit: built.commit,
  buildTime: built.buildTime,
  toolchain: [
    { name: 'Node.js', version: built.toolchain.node },
    { name: 'Vite', version: built.toolchain.vite },
    { name: 'Vue', version: built.toolchain.vue },
    { name: 'TypeScript', version: built.toolchain.typescript },
  ],
}

// Shared across callers: the backend build does not change while the page is
// open, so it is fetched once; a failed fetch is retried on the next call.
const backendBuild = ref<BuildInfo | null>(null)
const backendError = ref(false)
let pending: Promise<void> | null = null

function fromBackend(v: BackendVersion): BuildInfo {
  return {
    version: v.version,
    commit: v.gitCommit ?? '',
    buildTime: v.buildTime ?? '',
    toolchain: [{ name: 'Go', version: v.goVersion.replace(/^go/, '') }],
  }
}

function loadBackend(): Promise<void> {
  if (backendBuild.value) return Promise.resolve()
  pending ??= api
    .get<BackendVersion>('/api/v1/version')
    .then((res) => {
      backendBuild.value = fromBackend(res.data)
      backendError.value = false
    })
    .catch(() => {
      backendError.value = true
    })
    .finally(() => {
      pending = null
    })
  return pending
}

/** Plain-text summary for support requests. */
export function formatBuildInfo(label: string, info: BuildInfo): string {
  const tools = info.toolchain.map((t) => `${t.name} ${t.version}`).join(', ')
  return `${label}: ${info.version} (${info.commit || '—'}, built ${info.buildTime || '—'}; ${tools})`
}

export function useBuildInfo() {
  return { frontend: frontendBuild, backend: backendBuild, backendError, loadBackend }
}

/** Test helper: forget the cached backend build. */
export function resetBuildInfoCache() {
  backendBuild.value = null
  backendError.value = false
  pending = null
}
