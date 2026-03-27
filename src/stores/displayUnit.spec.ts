import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Provide a localStorage stub before the store module is imported
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

import { useDisplayUnitStore } from './displayUnit'

const STORAGE_KEY = 'ascenda_display_unit'

describe('useDisplayUnitStore', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    localStorageMock.clear()
  })

  describe('initial state', () => {
    it('defaults to k€ when localStorage is empty', () => {
      const store = useDisplayUnitStore()
      expect(store.unit).toBe('k€')
    })

    it('reads persisted unit from localStorage', () => {
      localStorageMock.getItem.mockReturnValueOnce('M€')
      setActivePinia(createPinia())
      const store = useDisplayUnitStore()
      expect(store.unit).toBe('M€')
    })
  })

  describe('factor computed', () => {
    it('returns 1 for €', () => {
      const store = useDisplayUnitStore()
      store.setUnit('€')
      expect(store.factor).toBe(1)
    })

    it('returns 1000 for k€', () => {
      const store = useDisplayUnitStore()
      store.setUnit('k€')
      expect(store.factor).toBe(1_000)
    })

    it('returns 1_000_000 for M€', () => {
      const store = useDisplayUnitStore()
      store.setUnit('M€')
      expect(store.factor).toBe(1_000_000)
    })
  })

  describe('decimals computed', () => {
    it('returns 0 for €', () => {
      const store = useDisplayUnitStore()
      store.setUnit('€')
      expect(store.decimals).toBe(0)
    })

    it('returns 1 for k€', () => {
      const store = useDisplayUnitStore()
      store.setUnit('k€')
      expect(store.decimals).toBe(1)
    })

    it('returns 2 for M€', () => {
      const store = useDisplayUnitStore()
      store.setUnit('M€')
      expect(store.decimals).toBe(2)
    })
  })

  describe('setUnit', () => {
    it('updates the unit ref', () => {
      const store = useDisplayUnitStore()
      store.setUnit('€')
      expect(store.unit).toBe('€')
    })

    it('persists the unit to localStorage', () => {
      const store = useDisplayUnitStore()
      store.setUnit('M€')
      expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, 'M€')
    })
  })

  describe('cycleUnit', () => {
    it('cycles from k€ → M€', () => {
      const store = useDisplayUnitStore()
      store.setUnit('k€')
      store.cycleUnit()
      expect(store.unit).toBe('M€')
    })

    it('cycles from M€ → €', () => {
      const store = useDisplayUnitStore()
      store.setUnit('M€')
      store.cycleUnit()
      expect(store.unit).toBe('€')
    })

    it('cycles from € → k€', () => {
      const store = useDisplayUnitStore()
      store.setUnit('€')
      store.cycleUnit()
      expect(store.unit).toBe('k€')
    })

    it('persists cycled unit to localStorage', () => {
      const store = useDisplayUnitStore()
      store.setUnit('k€')
      vi.clearAllMocks()
      store.cycleUnit()
      expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, 'M€')
    })
  })
})
