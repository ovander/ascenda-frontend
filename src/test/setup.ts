import { vi } from 'vitest'
import { config } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import fr from '@/locales/fr.json'
import en from '@/locales/en.json'

// ── vue-i18n global plugin ────────────────────────────────────────────────────
// Install a real vue-i18n instance (English locale) so that useI18n() works in
// component setup() functions.  English is used so existing test assertions
// that check English label strings continue to pass unchanged.
const testI18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { fr, en },
})
config.global.plugins = [...(config.global.plugins ?? []), testI18n]

// ── localStorage stub ─────────────────────────────────────────────────────────
// jsdom doesn't always provide a functional localStorage in all Vitest versions.
// Pinia stores that persist via localStorage (e.g. displayUnit) need this stub.
const _localStore: Record<string, string> = {}
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem:    (k: string) => _localStore[k] ?? null,
    setItem:    (k: string, v: string) => { _localStore[k] = String(v) },
    removeItem: (k: string) => { delete _localStore[k] },
    clear:      () => { Object.keys(_localStore).forEach(k => delete _localStore[k]) },
    key:        (i: number) => Object.keys(_localStore)[i] ?? null,
    get length() { return Object.keys(_localStore).length },
  },
  writable: true,
})

// Note: $t / $d / $n are provided by the real vue-i18n plugin above.
// No longer needed as manual mocks.
config.global.mocks = {}

// Mock PrimeVue directives
config.global.directives = {
  tooltip: {},
  ripple: {},
}

// Mock matchMedia for Chart.js
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Make scrollHeight writable so PrimeVue DataTable can set scrollHeight='flex'
// without triggering a JSDOM TypeError (scrollHeight is read-only by default).
Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
  configurable: true,
  writable: true,
  value: 0,
})

// Mock ResizeObserver for Chart.js / DataContainer
// Must be a real class (not arrow function) so `new ResizeObserver()` works.
class ResizeObserverMock {
  observe    = vi.fn()
  unobserve  = vi.fn()
  disconnect = vi.fn()
  constructor(_callback: ResizeObserverCallback) {}
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver

// Mock canvas for Chart.js
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn().mockReturnValue({ data: [] }),
  putImageData: vi.fn(),
  createImageData: vi.fn().mockReturnValue([]),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 0, actualBoundingBoxAscent: 0, actualBoundingBoxDescent: 0 }),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
  canvas: { width: 800, height: 600 },
}) as any
