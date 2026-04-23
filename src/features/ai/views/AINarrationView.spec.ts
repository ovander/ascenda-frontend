/**
 * AINarrationView.spec.ts
 *
 * Tests focus on:
 *   1. onMounted triggers the correct fetchNarration call for the active feature.
 *   2. watch(featureKey) — navigating to a different :feature param without
 *      unmounting the component triggers a new fetchNarration call.  This tests
 *      the fix for the bug where Vue Router reuses the same AINarrationView
 *      instance and onMounted only fires once.
 *   3. Freemium users are blocked before any API call.
 *   4. Error state — store.error is rendered as a Message.
 *   5. Loading state — spinner is visible while store.loading is true.
 *   6. Unknown feature key — error Message is shown, fetchNarration not called.
 *   7. Refresh button triggers a new fetch.
 *   8. Every key in AI_FEATURES mounts without an "unknown feature" error.
 *
 * Strategy: We use a real Vue Router instance (in-memory history) so that
 * navigating between /ai/:feature routes exercises Vue's reactivity and the
 * watch(featureKey, …) watcher fires correctly — mirroring the real app.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, reactive, nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import AINarrationView from './AINarrationView.vue'
import { AI_FEATURES } from '@/features/ai/types'

// ── vue-i18n ──────────────────────────────────────────────────────────────────
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string>) => {
      if (params) return `${key}:${JSON.stringify(params)}`
      return key
    },
  }),
}))

// ── Tier gate ─────────────────────────────────────────────────────────────────
const mockTierGate = {
  isFreemium: ref(false),
  isPro: ref(true),
  isEnterprise: ref(true),
  gate: vi.fn(() => true),
}
vi.mock('@/composables/useTierGate', () => ({
  useTierGate: () => mockTierGate,
}))

// ── Scenario analysis composable ──────────────────────────────────────────────
// useScenarioAnalysis returns refs directly (not a Pinia store), so we keep
// refs here so that `scenarioAnalysis.loading.value` in the component works.
const mockScenarioAnalysis = {
  analysis: ref<any>(null),
  loading: ref(false),
  error: ref<string | null>(null),
  fetch: vi.fn().mockResolvedValue(undefined),
  reset: vi.fn(),
}
vi.mock('@/features/scenarios/composables/useScenarioAnalysis', () => ({
  useScenarioAnalysis: () => mockScenarioAnalysis,
}))

// ── AI store ──────────────────────────────────────────────────────────────────
// Wrap in reactive() so that accessing mockAIStore.loading / .narration /
// .error returns the unwrapped value (boolean / object / string) — matching
// how Pinia's defineStore() auto-unwraps returned refs.  Tests can then do
// `mockAIStore.loading = true` directly.
const mockAIStore = reactive({
  narration: null as any,
  loading: false,
  error: null as string | null,
  fetchNarration: vi.fn().mockResolvedValue(undefined),
  reset: vi.fn(),
})
vi.mock('@/features/ai/stores/aiStore', () => ({
  useAIStore: () => mockAIStore,
}))

// ── PrimeVue stubs ────────────────────────────────────────────────────────────
vi.mock('primevue/button', () => ({
  default: { template: '<button @click="$emit(\'click\')" v-bind="$attrs"><slot /></button>', emits: ['click'] },
}))
vi.mock('primevue/progressspinner', () => ({
  default: { template: '<div data-testid="spinner" />' },
}))
vi.mock('primevue/message', () => ({
  default: { template: '<div data-testid="message"><slot /></div>' },
}))

// ── Child component stubs ─────────────────────────────────────────────────────
vi.mock('@/features/ai/components/NarrationCard.vue', () => ({
  default: { template: '<div data-testid="narration-card" />' },
}))
vi.mock('@/features/ai/components/ScenarioAnalysisCard.vue', () => ({
  default: { template: '<div data-testid="scenario-analysis-card" />' },
}))

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a real in-memory Vue Router so that navigating between /ai/:feature
 * routes triggers Vue's reactivity (route.params.feature changes) and exercises
 * the watch(featureKey) watcher in AINarrationView.
 */
function makeRouter(initialFeature = 'narrate') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/plans/:planId/scenarios/:sid/ai/:feature',
        name: 'ai-feature',
        component: AINarrationView,
        props: true,
      },
    ],
  })
  router.push(`/plans/plan-1/scenarios/sc-1/ai/${initialFeature}`)
  return router
}

async function mountView(feature = 'narrate') {
  const router = makeRouter(feature)
  await router.isReady()

  const wrapper = mount(AINarrationView, {
    props: { planId: 'plan-1', sid: 'sc-1' },
    global: {
      plugins: [router],
      directives: { tooltip: {} },
    },
  })
  await flushPromises()
  return { wrapper, router }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('AINarrationView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    // Restore default mock implementations after clearAllMocks wipes them.
    mockAIStore.fetchNarration.mockResolvedValue(undefined)
    mockScenarioAnalysis.fetch.mockResolvedValue(undefined)
    mockTierGate.gate.mockReturnValue(true)
    // Reset reactive state.
    mockAIStore.narration = null
    mockAIStore.loading = false
    mockAIStore.error = null
    mockScenarioAnalysis.analysis.value = null
    mockScenarioAnalysis.loading.value = false
    mockScenarioAnalysis.error.value = null
    mockTierGate.isFreemium.value = false
    mockTierGate.isPro.value = true
    mockTierGate.isEnterprise.value = true
  })

  // ── onMounted: initial fetch ──────────────────────────────────────────────

  describe('onMounted', () => {
    it('calls fetchNarration with the narrate endpoint on mount', async () => {
      await mountView('narrate')
      expect(mockAIStore.fetchNarration).toHaveBeenCalledWith(
        'narrate',
        expect.anything(),
      )
    })

    it('calls fetchNarration with unit-economics endpoint', async () => {
      await mountView('unit-economics')
      expect(mockAIStore.fetchNarration).toHaveBeenCalledWith(
        'unit-economics',
        expect.objectContaining({ narration_type: 'unit_economics' }),
      )
    })

    it('does NOT call fetchNarration for freemium users (gate blocks)', async () => {
      mockTierGate.isFreemium.value = true
      mockTierGate.gate.mockReturnValue(false)
      await mountView('narrate')
      expect(mockAIStore.fetchNarration).not.toHaveBeenCalled()
    })

    it('resets store state before fetching', async () => {
      await mountView('narrate')
      expect(mockAIStore.reset).toHaveBeenCalled()
    })
  })

  // ── watch(featureKey): feature-switch without unmount ─────────────────────

  describe('watch(featureKey) — feature switching (Vue Router reuse)', () => {
    it('re-fetches when navigating from narrate to unit-economics', async () => {
      const { router } = await mountView('narrate')

      const callsBefore = mockAIStore.fetchNarration.mock.calls.length
      expect(callsBefore).toBe(1)

      // Navigate to a different feature — same component instance is reused.
      await router.push('/plans/plan-1/scenarios/sc-1/ai/unit-economics')
      await flushPromises()
      await nextTick()

      expect(mockAIStore.fetchNarration.mock.calls.length).toBeGreaterThan(callsBefore)
      const lastCall = mockAIStore.fetchNarration.mock.calls.at(-1)!
      expect(lastCall[0]).toBe('unit-economics')
    })

    it('re-fetches again when switching to a third feature', async () => {
      const { router } = await mountView('narrate')

      await router.push('/plans/plan-1/scenarios/sc-1/ai/unit-economics')
      await flushPromises()
      await nextTick()

      await router.push('/plans/plan-1/scenarios/sc-1/ai/assumption-review')
      await flushPromises()
      await nextTick()

      const allEndpoints = mockAIStore.fetchNarration.mock.calls.map((c) => c[0])
      expect(allEndpoints).toContain('assumption-review')
    })

    it('resets store state on each feature switch', async () => {
      const { router } = await mountView('narrate')
      const resetCallsBefore = mockAIStore.reset.mock.calls.length

      await router.push('/plans/plan-1/scenarios/sc-1/ai/unit-economics')
      await flushPromises()
      await nextTick()

      expect(mockAIStore.reset.mock.calls.length).toBeGreaterThan(resetCallsBefore)
    })

    it('does not double-fetch on initial mount (watch fires only on change)', async () => {
      // With a non-immediate watch, the watcher should NOT fire on mount;
      // only onMounted fires — so we expect exactly 1 call.
      await mountView('narrate')
      expect(mockAIStore.fetchNarration.mock.calls.length).toBe(1)
    })
  })

  // ── Loading state ──────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('shows spinner while store.loading is true', async () => {
      // fetchNarration sets loading synchronously; we capture the DOM mid-flight.
      let resolveNarration!: () => void
      mockAIStore.fetchNarration.mockImplementation(() => {
        mockAIStore.loading = true
        return new Promise<void>((res) => { resolveNarration = res })
      })

      // Mount without awaiting flushPromises so the pending fetch isn't drained yet.
      const router = makeRouter('narrate')
      await router.isReady()
      const wrapper = mount(AINarrationView, {
        props: { planId: 'plan-1', sid: 'sc-1' },
        global: { plugins: [router], directives: { tooltip: {} } },
      })
      // onMounted fires synchronously but the async fetch is pending.
      await nextTick()
      expect(wrapper.find('[data-testid="spinner"]').exists()).toBe(true)

      // Resolve the pending fetch and clear loading — spinner should disappear.
      mockAIStore.loading = false
      resolveNarration()
      await flushPromises()
      await nextTick()
      expect(wrapper.find('[data-testid="spinner"]').exists()).toBe(false)
    })
  })

  // ── Error state ────────────────────────────────────────────────────────────

  describe('error state', () => {
    it('shows service-unavailable error message', async () => {
      mockAIStore.fetchNarration.mockImplementation(async () => {
        mockAIStore.error = 'AI service is temporarily unavailable. Please try again later.'
      })
      const { wrapper } = await mountView('unit-economics')
      await nextTick()
      const msg = wrapper.find('[data-testid="message"]')
      expect(msg.exists()).toBe(true)
      expect(msg.text()).toContain('AI service is temporarily unavailable')
    })

    it('shows generic narration-failed error', async () => {
      mockAIStore.fetchNarration.mockImplementation(async () => {
        mockAIStore.error = 'AI narration failed'
      })
      const { wrapper } = await mountView('assumption-review')
      await nextTick()
      const msg = wrapper.find('[data-testid="message"]')
      expect(msg.exists()).toBe(true)
      expect(msg.text()).toContain('AI narration failed')
    })
  })

  // ── Unknown feature ────────────────────────────────────────────────────────

  describe('unknown feature', () => {
    it('shows an error message for an unknown feature key', async () => {
      const router = makeRouter('not-a-real-feature')
      await router.isReady()
      const wrapper = mount(AINarrationView, {
        props: { planId: 'plan-1', sid: 'sc-1' },
        global: { plugins: [router], directives: { tooltip: {} } },
      })
      await flushPromises()
      expect(wrapper.find('[data-testid="message"]').exists()).toBe(true)
    })

    it('does not call fetchNarration for an unknown feature key', async () => {
      const router = makeRouter('not-a-real-feature')
      await router.isReady()
      mount(AINarrationView, {
        props: { planId: 'plan-1', sid: 'sc-1' },
        global: { plugins: [router], directives: { tooltip: {} } },
      })
      await flushPromises()
      expect(mockAIStore.fetchNarration).not.toHaveBeenCalled()
    })
  })

  // ── Freemium access gate ───────────────────────────────────────────────────

  describe('freemium access gate', () => {
    it('shows a locked state for freemium users', async () => {
      mockTierGate.isFreemium.value = true
      mockTierGate.gate.mockReturnValue(false)
      const { wrapper } = await mountView('narrate')
      // The template renders an upgrade section with a lock icon.
      expect(wrapper.html()).toContain('pi-lock')
    })
  })

  // ── Refresh button ─────────────────────────────────────────────────────────

  describe('refresh button', () => {
    it('re-calls fetchNarration when the refresh button is clicked', async () => {
      const { wrapper } = await mountView('unit-economics')
      const callsBefore = mockAIStore.fetchNarration.mock.calls.length

      const btn = wrapper.find('button')
      if (btn.exists()) {
        await btn.trigger('click')
        await flushPromises()
        expect(mockAIStore.fetchNarration.mock.calls.length).toBeGreaterThan(callsBefore)
      }
    })
  })

  // ── AI_FEATURES registry coverage ─────────────────────────────────────────

  describe('AI_FEATURES registry completeness', () => {
    it('every feature in AI_FEATURES mounts without an unknown-feature error', async () => {
      for (const feature of AI_FEATURES) {
        vi.clearAllMocks()
        mockAIStore.fetchNarration.mockResolvedValue(undefined)
        mockTierGate.gate.mockReturnValue(true)

        const router = makeRouter(feature.key)
        await router.isReady()
        const wrapper = mount(AINarrationView, {
          props: { planId: 'plan-1', sid: 'sc-1' },
          global: { plugins: [router], directives: { tooltip: {} } },
        })
        await flushPromises()

        const messages = wrapper.findAll('[data-testid="message"]')
        const hasUnknownMsg = messages.some((m) =>
          m.text().includes(feature.key) && m.text().includes('ai.unknownFeature'),
        )
        expect(hasUnknownMsg).toBe(false)
        wrapper.unmount()
      }
    })
  })
})
