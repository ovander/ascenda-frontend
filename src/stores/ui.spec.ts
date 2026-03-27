import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUiStore } from './ui'

describe('useUiStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('initial state', () => {
    it('sidebarCollapsed is false', () => {
      expect(useUiStore().sidebarCollapsed).toBe(false)
    })

    it('loading is false', () => {
      expect(useUiStore().loading).toBe(false)
    })

    it('loadingMessage is empty string', () => {
      expect(useUiStore().loadingMessage).toBe('')
    })

    it('toastMessages is empty array', () => {
      expect(useUiStore().toastMessages).toEqual([])
    })
  })

  describe('toggleSidebar', () => {
    it('collapses an open sidebar', () => {
      const store = useUiStore()
      store.toggleSidebar()
      expect(store.sidebarCollapsed).toBe(true)
    })

    it('expands a collapsed sidebar', () => {
      const store = useUiStore()
      store.toggleSidebar()
      store.toggleSidebar()
      expect(store.sidebarCollapsed).toBe(false)
    })
  })

  describe('setLoading', () => {
    it('sets loading to true', () => {
      const store = useUiStore()
      store.setLoading(true)
      expect(store.loading).toBe(true)
    })

    it('sets loading to false', () => {
      const store = useUiStore()
      store.setLoading(true)
      store.setLoading(false)
      expect(store.loading).toBe(false)
    })

    it('sets loadingMessage when provided', () => {
      const store = useUiStore()
      store.setLoading(true, 'Please wait...')
      expect(store.loadingMessage).toBe('Please wait...')
    })

    it('clears loadingMessage when not provided', () => {
      const store = useUiStore()
      store.setLoading(true, 'old message')
      store.setLoading(false)
      expect(store.loadingMessage).toBe('')
    })
  })

  describe('showToast', () => {
    it('adds a success toast', () => {
      const store = useUiStore()
      store.showToast('success', 'Saved', 'Your changes were saved.')
      expect(store.toastMessages).toHaveLength(1)
      expect(store.toastMessages[0]).toMatchObject({
        severity: 'success',
        summary: 'Saved',
        detail: 'Your changes were saved.',
        life: 3000,
      })
    })

    it('adds an error toast', () => {
      const store = useUiStore()
      store.showToast('error', 'Error', 'Something went wrong.')
      expect(store.toastMessages[0].severity).toBe('error')
    })

    it('accepts custom life duration', () => {
      const store = useUiStore()
      store.showToast('info', 'Info', '', 5000)
      expect(store.toastMessages[0].life).toBe(5000)
    })

    it('accumulates multiple toasts', () => {
      const store = useUiStore()
      store.showToast('success', 'A', '')
      store.showToast('error', 'B', '')
      expect(store.toastMessages).toHaveLength(2)
    })

    it('defaults detail to empty string', () => {
      const store = useUiStore()
      store.showToast('warn', 'Warning')
      expect(store.toastMessages[0].detail).toBe('')
    })
  })
})
