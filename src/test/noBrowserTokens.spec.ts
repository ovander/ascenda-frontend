/**
 * The browser never holds an OAuth token: the backend's BFF keeps them, and the
 * SPA has only an HttpOnly session cookie and the CSRF token in memory. This
 * suite fails if the app's code starts using browser storage or an
 * Authorization header for auth again, statically (source scan) and at run
 * time (the auth flows with the storage APIs watched).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { setActivePinia, createPinia } from 'pinia'
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import { useAuth } from '@/composables/useAuth'

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>()
  return { ...actual, default: { ...actual.default, get: vi.fn(), post: vi.fn(), create: actual.default.create } }
})

const ROOT = join(__dirname, '..', '..')

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === 'test' ? [] : sources(path)
    return /\.(ts|vue)$/.test(name) && !/\.(spec|test)\.ts$/.test(name) ? [path] : []
  })
}

const files = [...sources(join(ROOT, 'src')), join(ROOT, 'public', 'landing.html'), join(ROOT, 'index.html')]
  .map(path => ({ path: relative(ROOT, path), text: readFileSync(path, 'utf8') }))

// Browser storage the app may use, for what: none of it is auth.
const STORAGE_ALLOWED: Record<string, RegExp> = {
  'src/stores/displayUnit.ts': /STORAGE_KEY/,                     // the €/k€/M€ preference
  'src/features/auth/utils/postLoginRedirect.ts': /KEY/,          // the page to open after a magic link
  'public/landing.html': /'magic_link_redirect'/,                 // the same, from the static landing page
}

describe('no auth data in the browser', () => {
  it('scans the app itself', () => {
    expect(files.length).toBeGreaterThan(50)
    expect(files.some(f => f.path === 'src/stores/auth.ts')).toBe(true)
  })

  it('never touches sessionStorage', () => {
    const offenders = files.filter(f => /\bsessionStorage\s*[.[]/.test(f.text)).map(f => f.path)
    expect(offenders).toEqual([])
  })

  it('uses localStorage only for the listed, non-auth values', () => {
    const offenders = files
      .filter(f => /localStorage\s*\.\s*(setItem|getItem|removeItem)/.test(f.text))
      .filter((f) => {
        const allowed = STORAGE_ALLOWED[f.path]
        if (!allowed) return true
        const calls = f.text.match(/localStorage\s*\.\s*(setItem|getItem|removeItem)\s*\(([^,)]*)/g) ?? []
        return calls.some(call => !allowed.test(call))
      })
      .map(f => f.path)
    expect(offenders).toEqual([])
  })

  it('never sets an Authorization header', () => {
    const offenders = files.flatMap(f =>
      f.text.split('\n')
        .filter(line => /authorization/i.test(line))
        .filter(line => !(f.path === 'src/composables/useApi.ts' && /headers\.delete\('Authorization'\)|never carries an Authorization header/.test(line)))
        .map(line => `${f.path}: ${line.trim()}`),
    )
    expect(offenders).toEqual([])
  })

  it('has no token or PKCE handling left', () => {
    const offenders = files
      .filter(f => /accessToken|refreshToken|access_token|refresh_token|code_verifier|codeVerifier|pkce/i.test(f.text))
      .map(f => f.path)
    expect(offenders).toEqual([])
  })
})

describe('auth flows at run time', () => {
  const touched: string[] = []
  const spies: Array<{ mockRestore: () => void }> = []

  beforeEach(() => {
    setActivePinia(createPinia())
    touched.length = 0
    // localStorage is the stub from src/test/setup.ts; sessionStorage is jsdom's Storage.
    for (const target of [window.localStorage, Storage.prototype]) {
      for (const method of ['setItem', 'getItem', 'removeItem'] as const) {
        spies.push(vi.spyOn(target as Storage, method).mockImplementation((key: string) => {
          touched.push(`${method}(${key})`)
          return null
        }))
      }
    }
    vi.stubGlobal('location', { ...window.location, assign: vi.fn(), pathname: '/plans', search: '', hash: '' })
    vi.mocked(axios.get).mockReset()
    vi.mocked(axios.post).mockReset()
  })

  afterEach(() => {
    spies.splice(0).forEach(s => s.mockRestore())
    vi.unstubAllGlobals()
  })

  it('sign-in, session, magic link and sign-out never use storage or a bearer', async () => {
    const session = { authenticated: true, user: { sub: '42' }, csrf: 'csrf-1' }
    const user = { id: 'u', name: 'A', role: 'owner' }
    vi.mocked(axios.get).mockImplementation(async (url: string) => ({ data: url === '/bff/session' ? session : user }))
    vi.mocked(axios.post).mockResolvedValue({ data: session })

    const store = useAuthStore()
    useAuth().initiateLogin()
    await store.ensureSession()
    await store.magicLink('link')
    await store.logout()

    expect(touched).toEqual([])
    const calls = [...vi.mocked(axios.get).mock.calls, ...vi.mocked(axios.post).mock.calls]
    for (const call of calls) {
      expect(String(call[0])).toMatch(/^\/(bff|api)\//)
      expect(JSON.stringify(call.slice(1))).not.toMatch(/authorization|bearer/i)
    }
  })
})
