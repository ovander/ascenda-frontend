/**
 * ProductsView.scenario-reload.spec.ts
 *
 * Regression tests for scenario change reloading products.
 *
 * Bug fix: When the active scenario changes, the products should be reloaded
 * and the consolidated revenue recalculated. A watcher on scenarioStore.activeScenario.id
 * now resets the product store, fetches new products, and refreshes the consolidated data.
 *
 * Covered behaviour
 * ─────────────────
 * • When scenarioStore.activeScenario.id changes, productStore.$reset() is called
 * • When scenario changes, fetchProducts() is called for the new scenario
 * • When scenario changes, fetchConsolidated() is called
 * • After scenario change, products from old scenario are cleared (not visible)
 * • Switching back to a scenario that had products does NOT show stale names
 *   from old scenario (names come from fresh fetch)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, defineComponent, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import ProductsView from './ProductsView.vue'
import type { Product } from '@/types'

// ── Shared mocks ─────────────────────────────────────────────────────────────

vi.mock('@/composables/useTierGate', () => ({
  useTierGate: () => ({ isPro: ref(false), showUpgradeModal: vi.fn() }),
}))

vi.mock('@/composables/useDecimal', () => ({
  useDecimal: () => ({
    formatCurrency: (v: any) => String(v),
    formatPercent: (v: any) => `${v}%`,
    getLocale: () => 'en',
    getUnitLabel: () => 'k€',
    formatUnit: (v: any) => String(v),
  }),
}))

vi.mock('@/composables/useYearHeaders', () => ({
  useYearHeaders: () => ({ yearHeaders: ref(['Y1', 'Y2', 'Y3', 'Y4', 'Y5']) }),
}))

vi.mock('@/utils/logger', () => ({
  devlog: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

vi.mock('@/composables/usePlanAccess', () => ({
  usePlanAccess: () => ({ canEdit: ref(true) }),
}))

vi.mock('@/features/plans/stores/planStore', () => ({
  usePlanStore: () => ({ activePlan: { id: 'plan-1' } }),
}))

// ── Controllable scenario store ───────────────────────────────────────────────
const mockActiveScenario = ref({ id: 'scenario-1', name: 'Base' })
vi.mock('@/features/scenarios/stores/scenarioStore', () => ({
  useScenarioStore: () => ({
    get activeScenario() {
      return mockActiveScenario.value
    },
  }),
}))

// ── Controllable product store ────────────────────────────────────────────────
const mockProducts = ref<Product[]>([])
const mockConsolidatedRevenue = ref<any>(null)
const mockFetchProducts = vi.fn().mockResolvedValue(undefined)
const mockFetchConsolidated = vi.fn().mockResolvedValue(undefined)
const mockResetStore = vi.fn()

vi.mock('@/features/products/stores/productStore', () => ({
  useProductStore: () => ({
    get products() {
      return mockProducts.value
    },
    get consolidatedRevenue() {
      return mockConsolidatedRevenue.value
    },
    loading: false,
    error: null,
    fetchProducts: mockFetchProducts,
    fetchConsolidated: mockFetchConsolidated,
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    fetchDerivedBundle: vi.fn(),
    getDerivedBundle: vi.fn(() => null),
    derivedBundlesMap: new Map(),
    $reset: mockResetStore,
  }),
}))

// ── Component stubs ───────────────────────────────────────────────────────────
const DialogStub = defineComponent({
  props: ['visible'],
  template: '<div><slot /></div>',
})

const stubs = {
  Dialog: DialogStub,
  DataTable: { template: '<div />' },
  Column: { template: '<div />' },
  Button: {
    template: '<button @click="$emit(\'click\')"><slot /></button>',
    emits: ['click'],
  },
  InputText: { template: '<input />' },
  InputNumber: { template: '<input />' },
  ProgressSpinner: { template: '<div />' },
  KFieldLabel: defineComponent({
    props: ['label'],
    template: '<span>{{ label }}</span>',
  }),
  KFormLegend: { template: '<div />' },
  ProductDetailPanel: {
    template: '<div class="pdp-stub" :data-product-id="productId" />',
    props: { productId: String },
  },
  DriverParamsForm: { template: '<div />' },
}

function mountView() {
  return mount(ProductsView, { global: { stubs } })
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-abc',
    scenarioId: 'scenario-1',
    name: 'My Product',
    productType: 'product',
    sortOrder: 0,
    driverType: 'generic',
    directCostVariability: '0',
    externalChargeVariability: '0',
    taxVariability: '0',
    staffVariability: '0',
    depreciationVariability: '0',
    ...overrides,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  mockProducts.value = []
  mockConsolidatedRevenue.value = null
  mockActiveScenario.value = { id: 'scenario-1', name: 'Base' }
  mockFetchProducts.mockReset()
  mockFetchProducts.mockResolvedValue(undefined)
  mockFetchConsolidated.mockReset()
  mockFetchConsolidated.mockResolvedValue(undefined)
  mockResetStore.mockReset()
})

// =============================================================================
// Regression tests for scenario change reloading products
// =============================================================================
describe('ProductsView — scenario change reload', () => {
  it('when scenarioStore.activeScenario.id changes, productStore.$reset() is called', async () => {
    mountView()
    await nextTick()

    // Initially, reset should not have been called
    expect(mockResetStore).not.toHaveBeenCalled()

    // Change the scenario
    mockActiveScenario.value = { id: 'scenario-2', name: 'Alt' }
    await nextTick()

    // Now reset should have been called by the watcher
    expect(mockResetStore).toHaveBeenCalledOnce()
  })

  it('when scenario changes, fetchProducts() is called for the new scenario', async () => {
    mountView()
    await nextTick()

    // Clear calls from onMounted
    mockFetchProducts.mockClear()

    // Change the scenario
    mockActiveScenario.value = { id: 'scenario-2', name: 'Alt' }
    await nextTick()

    // fetchProducts should have been called by the watcher (at least once)
    expect(mockFetchProducts).toHaveBeenCalled()
    expect(mockFetchProducts.mock.calls.length).toBeGreaterThan(0)
  })

  it('when scenario changes, fetchConsolidated() is called', async () => {
    // Start with a product so consolidated is fetched during onMounted
    mockProducts.value = [makeProduct({ id: 'prod-1', scenarioId: 'scenario-1' })]
    mountView()
    await nextTick()

    // Clear the calls from onMounted
    mockFetchConsolidated.mockClear()

    // Change the scenario
    mockActiveScenario.value = { id: 'scenario-2', name: 'Alt' }
    await nextTick()

    // fetchConsolidated should have been called by the watcher (at least once)
    expect(mockFetchConsolidated).toHaveBeenCalled()
    expect(mockFetchConsolidated.mock.calls.length).toBeGreaterThan(0)
  })

  it('after scenario change, products from old scenario are cleared (not visible)', async () => {
    // Start with a product from scenario-1
    mockProducts.value = [
      makeProduct({ id: 'prod-old', scenarioId: 'scenario-1', name: 'Old Product' }),
    ]

    const wrapper = mountView()
    await nextTick()

    // Initially, the product should be visible
    let products = wrapper.findAll('.border.rounded-lg.bg-white')
    expect(products).toHaveLength(1)

    // Simulate: after changing scenario, reset() clears products and a new fetch
    // returns different products
    mockResetStore.mockImplementation(() => {
      mockProducts.value = []
    })
    mockFetchProducts.mockImplementation(() => {
      // New fetch returns products for scenario-2
      mockProducts.value = [
        makeProduct({
          id: 'prod-new',
          scenarioId: 'scenario-2',
          name: 'New Product',
        }),
      ]
    })

    // Change the scenario
    mockActiveScenario.value = { id: 'scenario-2', name: 'Alt' }
    await nextTick()

    // Old products should be cleared
    products = wrapper.findAll('.border.rounded-lg.bg-white')
    expect(products).toHaveLength(1)
    expect(products[0].text()).toContain('New Product')
    expect(products[0].text()).not.toContain('Old Product')
  })

  it('switching back to a scenario that had products does NOT show stale names from old scenario', async () => {
    // Scenario 1 with "Original Name"
    mockProducts.value = [
      makeProduct({
        id: 'prod-1',
        scenarioId: 'scenario-1',
        name: 'Original Name',
      }),
    ]

    const wrapper = mountView()
    await nextTick()

    let nameSpan = wrapper.find('span.font-medium.flex-1')
    expect(nameSpan.text()).toBe('Original Name')

    // Switch to scenario 2
    mockResetStore.mockImplementation(() => {
      mockProducts.value = []
    })
    mockFetchProducts.mockImplementation(() => {
      mockProducts.value = [
        makeProduct({
          id: 'prod-2',
          scenarioId: 'scenario-2',
          name: 'Different Product',
        }),
      ]
    })

    mockActiveScenario.value = { id: 'scenario-2', name: 'Scenario 2' }
    await nextTick()

    nameSpan = wrapper.find('span.font-medium.flex-1')
    expect(nameSpan.text()).toBe('Different Product')

    // Switch back to scenario 1
    // This time, fetch returns the product with a DIFFERENT name (simulating an update)
    mockResetStore.mockImplementation(() => {
      mockProducts.value = []
    })
    mockFetchProducts.mockImplementation(() => {
      mockProducts.value = [
        makeProduct({
          id: 'prod-1',
          scenarioId: 'scenario-1',
          name: 'Updated Name', // Name was changed in the backend
        }),
      ]
    })

    mockActiveScenario.value = { id: 'scenario-1', name: 'Base' }
    await nextTick()

    nameSpan = wrapper.find('span.font-medium.flex-1')
    // Should show the fresh name from the fetch, not the old cached "Original Name"
    expect(nameSpan.text()).toBe('Updated Name')
  })
})
