/**
 * PlanOverviewView.scenario-limit-gate.spec.ts
 *
 * Verifies that the "New Scenario" button in PlanOverviewView correctly gates
 * users before they enter the creation dialog, based on subscription tier and
 * the current number of scenarios in the active plan.
 *
 * Covered behaviour — requestNewScenario():
 *   Freemium (limit = 1 scenario per plan)
 *     - 0 scenarios → dialog opens (showNewDialog becomes true)
 *     - 1 scenario  → upgrade modal shown targeting "pro", dialog stays closed
 *
 *   Pro (limit = 3 scenarios per plan)
 *     - 2 scenarios → dialog opens
 *     - 3 scenarios → upgrade modal shown targeting "enterprise", dialog stays closed
 *
 *   Enterprise (unlimited)
 *     - 10 scenarios → dialog always opens, no modal
 *
 * Strategy
 * ────────
 * • useTierGate is vi.mocked with controllable isFreemium / isEnterprise refs.
 * • useScenarioStore is vi.mocked with a getter reading a test-controlled ref.
 * • usePlanStore returns a minimal active plan.
 * • The Dialog component is stubbed to always render its content slot — this
 *   lets the test inspect whether showNewDialog flipped to true by checking
 *   whether the "Create" button inside the dialog is present.
 *   Alternatively, openness is inferred from showUpgradeModal not being called
 *   (navigation to dialog means no modal; modal means no dialog).
 * • All heavy PrimeVue components are stubbed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, defineComponent, nextTick } from 'vue'
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

// ── useScenarioStore — controllable scenario count ────────────────────────────
const mockScenarios = ref<any[]>([])

vi.mock('@/features/scenarios/stores/scenarioStore', () => ({
  useScenarioStore: () => ({
    get scenarios() { return mockScenarios.value },
    loading: false,
    fetchScenarios:  vi.fn().mockResolvedValue(undefined),
    createScenario:  vi.fn().mockResolvedValue({ id: 'sc-new', name: 'New' }),
    setActive:       vi.fn(),
    cloneScenario:   vi.fn(),
    deleteScenario:  vi.fn(),
    activeScenario:  null,
  }),
}))

// ── usePlanStore — minimal active plan ────────────────────────────────────────
vi.mock('@/features/plans/stores/planStore', () => ({
  usePlanStore: () => ({
    activePlan: { id: 'plan-1', name: 'My Plan', status: null },
    loading: false,
    fetchPlan:   vi.fn().mockResolvedValue(undefined),
    lockPlan:    vi.fn(),
    unlockPlan:  vi.fn(),
    archivePlan: vi.fn(),
    getScenarioImpact: vi.fn().mockResolvedValue({ scenarioCount: 0 }),
  }),
}))

// ── vue-router ────────────────────────────────────────────────────────────────
const mockPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// ── Other deps ────────────────────────────────────────────────────────────────
vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({ isOwner: ref(false) }),
}))
vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}))
vi.mock('@/utils/logger', () => ({ devlog: { error: vi.fn() } }))

// ── Component stubs ────────────────────────────────────────────────────────────
// Dialog stub always renders its default slot so we can see "inside" the dialog.
const DialogStub = defineComponent({
  props: ['visible', 'header', 'modal', 'style'],
  emits: ['update:visible', 'hide'],
  template: '<div class="dialog-stub" :data-visible="visible"><slot /></div>',
})

const SafeDeleteModalStub = defineComponent({
  props: ['visible', 'loading', 'impact'],
  emits: ['update:visible', 'confirm'],
  template: '<div />',
})

const stubs = {
  Dialog:            DialogStub,
  SafeDeleteModal:   SafeDeleteModalStub,
  PlanMembersPanel:  { template: '<div />' },
  DataTable:         { template: '<div />' },
  Column:            { template: '<div />' },
  Card:              { template: '<div><slot name="title" /><slot name="content" /></div>' },
  Tag:               { template: '<span />' },
  Button:            { template: '<button @click="$emit(\'click\')" :data-label="$attrs.label"><slot /></button>', emits: ['click'], inheritAttrs: false },
  InputText:         { template: '<input />' },
  Textarea:          { template: '<textarea />' },
  Toast:             { template: '<div />' },
}

import PlanOverviewView from './PlanOverviewView.vue'

// ── Mount helper ──────────────────────────────────────────────────────────────
function mountView() {
  return mount(PlanOverviewView, {
    props: { planId: 'plan-1' },
    global: { stubs },
  })
}

/** Click the "New Scenario" button (last button in the header action bar). */
async function clickNewScenario(wrapper: ReturnType<typeof mountView>) {
  // With activePlan.status = null, no lifecycle buttons are rendered.
  // The only Button in the header is "New Scenario".
  const buttons = wrapper.findAll('button')
  // Last button is always "New Scenario"
  await buttons[buttons.length - 1].trigger('click')
  await nextTick()
}

// ─────────────────────────────────────────────────────────────────────────────
describe('PlanOverviewView — New Scenario tier limit gate', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockIsFreemium.value   = false
    mockIsEnterprise.value = false
    mockScenarios.value    = []
    mockPush.mockClear()
    mockShowUpgradeModal.mockClear()
  })

  // ── Freemium (limit = 1 scenario per plan) ─────────────────────────────────
  describe('freemium tier', () => {
    beforeEach(() => { mockIsFreemium.value = true })

    it('opens the dialog when the plan has 0 scenarios', async () => {
      mockScenarios.value = []
      const wrapper = mountView()
      await clickNewScenario(wrapper)
      // Dialog stub renders with data-visible="true" when showNewDialog is true
      expect(wrapper.find('.dialog-stub').attributes('data-visible')).toBe('true')
      expect(mockShowUpgradeModal).not.toHaveBeenCalled()
    })

    it('blocks the dialog and shows upgrade modal when the plan has 1 scenario', async () => {
      mockScenarios.value = [{ id: 'sc1' }]
      const wrapper = mountView()
      await clickNewScenario(wrapper)
      expect(wrapper.find('.dialog-stub').attributes('data-visible')).toBe('false')
      expect(mockShowUpgradeModal).toHaveBeenCalledWith('Additional Scenarios', 'pro')
    })

    it('blocks the dialog when the plan has more than 1 scenario', async () => {
      mockScenarios.value = [{ id: 'sc1' }, { id: 'sc2' }]
      const wrapper = mountView()
      await clickNewScenario(wrapper)
      expect(wrapper.find('.dialog-stub').attributes('data-visible')).toBe('false')
      expect(mockShowUpgradeModal).toHaveBeenCalledTimes(1)
    })
  })

  // ── Pro (limit = 3 scenarios per plan) ────────────────────────────────────
  describe('pro tier', () => {
    beforeEach(() => {
      mockIsFreemium.value   = false
      mockIsEnterprise.value = false
    })

    it('opens the dialog when the plan has 2 scenarios', async () => {
      mockScenarios.value = [{ id: 'sc1' }, { id: 'sc2' }]
      const wrapper = mountView()
      await clickNewScenario(wrapper)
      expect(wrapper.find('.dialog-stub').attributes('data-visible')).toBe('true')
      expect(mockShowUpgradeModal).not.toHaveBeenCalled()
    })

    it('blocks the dialog and shows upgrade modal when the plan has 3 scenarios', async () => {
      mockScenarios.value = [{ id: 'sc1' }, { id: 'sc2' }, { id: 'sc3' }]
      const wrapper = mountView()
      await clickNewScenario(wrapper)
      expect(wrapper.find('.dialog-stub').attributes('data-visible')).toBe('false')
      expect(mockShowUpgradeModal).toHaveBeenCalledWith('Additional Scenarios', 'enterprise')
    })

    it('blocks the dialog when the plan has more than 3 scenarios', async () => {
      mockScenarios.value = [{ id: 'sc1' }, { id: 'sc2' }, { id: 'sc3' }, { id: 'sc4' }]
      const wrapper = mountView()
      await clickNewScenario(wrapper)
      expect(wrapper.find('.dialog-stub').attributes('data-visible')).toBe('false')
    })
  })

  // ── Enterprise (unlimited) ─────────────────────────────────────────────────
  describe('enterprise tier', () => {
    beforeEach(() => {
      mockIsFreemium.value   = false
      mockIsEnterprise.value = true
    })

    it('always opens the dialog regardless of scenario count', async () => {
      mockScenarios.value = Array.from({ length: 10 }, (_, i) => ({ id: `sc${i}` }))
      const wrapper = mountView()
      await clickNewScenario(wrapper)
      expect(wrapper.find('.dialog-stub').attributes('data-visible')).toBe('true')
      expect(mockShowUpgradeModal).not.toHaveBeenCalled()
    })

    it('opens the dialog with 0 scenarios', async () => {
      mockScenarios.value = []
      const wrapper = mountView()
      await clickNewScenario(wrapper)
      expect(wrapper.find('.dialog-stub').attributes('data-visible')).toBe('true')
    })
  })

  // ── Modal correctness ──────────────────────────────────────────────────────
  describe('upgrade modal content', () => {
    it('freemium at limit targets "pro" upgrade', async () => {
      mockIsFreemium.value  = true
      mockScenarios.value   = [{ id: 'sc1' }]
      const wrapper = mountView()
      await clickNewScenario(wrapper)
      const [featureName, targetTier] = mockShowUpgradeModal.mock.calls[0]
      expect(featureName).toBe('Additional Scenarios')
      expect(targetTier).toBe('pro')
    })

    it('pro at limit targets "enterprise" upgrade', async () => {
      mockIsFreemium.value   = false
      mockIsEnterprise.value = false
      mockScenarios.value    = [{ id: 'sc1' }, { id: 'sc2' }, { id: 'sc3' }]
      const wrapper = mountView()
      await clickNewScenario(wrapper)
      const [featureName, targetTier] = mockShowUpgradeModal.mock.calls[0]
      expect(featureName).toBe('Additional Scenarios')
      expect(targetTier).toBe('enterprise')
    })

    it('showUpgradeModal is called exactly once per blocked click', async () => {
      mockIsFreemium.value = true
      mockScenarios.value  = [{ id: 'sc1' }]
      const wrapper = mountView()
      await clickNewScenario(wrapper)
      await clickNewScenario(wrapper)
      expect(mockShowUpgradeModal).toHaveBeenCalledTimes(2)
    })
  })
})
