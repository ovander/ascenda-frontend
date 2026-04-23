/**
 * DashboardView.plan-limit-gate.spec.ts
 *
 * Verifies that the "New Plan" button in DashboardView correctly gates users
 * before they enter the 5-step wizard, based on their subscription tier and
 * current plan count.
 *
 * Covered behaviour — goToNewPlan():
 *   Freemium (limit = 1)
 *     - 0 plans  → navigates to /plans/new
 *     - 1 plan   → shows upgrade modal targeting "pro", does NOT navigate
 *
 *   Pro (limit = 3)
 *     - 2 plans  → navigates to /plans/new
 *     - 3 plans  → shows upgrade modal targeting "enterprise", does NOT navigate
 *
 *   Enterprise (unlimited)
 *     - 10 plans → navigates to /plans/new, no modal
 *
 * Strategy
 * ────────
 * • useTierGate is vi.mocked with controllable isFreemium / isEnterprise refs.
 * • usePlanStore is vi.mocked with a getter that reads a test-controlled ref.
 * • useRouter.push is a vi.fn() spy.
 * • All PrimeVue components are stubbed; only the two header Buttons matter.
 * • The "New Plan" button is the second <button> element in the rendered DOM
 *   (the first is "Reset demo plans").
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

// ── useTierGate — controllable mock ──────────────────────────────────────────
const mockIsFreemium   = ref(false)
const mockIsEnterprise = ref(false)
const mockShowUpgradeModal = vi.fn()

vi.mock('@/composables/useTierGate', () => ({
  useTierGate: () => ({
    isFreemium:       mockIsFreemium,
    isEnterprise:     mockIsEnterprise,
    showUpgradeModal: mockShowUpgradeModal,
  }),
}))

// ── usePlanStore — controllable plan count ────────────────────────────────────
const mockPlans = ref<any[]>([])

vi.mock('@/features/plans/stores/planStore', () => ({
  usePlanStore: () => ({
    get plans() { return mockPlans.value },
    loading: false,
    fetchPlans: vi.fn().mockResolvedValue(undefined),
    updatePlan:  vi.fn(),
    deletePlan:  vi.fn(),
    setActive:   vi.fn(),
    resetDemoPlans: vi.fn(),
  }),
}))

// ── vue-router — spy on push ───────────────────────────────────────────────────
const mockPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// ── Other deps ────────────────────────────────────────────────────────────────
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ user: { name: 'Test User' } }),
}))
vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({ require: vi.fn() }),
}))
vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}))
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

// ── Component stubs ────────────────────────────────────────────────────────────
const stubs = {
  Button:        { template: '<button @click="$emit(\'click\')"><slot /></button>', emits: ['click'] },
  DataTable:     { template: '<div />' },
  Column:        { template: '<div />' },
  Card:          { template: '<div><slot name="content" /></div>' },
  Tag:           { template: '<span />' },
  Select:        { template: '<div />' },
  ConfirmDialog: { template: '<div />' },
  Toast:         { template: '<div />' },
}

import DashboardView from './DashboardView.vue'

// ── Mount helper ──────────────────────────────────────────────────────────────
function mountView() {
  return mount(DashboardView, { global: { stubs } })
}

/** Click the "New Plan" button (second header button). */
async function clickNewPlan(wrapper: ReturnType<typeof mountView>) {
  const buttons = wrapper.findAll('button')
  // buttons[0] = "Reset demo plans", buttons[1] = "New Plan"
  await buttons[1].trigger('click')
  await nextTick()
}

// ─────────────────────────────────────────────────────────────────────────────
describe('DashboardView — New Plan tier limit gate', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockIsFreemium.value   = false
    mockIsEnterprise.value = false
    mockPlans.value        = []
    mockPush.mockClear()
    mockShowUpgradeModal.mockClear()
  })

  // ── Freemium (limit = 1) ───────────────────────────────────────────────────
  describe('freemium tier', () => {
    beforeEach(() => { mockIsFreemium.value = true })

    it('allows navigation when the user has 0 plans', async () => {
      mockPlans.value = []
      const wrapper = mountView()
      await clickNewPlan(wrapper)
      expect(mockPush).toHaveBeenCalledWith('/plans/new')
      expect(mockShowUpgradeModal).not.toHaveBeenCalled()
    })

    it('blocks navigation and shows upgrade modal when the user has 1 plan', async () => {
      mockPlans.value = [{ id: 'p1' }]
      const wrapper = mountView()
      await clickNewPlan(wrapper)
      expect(mockPush).not.toHaveBeenCalled()
      expect(mockShowUpgradeModal).toHaveBeenCalledWith('Additional Business Plans', 'pro')
    })

    it('blocks navigation when the user has more than 1 plan', async () => {
      mockPlans.value = [{ id: 'p1' }, { id: 'p2' }]
      const wrapper = mountView()
      await clickNewPlan(wrapper)
      expect(mockPush).not.toHaveBeenCalled()
      expect(mockShowUpgradeModal).toHaveBeenCalledTimes(1)
    })
  })

  // ── Pro (limit = 3) ────────────────────────────────────────────────────────
  describe('pro tier', () => {
    beforeEach(() => {
      mockIsFreemium.value   = false
      mockIsEnterprise.value = false
    })

    it('allows navigation when the user has 2 plans', async () => {
      mockPlans.value = [{ id: 'p1' }, { id: 'p2' }]
      const wrapper = mountView()
      await clickNewPlan(wrapper)
      expect(mockPush).toHaveBeenCalledWith('/plans/new')
      expect(mockShowUpgradeModal).not.toHaveBeenCalled()
    })

    it('blocks navigation and shows upgrade modal when the user has 3 plans', async () => {
      mockPlans.value = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }]
      const wrapper = mountView()
      await clickNewPlan(wrapper)
      expect(mockPush).not.toHaveBeenCalled()
      expect(mockShowUpgradeModal).toHaveBeenCalledWith('Additional Business Plans', 'enterprise')
    })

    it('blocks navigation when the user has more than 3 plans', async () => {
      mockPlans.value = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }]
      const wrapper = mountView()
      await clickNewPlan(wrapper)
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  // ── Enterprise (unlimited) ─────────────────────────────────────────────────
  describe('enterprise tier', () => {
    beforeEach(() => {
      mockIsFreemium.value   = false
      mockIsEnterprise.value = true
    })

    it('always navigates regardless of plan count', async () => {
      mockPlans.value = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}` }))
      const wrapper = mountView()
      await clickNewPlan(wrapper)
      expect(mockPush).toHaveBeenCalledWith('/plans/new')
      expect(mockShowUpgradeModal).not.toHaveBeenCalled()
    })

    it('navigates even with 0 plans', async () => {
      mockPlans.value = []
      const wrapper = mountView()
      await clickNewPlan(wrapper)
      expect(mockPush).toHaveBeenCalledWith('/plans/new')
    })
  })

  // ── Modal correctness ──────────────────────────────────────────────────────
  describe('upgrade modal content', () => {
    it('freemium at limit targets "pro" upgrade', async () => {
      mockIsFreemium.value = true
      mockPlans.value = [{ id: 'p1' }]
      const wrapper = mountView()
      await clickNewPlan(wrapper)
      const [, targetTier] = mockShowUpgradeModal.mock.calls[0]
      expect(targetTier).toBe('pro')
    })

    it('pro at limit targets "enterprise" upgrade', async () => {
      mockIsFreemium.value   = false
      mockIsEnterprise.value = false
      mockPlans.value = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }]
      const wrapper = mountView()
      await clickNewPlan(wrapper)
      const [, targetTier] = mockShowUpgradeModal.mock.calls[0]
      expect(targetTier).toBe('enterprise')
    })

    it('upgrade modal is called exactly once per blocked click', async () => {
      mockIsFreemium.value = true
      mockPlans.value = [{ id: 'p1' }]
      const wrapper = mountView()
      await clickNewPlan(wrapper)
      await clickNewPlan(wrapper)
      expect(mockShowUpgradeModal).toHaveBeenCalledTimes(2)
    })
  })
})
