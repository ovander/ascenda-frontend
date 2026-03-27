import { vi } from 'vitest'
import { config } from '@vue/test-utils'

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

// Mock vue-i18n
config.global.mocks = {
  $t: (key: string) => key,
  $d: (date: any) => String(date),
  $n: (num: number) => String(num),
}

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

// Mock ResizeObserver for Chart.js
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

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
