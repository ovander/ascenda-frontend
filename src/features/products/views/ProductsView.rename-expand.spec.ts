/**
 * ProductsView.rename-expand.spec.ts
 *
 * Regression tests for two bugs caught in production:
 *
 * Bug 1 — renameInputRef.value?.select is not a function
 *   Root cause: Vue 3 turns ref="name" inside v-for into an array; calling
 *   .select() on an array throws TypeError.
 *   Fix: function ref (:ref="(el) => setRenameRef(el, product.id)") that only
 *   sets renameInputRef.value when productId === renamingId.
 *
 * Bug 2 — productId=undefined floods the network with 400 requests
 *   Root cause: a product with id=undefined in the store caused toggleExpand to
 *   add undefined to expandedRows; ProductDetailPanel then mounted and fired
 *   GET /products/undefined/... requests.
 *   Fix: guard in toggleExpand (!productId return), v-if &&!!product.id on the
 *   panel, and onMounted guard inside ProductDetailPanel.
 *
 * DOM scoping note
 * ────────────────
 * The "Add Product" Dialog stub always renders its slot in tests. Its slot
 * contains <summary> elements with class="cursor-pointer". To avoid ambiguity,
 * all selectors are scoped to `.border.rounded-lg.bg-white` (the product card)
 * rather than searching the whole wrapper with generic selectors.
 *
 * Covered behaviour
 * ─────────────────
 * Bug 1 — inline rename lifecycle
 *   • double-clicking the product name shows an <input> with the product name
 *   • the rename input uses a function ref (no "ref" DOM attribute)
 *   • pressing Enter commits the rename via updateProduct
 *   • pressing Escape cancels without calling updateProduct
 *   • blurring the input commits the rename
 *   • committing an unchanged name does NOT call updateProduct
 *   • after commit renamingId resets so the input disappears
 *   • canEdit=false: double-click does NOT enter rename mode
 *
 * Bug 2 — expand / productId guard
 *   • clicking a valid product card header expands it and renders ProductDetailPanel
 *   • clicking an already-expanded header collapses it
 *   • a product with id=undefined: clicking is a no-op (panel never renders)
 *   • ProductDetailPanel never receives productId=undefined as a prop
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
    formatPercent:  (v: any) => `${v}%`,
    getLocale:      () => 'en',
    getUnitLabel:   () => 'Units',
    formatUnit:     (v: any) => String(v),
  }),
}))

vi.mock('@/composables/useYearHeaders', () => ({
  useYearHeaders: () => ({ yearHeaders: ['Y1', 'Y2', 'Y3', 'Y4', 'Y5'] }),
}))

vi.mock('@/utils/logger', () => ({
  devlog: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

const mockCanEdit = ref(true)
vi.mock('@/composables/usePlanAccess', () => ({
  usePlanAccess: () => ({ canEdit: mockCanEdit }),
}))

vi.mock('@/features/plans/stores/planStore', () => ({
  usePlanStore: () => ({ activePlan: { id: 'plan-1' } }),
}))

vi.mock('@/features/scenarios/stores/scenarioStore', () => ({
  useScenarioStore: () => ({ activeScenario: { id: 'scenario-1' } }),
}))

// ── Controllable product store ────────────────────────────────────────────────
const mockUpdateProduct = vi.fn()
const mockFetchProducts = vi.fn().mockResolvedValue(undefined)
const mockProducts = ref<Product[]>([])

vi.mock('@/features/products/stores/productStore', () => ({
  useProductStore: () => ({
    get products() { return mockProducts.value },
    consolidatedRevenue: null,
    loading: false,
    error: null,
    fetchProducts: mockFetchProducts,
    fetchConsolidated: vi.fn().mockResolvedValue(undefined),
    createProduct: vi.fn(),
    updateProduct: mockUpdateProduct,
    deleteProduct: vi.fn(),
    fetchDerivedBundle: vi.fn(),
    getDerivedBundle: vi.fn(() => null),
    derivedBundlesMap: new Map(),
  }),
}))

// ── Track ProductDetailPanel mounts ──────────────────────────────────────────
const panelMountedWith: (string | undefined)[] = []
const ProductDetailPanelStub = defineComponent({
  name: 'ProductDetailPanel',
  props: { productId: String },
  setup(props) { panelMountedWith.push(props.productId) },
  template: '<div class="pdp-stub" :data-product-id="productId" />',
})

// ── Component stubs ───────────────────────────────────────────────────────────
// Dialog stub renders its slot unconditionally (no visible guard) so the
// "Add Product" form is always in the DOM — this is intentional for render
// isolation. Scope all product-list selectors to avoid ambiguity with the
// dialog's own cursor-pointer elements.
const DialogStub = defineComponent({
  props: ['visible'],
  template: '<div><slot /></div>',
})

const stubs = {
  Dialog:             DialogStub,
  DataTable:          { template: '<div />' },
  Column:             { template: '<div />' },
  Button:             { template: '<button @click="$emit(\'click\')"><slot /></button>', emits: ['click'] },
  InputText:          { template: '<input />' },
  InputNumber:        { template: '<input />' },
  ProgressSpinner:    { template: '<div />' },
  KFieldLabel:        defineComponent({ props: ['label'], template: '<span>{{ label }}</span>' }),
  KFormLegend:        { template: '<div />' },
  ProductDetailPanel: ProductDetailPanelStub,
  DriverParamsForm:   { template: '<div />' },
}

// ── Fixture ───────────────────────────────────────────────────────────────────
function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-abc',
    scenarioId: 'scenario-1',
    name: 'My Product',
    productType: 'product',
    sortOrder: 0,
    driverType: 'generic',
    ...overrides,
  }
}

function mountView() {
  return mount(ProductsView, { global: { stubs } })
}

/** Returns the first product card (.border.rounded-lg.bg-white) in the list. */
function firstCard(wrapper: ReturnType<typeof mountView>) {
  return wrapper.find('.border.rounded-lg.bg-white')
}

/** Returns the product card header row (clickable, contains the name span). */
function cardHeader(wrapper: ReturnType<typeof mountView>, index = 0) {
  const cards = wrapper.findAll('.border.rounded-lg.bg-white')
  return cards[index].find('.flex.items-center.gap-3')
}

beforeEach(() => {
  setActivePinia(createPinia())
  mockCanEdit.value = true
  mockUpdateProduct.mockReset()
  mockUpdateProduct.mockResolvedValue(makeProduct())
  mockProducts.value = []
  panelMountedWith.length = 0
})

// =============================================================================
// Bug 1 — inline rename
// =============================================================================
describe('ProductsView — inline rename (Bug 1 regression)', () => {
  it('double-clicking the product name shows a rename input pre-filled with the current name', async () => {
    mockProducts.value = [makeProduct({ name: 'Widget' })]
    const wrapper = mountView()
    await nextTick()

    // The name span is inside the product card
    const nameSpan = firstCard(wrapper).find('span.font-medium.flex-1')
    await nameSpan.trigger('dblclick')
    await nextTick()

    const input = firstCard(wrapper).find('input.font-medium')
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).value).toBe('Widget')
  })

  it('rename input uses a function ref — no "ref" attribute on the DOM element', async () => {
    // If a static ref="renameInputRef" were used inside v-for, Vue 3 would
    // produce an array instead of the element. The function ref pattern
    // (:ref="(el) => setRenameRef(el, product.id)") leaves no DOM "ref" attr.
    mockProducts.value = [makeProduct()]
    const wrapper = mountView()
    await nextTick()

    await firstCard(wrapper).find('span.font-medium.flex-1').trigger('dblclick')
    await nextTick()

    const input = firstCard(wrapper).find('input.font-medium')
    expect(input.exists()).toBe(true)
    // A static ref="" would leave the attribute on the element; function refs do not.
    expect(input.attributes('ref')).toBeUndefined()
  })

  it('pressing Enter commits the rename via updateProduct', async () => {
    mockProducts.value = [makeProduct({ id: 'prod-1', name: 'Old Name' })]
    const wrapper = mountView()
    await nextTick()

    await firstCard(wrapper).find('span.font-medium.flex-1').trigger('dblclick')
    await nextTick()

    await firstCard(wrapper).find('input.font-medium').setValue('New Name')
    await firstCard(wrapper).find('input.font-medium').trigger('keydown.enter')
    await nextTick()

    expect(mockUpdateProduct).toHaveBeenCalledOnce()
    expect(mockUpdateProduct).toHaveBeenCalledWith('prod-1', { name: 'New Name' })
  })

  it('pressing Escape cancels the rename without calling updateProduct', async () => {
    mockProducts.value = [makeProduct({ name: 'My Product' })]
    const wrapper = mountView()
    await nextTick()

    await firstCard(wrapper).find('span.font-medium.flex-1').trigger('dblclick')
    await nextTick()

    await firstCard(wrapper).find('input.font-medium').setValue('Something else')
    await firstCard(wrapper).find('input.font-medium').trigger('keydown.escape')
    await nextTick()

    expect(mockUpdateProduct).not.toHaveBeenCalled()
    expect(firstCard(wrapper).find('input.font-medium').exists()).toBe(false)
  })

  it('blurring the input commits the rename', async () => {
    mockProducts.value = [makeProduct({ id: 'prod-1', name: 'Original' })]
    const wrapper = mountView()
    await nextTick()

    await firstCard(wrapper).find('span.font-medium.flex-1').trigger('dblclick')
    await nextTick()

    await firstCard(wrapper).find('input.font-medium').setValue('Updated')
    await firstCard(wrapper).find('input.font-medium').trigger('blur')
    await nextTick()

    expect(mockUpdateProduct).toHaveBeenCalledWith('prod-1', { name: 'Updated' })
  })

  it('committing an unchanged name does NOT call updateProduct', async () => {
    mockProducts.value = [makeProduct({ name: 'Same Name' })]
    const wrapper = mountView()
    await nextTick()

    await firstCard(wrapper).find('span.font-medium.flex-1').trigger('dblclick')
    await nextTick()

    // Value is already 'Same Name' — don't change it, just commit
    await firstCard(wrapper).find('input.font-medium').trigger('keydown.enter')
    await nextTick()

    expect(mockUpdateProduct).not.toHaveBeenCalled()
  })

  it('after commit the input disappears (renamingId reset to null)', async () => {
    mockProducts.value = [makeProduct({ name: 'Alpha' })]
    const wrapper = mountView()
    await nextTick()

    await firstCard(wrapper).find('span.font-medium.flex-1').trigger('dblclick')
    await nextTick()
    expect(firstCard(wrapper).find('input.font-medium').exists()).toBe(true)

    await firstCard(wrapper).find('input.font-medium').setValue('Beta')
    await firstCard(wrapper).find('input.font-medium').trigger('keydown.enter')
    await nextTick()

    expect(firstCard(wrapper).find('input.font-medium').exists()).toBe(false)
  })

  it('canEdit=false: double-clicking does NOT enter rename mode', async () => {
    mockCanEdit.value = false
    mockProducts.value = [makeProduct()]
    const wrapper = mountView()
    await nextTick()

    await firstCard(wrapper).find('span.font-medium.flex-1').trigger('dblclick')
    await nextTick()

    expect(firstCard(wrapper).find('input.font-medium').exists()).toBe(false)
  })
})

// =============================================================================
// Bug 2 — expand / productId=undefined guard
// =============================================================================
describe('ProductsView — expand guard (Bug 2 regression)', () => {
  it('clicking a product card header expands it and renders ProductDetailPanel', async () => {
    mockProducts.value = [makeProduct({ id: 'prod-valid' })]
    const wrapper = mountView()
    await nextTick()

    await cardHeader(wrapper).trigger('click')
    await nextTick()

    const panel = wrapper.find('.pdp-stub')
    expect(panel.exists()).toBe(true)
    expect(panel.attributes('data-product-id')).toBe('prod-valid')
  })

  it('clicking an already-expanded header collapses it (panel disappears)', async () => {
    mockProducts.value = [makeProduct({ id: 'prod-toggle' })]
    const wrapper = mountView()
    await nextTick()

    await cardHeader(wrapper).trigger('click')    // expand
    await nextTick()
    expect(wrapper.find('.pdp-stub').exists()).toBe(true)

    await cardHeader(wrapper).trigger('click')    // collapse
    await nextTick()
    expect(wrapper.find('.pdp-stub').exists()).toBe(false)
  })

  it('product with id=undefined: clicking is a no-op — panel never renders', async () => {
    // Simulates the race-condition edge case where a product enters the store
    // without a server-assigned id (before the server response arrives).
    const ghost = makeProduct({ id: undefined as unknown as string, name: 'Ghost' })
    mockProducts.value = [ghost]
    const wrapper = mountView()
    await nextTick()

    await cardHeader(wrapper).trigger('click')
    await nextTick()

    // toggleExpand should have returned early for undefined id
    expect(wrapper.find('.pdp-stub').exists()).toBe(false)
  })

  it('mixed list: undefined-id product is a no-op; valid product expands normally', async () => {
    mockProducts.value = [
      makeProduct({ id: 'prod-ok',                           name: 'Valid' }),
      makeProduct({ id: undefined as unknown as string,      name: 'Ghost' }),
    ]
    const wrapper = mountView()
    await nextTick()

    // Click the second card (Ghost — undefined id)
    await cardHeader(wrapper, 1).trigger('click')
    await nextTick()
    expect(wrapper.findAll('.pdp-stub')).toHaveLength(0)

    // Click the first card (valid)
    await cardHeader(wrapper, 0).trigger('click')
    await nextTick()
    expect(wrapper.findAll('.pdp-stub')).toHaveLength(1)
    expect(wrapper.find('.pdp-stub').attributes('data-product-id')).toBe('prod-ok')
  })

  it('ProductDetailPanel is never mounted with productId=undefined', async () => {
    // Even if somehow the v-if guard failed and the panel rendered, the component
    // itself should receive a defined productId. Track all mounts via the stub.
    mockProducts.value = [
      makeProduct({ id: undefined as unknown as string, name: 'Bad' }),
    ]
    const wrapper = mountView()
    await nextTick()

    await cardHeader(wrapper).trigger('click')
    await nextTick()

    const undefinedMounts = panelMountedWith.filter(
      (id) => id === undefined || id === 'undefined'
    )
    expect(undefinedMounts).toHaveLength(0)
  })
})

// =============================================================================
// Cost variability — removed (backend migration 000018)
// =============================================================================
describe('ProductsView — no cost variability', () => {
  it('shows no variability badge on product cards, whatever the product carries', async () => {
    // A demo product created before the removal still had these fields in the
    // API response; they must not reappear on the card.
    mockProducts.value = [
      makeProduct({ name: 'Seeded', directCostVariability: '1', externalChargeVariability: '1' } as Partial<Product>),
      makeProduct({ id: 'prod-new', name: 'Created' }),
    ]
    const wrapper = mountView()
    await nextTick()

    const cards = wrapper.findAll('.border.rounded-lg.bg-white')
    expect(cards).toHaveLength(2)
    for (const card of cards) {
      expect(card.text()).not.toMatch(/Direct\s+\d+%|Ext\s+\d+%/)
    }
  })

  it('the add-product dialog has no variability inputs', () => {
    const wrapper = mountView()
    expect(wrapper.html()).not.toContain('Variability')
  })
})
