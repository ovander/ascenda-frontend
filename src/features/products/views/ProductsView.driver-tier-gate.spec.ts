/**
 * ProductsView.driver-tier-gate.spec.ts
 *
 * Tests the Pro tier-gating of business-driver cards in the "Add Product" dialog.
 *
 * Covered behaviour:
 *   isDriverLocked()
 *     - generic is never locked regardless of tier
 *     - all 6 non-generic drivers are locked on free tier
 *     - nothing is locked on pro/enterprise tier
 *
 *   Free-tier card rendering
 *     - all 7 driver cards are visible (shown but locked)
 *     - only non-generic cards carry driver-card--locked class
 *     - only locked cards show a PRO badge
 *     - locked card radio inputs are disabled (keyboard / programmatic safe)
 *     - generic radio input is enabled
 *
 *   Free-tier click behaviour
 *     - clicking a locked card calls showUpgradeModal('Business Drivers', 'pro')
 *     - clicking the generic card does NOT call showUpgradeModal
 *
 *   Pro-tier rendering
 *     - no card is locked
 *     - no PRO badges are present
 *
 *   Pro-tier click behaviour
 *     - clicking any non-generic card does NOT call showUpgradeModal
 *
 * Strategy
 * ────────
 * • useTierGate is vi.mocked to expose a mutable `isPro` ref.
 * • PrimeVue Dialog is stubbed to *always* render its default slot so the
 *   driver cards appear in the DOM without having to open the dialog.
 * • All other heavy dependencies (stores, composables, PrimeVue components)
 *   are stubbed to keep the test fast and isolated.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, defineComponent, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import ProductsView from './ProductsView.vue'

// ── useTierGate — controllable mock ──────────────────────────────────────────
const mockIsPro = ref(false)
const mockShowUpgradeModal = vi.fn()

vi.mock('@/composables/useTierGate', () => ({
  useTierGate: () => ({
    isPro: mockIsPro,
    showUpgradeModal: mockShowUpgradeModal,
  }),
}))

// ── Supporting composable mocks ───────────────────────────────────────────────
vi.mock('@/composables/usePlanAccess', () => ({
  usePlanAccess: () => ({ canEdit: ref(true) }),
}))

vi.mock('@/composables/useDecimal', () => ({
  useDecimal: () => ({
    formatCurrency: (v: number) => `€${v}`,
    formatPercent: (v: number) => `${v}%`,
    getLocale: () => 'fr',
    getUnitLabel: () => 'Units',
    formatUnit: (v: number) => String(v),
  }),
}))

vi.mock('@/composables/useYearHeaders', () => ({
  useYearHeaders: () => ({ yearHeaders: ['Y1', 'Y2', 'Y3', 'Y4', 'Y5'] }),
}))

vi.mock('@/utils/logger', () => ({ devlog: vi.fn() }))

// ── Store mocks ───────────────────────────────────────────────────────────────
vi.mock('@/features/products/stores/productStore', () => ({
  useProductStore: () => ({
    products: [],
    consolidatedRevenue: [],
    loading: false,
    fetchProducts: vi.fn().mockResolvedValue(undefined),
    fetchConsolidatedRevenue: vi.fn().mockResolvedValue(undefined),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    updateDriverParams: vi.fn(),
    fetchDerivedBundle: vi.fn(),
    getDerivedBundle: vi.fn(() => null),
    derivedBundlesMap: {},
  }),
}))

vi.mock('@/features/plans/stores/planStore', () => ({
  usePlanStore: () => ({ activePlan: { id: 'plan-1', name: 'Test Plan' } }),
}))

vi.mock('@/features/scenarios/stores/scenarioStore', () => ({
  useScenarioStore: () => ({ activeScenario: { id: 'scenario-1', name: 'Base' } }),
}))

// ── Component stubs ───────────────────────────────────────────────────────────
// Dialog stub always renders its default slot so the driver cards are in the DOM
// without needing to open the dialog programmatically.
const DialogStub = defineComponent({
  props: ['visible', 'header', 'modal', 'style'],
  emits: ['update:visible', 'hide'],
  template: '<div class="p-dialog-stub"><slot /></div>',
})

const stubs = {
  Dialog:             DialogStub,
  DataTable:          { template: '<div />' },
  Column:             { template: '<div />' },
  Button:             { template: '<button @click="$emit(\'click\')"><slot /></button>', emits: ['click'] },
  InputText:          { template: '<input />' },
  InputNumber:        { template: '<input />' },
  ProgressSpinner:    { template: '<div />' },
  KFieldLabel:        defineComponent({ props: ['label', 'tooltip'], template: '<span>{{ label }}</span>' }),
  KFormLegend:        { template: '<div />' },
  ProductDetailPanel: { template: '<div />' },
  DriverParamsForm:   { template: '<div />' },
}

// ── ALL 7 expected driver values ──────────────────────────────────────────────
const ALL_DRIVERS = ['generic', 'consulting', 'saas', 'industry', 'marketplace', 'media', 'session_based']
const LOCKED_DRIVERS = ALL_DRIVERS.filter((d) => d !== 'generic')

// ── Mount helper ──────────────────────────────────────────────────────────────
function mountView() {
  return mount(ProductsView, {
    global: { stubs },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
describe('ProductsView — driver card tier-gating', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockIsPro.value = false
    mockShowUpgradeModal.mockClear()
  })

  // ── isDriverLocked logic (verified via DOM output) ─────────────────────────
  describe('isDriverLocked — logic', () => {
    it('generic is never locked on free tier', () => {
      const wrapper = mountView()
      const genericCard = wrapper
        .findAll('.driver-card')
        .find((c) => c.find('input[type="radio"]').attributes('value') === 'generic')
      expect(genericCard).toBeDefined()
      expect(genericCard!.classes()).not.toContain('driver-card--locked')
    })

    it('all non-generic drivers produce a locked card on free tier', () => {
      const wrapper = mountView()
      const lockedCards = wrapper.findAll('.driver-card--locked')
      expect(lockedCards).toHaveLength(LOCKED_DRIVERS.length)
      const lockedValues = lockedCards.map(
        (c) => c.find('input[type="radio"]').attributes('value'),
      )
      for (const dt of LOCKED_DRIVERS) {
        expect(lockedValues).toContain(dt)
      }
    })

    it('no cards are locked on pro tier', async () => {
      mockIsPro.value = true
      const wrapper = mountView()
      await nextTick()
      expect(wrapper.findAll('.driver-card--locked')).toHaveLength(0)
    })
  })

  // ── Free-tier card rendering ───────────────────────────────────────────────
  describe('free-tier card rendering', () => {
    it('renders all 7 driver options (visible to free users)', () => {
      const wrapper = mountView()
      expect(wrapper.findAll('.driver-card')).toHaveLength(ALL_DRIVERS.length)
    })

    it('generic card has no driver-card--locked class', () => {
      const wrapper = mountView()
      const cards = wrapper.findAll('.driver-card')
      const genericCard = cards.find(
        (c) => c.find('input[type="radio"]').attributes('value') === 'generic',
      )
      expect(genericCard!.classes()).not.toContain('driver-card--locked')
    })

    it('all 6 non-generic cards have driver-card--locked class', () => {
      const wrapper = mountView()
      const lockedCards = wrapper.findAll('.driver-card--locked')
      expect(lockedCards).toHaveLength(6)
    })

    it('each locked card shows exactly one PRO badge', () => {
      const wrapper = mountView()
      const lockedCards = wrapper.findAll('.driver-card--locked')
      for (const card of lockedCards) {
        expect(card.findAll('.driver-card__pro-badge')).toHaveLength(1)
        expect(card.find('.driver-card__pro-badge').text()).toBe('PRO')
      }
    })

    it('generic card shows no PRO badge', () => {
      const wrapper = mountView()
      const genericCard = wrapper
        .findAll('.driver-card')
        .find((c) => c.find('input[type="radio"]').attributes('value') === 'generic')
      expect(genericCard!.find('.driver-card__pro-badge').exists()).toBe(false)
    })

    it('locked card radio inputs are disabled', () => {
      const wrapper = mountView()
      const lockedCards = wrapper.findAll('.driver-card--locked')
      for (const card of lockedCards) {
        const input = card.find('input[type="radio"]')
        expect(input.attributes('disabled')).toBeDefined()
      }
    })

    it('generic card radio input is NOT disabled', () => {
      const wrapper = mountView()
      const genericCard = wrapper
        .findAll('.driver-card')
        .find((c) => c.find('input[type="radio"]').attributes('value') === 'generic')
      const input = genericCard!.find('input[type="radio"]')
      expect(input.attributes('disabled')).toBeUndefined()
    })

    it('total PRO badges equals number of non-generic drivers', () => {
      const wrapper = mountView()
      expect(wrapper.findAll('.driver-card__pro-badge')).toHaveLength(LOCKED_DRIVERS.length)
    })
  })

  // ── Free-tier click behaviour ──────────────────────────────────────────────
  describe('free-tier click behaviour', () => {
    it('clicking a locked card calls showUpgradeModal with "Business Drivers" and "pro"', async () => {
      const wrapper = mountView()
      const firstLockedCard = wrapper.find('.driver-card--locked')
      await firstLockedCard.trigger('click')
      await nextTick()

      expect(mockShowUpgradeModal).toHaveBeenCalledTimes(1)
      expect(mockShowUpgradeModal).toHaveBeenCalledWith('Business Drivers', 'pro')
    })

    it('clicking each locked driver card calls showUpgradeModal once per click', async () => {
      const wrapper = mountView()
      const lockedCards = wrapper.findAll('.driver-card--locked')
      for (const card of lockedCards) {
        await card.trigger('click')
      }
      await nextTick()

      expect(mockShowUpgradeModal).toHaveBeenCalledTimes(lockedCards.length)
    })

    it('clicking the generic card does NOT call showUpgradeModal', async () => {
      const wrapper = mountView()
      const genericCard = wrapper
        .findAll('.driver-card')
        .find((c) => c.find('input[type="radio"]').attributes('value') === 'generic')
      await genericCard!.trigger('click')
      await nextTick()

      expect(mockShowUpgradeModal).not.toHaveBeenCalled()
    })
  })

  // ── Pro-tier rendering ─────────────────────────────────────────────────────
  describe('pro-tier card rendering', () => {
    beforeEach(() => {
      mockIsPro.value = true
    })

    it('renders all 7 driver options', () => {
      const wrapper = mountView()
      expect(wrapper.findAll('.driver-card')).toHaveLength(ALL_DRIVERS.length)
    })

    it('no card carries driver-card--locked class', async () => {
      const wrapper = mountView()
      await nextTick()
      expect(wrapper.findAll('.driver-card--locked')).toHaveLength(0)
    })

    it('no PRO badges are shown', async () => {
      const wrapper = mountView()
      await nextTick()
      expect(wrapper.findAll('.driver-card__pro-badge')).toHaveLength(0)
    })

    it('all radio inputs are enabled', async () => {
      const wrapper = mountView()
      await nextTick()
      const radios = wrapper.findAll('.driver-card input[type="radio"]')
      expect(radios).toHaveLength(ALL_DRIVERS.length)
      for (const radio of radios) {
        expect(radio.attributes('disabled')).toBeUndefined()
      }
    })
  })

  // ── Pro-tier click behaviour ───────────────────────────────────────────────
  describe('pro-tier click behaviour', () => {
    beforeEach(() => {
      mockIsPro.value = true
    })

    it('clicking a non-generic card does NOT call showUpgradeModal', async () => {
      const wrapper = mountView()
      await nextTick()
      // All cards are unlocked — click a non-generic one
      const cards = wrapper.findAll('.driver-card')
      const nonGeneric = cards.find(
        (c) => c.find('input[type="radio"]').attributes('value') !== 'generic',
      )
      await nonGeneric!.trigger('click')
      await nextTick()

      expect(mockShowUpgradeModal).not.toHaveBeenCalled()
    })

    it('clicking every card does NOT call showUpgradeModal', async () => {
      const wrapper = mountView()
      await nextTick()
      for (const card of wrapper.findAll('.driver-card')) {
        await card.trigger('click')
      }
      await nextTick()

      expect(mockShowUpgradeModal).not.toHaveBeenCalled()
    })
  })
})
