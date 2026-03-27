import { describe, it, expect } from 'vitest'
import { useDirtyState, getDirtyModules } from './useDirtyState'

// The registry is a module-level singleton — use a unique key per test to
// guarantee isolation without resetting global state.
let keySeq = 0
function key(): string {
  return `dirty-spec-${keySeq++}`
}

describe('useDirtyState', () => {
  // ── Initial state ──────────────────────────────────────────────────────────
  describe('initial state', () => {
    it('starts clean', () => {
      const d = useDirtyState(key())
      expect(d.state.value).toBe('clean')
    })

    it('isDirty is false', () => {
      expect(useDirtyState(key()).isDirty.value).toBe(false)
    })

    it('hasError is false', () => {
      expect(useDirtyState(key()).hasError.value).toBe(false)
    })

    it('isSaving is false', () => {
      expect(useDirtyState(key()).isSaving.value).toBe(false)
    })

    it('errorMessage is empty string', () => {
      expect(useDirtyState(key()).errorMessage.value).toBe('')
    })
  })

  // ── State transitions ──────────────────────────────────────────────────────
  describe('markDirty()', () => {
    it('sets state to dirty', () => {
      const d = useDirtyState(key())
      d.markDirty()
      expect(d.state.value).toBe('dirty')
    })

    it('sets isDirty to true', () => {
      const d = useDirtyState(key())
      d.markDirty()
      expect(d.isDirty.value).toBe(true)
    })

    it('clears errorMessage', () => {
      const d = useDirtyState(key())
      d.markError('old error')
      d.markDirty()
      // markDirty is a no-op while saving, so first clear saving state
      const d2 = useDirtyState(key())
      d2.markError('old error')
      d2.markDirty()
      expect(d2.errorMessage.value).toBe('')
    })

    it('is a no-op while saving (does not override in-flight save)', () => {
      const d = useDirtyState(key())
      d.markSaving()
      d.markDirty()
      expect(d.state.value).toBe('saving')
    })
  })

  describe('markSaving()', () => {
    it('sets state to saving', () => {
      const d = useDirtyState(key())
      d.markSaving()
      expect(d.state.value).toBe('saving')
    })

    it('sets isSaving to true', () => {
      const d = useDirtyState(key())
      d.markSaving()
      expect(d.isSaving.value).toBe(true)
    })

    it('clears errorMessage', () => {
      const d = useDirtyState(key())
      d.markError('stale error')
      d.markSaving()
      expect(d.errorMessage.value).toBe('')
    })
  })

  describe('markClean()', () => {
    it('sets state to clean', () => {
      const d = useDirtyState(key())
      d.markDirty()
      d.markSaving()
      d.markClean()
      expect(d.state.value).toBe('clean')
    })

    it('clears isDirty', () => {
      const d = useDirtyState(key())
      d.markDirty()
      d.markClean()
      expect(d.isDirty.value).toBe(false)
    })

    it('clears errorMessage', () => {
      const d = useDirtyState(key())
      d.markError('some error')
      d.markClean()
      expect(d.errorMessage.value).toBe('')
    })
  })

  describe('markError()', () => {
    it('sets state to error', () => {
      const d = useDirtyState(key())
      d.markError()
      expect(d.state.value).toBe('error')
    })

    it('sets hasError to true', () => {
      const d = useDirtyState(key())
      d.markError()
      expect(d.hasError.value).toBe(true)
    })

    it('uses a default message when none provided', () => {
      const d = useDirtyState(key())
      d.markError()
      expect(d.errorMessage.value).toBe('Changes not saved — please retry.')
    })

    it('stores a custom message', () => {
      const d = useDirtyState(key())
      d.markError('Network timeout')
      expect(d.errorMessage.value).toBe('Network timeout')
    })
  })

  describe('reset()', () => {
    it('returns state to clean from dirty', () => {
      const d = useDirtyState(key())
      d.markDirty()
      d.reset()
      expect(d.state.value).toBe('clean')
    })

    it('returns state to clean from error', () => {
      const d = useDirtyState(key())
      d.markError('oops')
      d.reset()
      expect(d.state.value).toBe('clean')
    })

    it('clears errorMessage', () => {
      const d = useDirtyState(key())
      d.markError('oops')
      d.reset()
      expect(d.errorMessage.value).toBe('')
    })
  })

  // ── Happy / error paths ────────────────────────────────────────────────────
  describe('full save cycle', () => {
    it('clean → dirty → saving → clean', () => {
      const d = useDirtyState(key())
      expect(d.state.value).toBe('clean')
      d.markDirty()
      expect(d.state.value).toBe('dirty')
      d.markSaving()
      expect(d.state.value).toBe('saving')
      d.markClean()
      expect(d.state.value).toBe('clean')
    })

    it('clean → dirty → saving → error', () => {
      const d = useDirtyState(key())
      d.markDirty()
      d.markSaving()
      d.markError('Save failed')
      expect(d.state.value).toBe('error')
      expect(d.errorMessage.value).toBe('Save failed')
    })
  })

  // ── Shared registry ────────────────────────────────────────────────────────
  describe('shared registry', () => {
    it('two handles with the same key share the canonical state ref', () => {
      const k = key()
      const a = useDirtyState(k)
      const b = useDirtyState(k)
      a.markDirty()
      expect(b.state.value).toBe('dirty')
    })

    it('markClean on one handle is visible on another', () => {
      const k = key()
      const a = useDirtyState(k)
      const b = useDirtyState(k)
      a.markDirty()
      b.markClean()
      expect(a.state.value).toBe('clean')
    })

    it('handles with different keys are fully independent', () => {
      const a = useDirtyState(key())
      const b = useDirtyState(key())
      a.markDirty()
      expect(b.state.value).toBe('clean')
    })
  })

  // ── getDirtyModules() ──────────────────────────────────────────────────────
  describe('getDirtyModules()', () => {
    it('includes a dirty module', () => {
      const k = key()
      useDirtyState(k).markDirty()
      expect(getDirtyModules()).toContain(k)
    })

    it('includes an errored module', () => {
      const k = key()
      useDirtyState(k).markError()
      expect(getDirtyModules()).toContain(k)
    })

    it('does not include a clean module', () => {
      const k = key()
      const d = useDirtyState(k)
      d.markDirty()
      d.markClean()
      expect(getDirtyModules()).not.toContain(k)
    })

    it('does not include a saving module', () => {
      const k = key()
      useDirtyState(k).markSaving()
      expect(getDirtyModules()).not.toContain(k)
    })
  })
})
