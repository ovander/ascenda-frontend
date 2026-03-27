import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import KSaveBanner from './KSaveBanner.vue'
import { useDirtyState } from '@/composables/useDirtyState'

// Unique key per test to avoid registry cross-contamination.
let keySeq = 0
function key(): string {
  return `banner-spec-${keySeq++}`
}

// Stub <Transition> so that v-if removal is immediate and not gated on
// requestAnimationFrame / CSS transitionend events (which JSDOM does not fire).
// This lets fake-timer tests reliably assert element presence after vi.advanceTimersByTime.
function mountBanner(moduleKey: string, loading?: boolean) {
  return mount(KSaveBanner, {
    props: loading !== undefined ? { moduleKey, loading } : { moduleKey },
    global: { stubs: { Transition: true } },
  })
}

describe('KSaveBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── Visibility gating ──────────────────────────────────────────────────────
  describe('loading prop', () => {
    it('hides banner when loading=true, even if dirty', async () => {
      const k = key()
      useDirtyState(k).markDirty()
      const wrapper = mountBanner(k, true)
      await nextTick()
      expect(wrapper.find('div').exists()).toBe(false)
    })

    it('hides banner when loading=true, even if saving', async () => {
      const k = key()
      useDirtyState(k).markSaving()
      const wrapper = mountBanner(k, true)
      await nextTick()
      expect(wrapper.find('div').exists()).toBe(false)
    })

    it('shows banner when loading=false and dirty', async () => {
      const k = key()
      useDirtyState(k).markDirty()
      const wrapper = mountBanner(k, false)
      await nextTick()
      expect(wrapper.find('div').exists()).toBe(true)
    })
  })

  // ── Dirty state ────────────────────────────────────────────────────────────
  describe('dirty state', () => {
    it('shows "Unsaved changes" label', async () => {
      const k = key()
      useDirtyState(k).markDirty()
      const wrapper = mountBanner(k)
      await nextTick()
      expect(wrapper.text()).toContain('Unsaved changes')
    })

    it('applies amber background class', async () => {
      const k = key()
      useDirtyState(k).markDirty()
      const wrapper = mountBanner(k)
      await nextTick()
      expect(wrapper.find('div').classes()).toContain('bg-amber-50')
    })

    it('renders orange dot indicator (no icon element)', async () => {
      const k = key()
      useDirtyState(k).markDirty()
      const wrapper = mountBanner(k)
      await nextTick()
      // dot is a <span>, not an <i> or <svg>
      expect(wrapper.find('span.bg-amber-400').exists()).toBe(true)
    })
  })

  // ── Saving state ───────────────────────────────────────────────────────────
  describe('saving state', () => {
    it('shows "Saving…" label', async () => {
      const k = key()
      useDirtyState(k).markSaving()
      const wrapper = mountBanner(k)
      await nextTick()
      expect(wrapper.text()).toContain('Saving…')
    })

    it('applies blue background class', async () => {
      const k = key()
      useDirtyState(k).markSaving()
      const wrapper = mountBanner(k)
      await nextTick()
      expect(wrapper.find('div').classes()).toContain('bg-blue-50')
    })

    it('renders a spinner svg', async () => {
      const k = key()
      useDirtyState(k).markSaving()
      const wrapper = mountBanner(k)
      await nextTick()
      expect(wrapper.find('svg.animate-spin').exists()).toBe(true)
    })
  })

  // ── Error state ────────────────────────────────────────────────────────────
  describe('error state', () => {
    it('shows custom error message', async () => {
      const k = key()
      useDirtyState(k).markError('Network timeout — changes not saved')
      const wrapper = mountBanner(k)
      await nextTick()
      expect(wrapper.text()).toContain('Network timeout — changes not saved')
    })

    it('shows default error message when markError called with no args', async () => {
      const k = key()
      useDirtyState(k).markError()
      const wrapper = mountBanner(k)
      await nextTick()
      expect(wrapper.text()).toContain('Changes not saved — please retry.')
    })

    it('applies red background class', async () => {
      const k = key()
      useDirtyState(k).markError()
      const wrapper = mountBanner(k)
      await nextTick()
      expect(wrapper.find('div').classes()).toContain('bg-red-50')
    })
  })

  // ── Clean state (post-save) ────────────────────────────────────────────────
  describe('clean state after save', () => {
    it('transitions from "Unsaved changes" to "All changes saved" on markClean', async () => {
      const k = key()
      const dirty = useDirtyState(k)
      dirty.markDirty()
      const wrapper = mountBanner(k)
      await nextTick()
      expect(wrapper.text()).toContain('Unsaved changes')

      dirty.markClean()
      await nextTick()
      expect(wrapper.text()).toContain('All changes saved')
    })

    it('applies green background class after markClean', async () => {
      const k = key()
      const dirty = useDirtyState(k)
      dirty.markDirty()
      const wrapper = mountBanner(k)
      dirty.markClean()
      await nextTick()
      expect(wrapper.find('div').classes()).toContain('bg-green-50')
    })

    it('"All changes saved" is still visible at 2999 ms', async () => {
      const k = key()
      const dirty = useDirtyState(k)
      dirty.markDirty()
      const wrapper = mountBanner(k)
      await nextTick()
      dirty.markClean()
      await nextTick()

      vi.advanceTimersByTime(2999)
      await nextTick()
      expect(wrapper.text()).toContain('All changes saved')
    })

    it('"All changes saved" auto-fades after 3 seconds', async () => {
      const k = key()
      const dirty = useDirtyState(k)
      dirty.markDirty()
      const wrapper = mountBanner(k)
      await nextTick()
      dirty.markClean()
      await nextTick()
      expect(wrapper.text()).toContain('All changes saved')

      vi.advanceTimersByTime(3000)
      await nextTick()
      expect(wrapper.find('div').exists()).toBe(false)
    })

    it('transitioning to dirty while "All changes saved" is showing cancels the fade timer', async () => {
      const k = key()
      const dirty = useDirtyState(k)
      dirty.markDirty()
      const wrapper = mountBanner(k)
      await nextTick()
      dirty.markClean()
      await nextTick()
      expect(wrapper.text()).toContain('All changes saved')

      // User edits again before the 3 s fade fires
      dirty.markDirty()
      await nextTick()
      expect(wrapper.text()).toContain('Unsaved changes')

      // Even after 3 s, banner should still show "Unsaved changes" (not hidden)
      vi.advanceTimersByTime(3000)
      await nextTick()
      expect(wrapper.find('div').exists()).toBe(true)
      expect(wrapper.text()).toContain('Unsaved changes')
    })
  })

  // ── Reactive updates ───────────────────────────────────────────────────────
  describe('reactive state updates', () => {
    it('updates label in the same mounted instance as state changes', async () => {
      const k = key()
      const dirty = useDirtyState(k)
      dirty.markDirty()
      const wrapper = mountBanner(k)
      await nextTick()
      expect(wrapper.text()).toContain('Unsaved changes')

      dirty.markSaving()
      await nextTick()
      expect(wrapper.text()).toContain('Saving…')

      dirty.markClean()
      await nextTick()
      expect(wrapper.text()).toContain('All changes saved')
    })

    it('hides the banner when loading switches to true while dirty', async () => {
      const k = key()
      useDirtyState(k).markDirty()
      const wrapper = mountBanner(k, false)
      await nextTick()
      expect(wrapper.find('div').exists()).toBe(true)

      await wrapper.setProps({ loading: true })
      await nextTick()
      expect(wrapper.find('div').exists()).toBe(false)
    })
  })
})
