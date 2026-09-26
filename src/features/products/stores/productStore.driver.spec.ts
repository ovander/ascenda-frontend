/**
 * productStore.driver.spec.ts
 *
 * Tests for the Business Driver Framework additions to productStore:
 *   fetchDerivedBundle, updateDriverParams, getDerivedBundle,
 *   $reset (derivedBundlesMap), createProduct with driverType/driverParams.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useProductStore } from './productStore'
import type { Product, ProductDerivedBundle, ConsultingParams } from '@/types'

// ── Mocks ──────────────────────────────────────────────────────────────────
vi.mock('@/composables/useApi', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/features/plans/stores/planStore', () => ({
  usePlanStore: vi.fn(() => ({ activePlan: { id: 'plan-1' } })),
}))

vi.mock('@/features/scenarios/stores/scenarioStore', () => ({
  useScenarioStore: vi.fn(() => ({ activeScenario: { id: 'scenario-1' } })),
}))

vi.mock('@/utils/constants', () => ({ MAX_YEARS: 5, DEBOUNCE_MS: 500 }))
vi.mock('@/utils/format', () => ({ debounce: (fn: any) => fn }))

import api from '@/composables/useApi'
const mockApi = vi.mocked(api)

// ── Fixtures ───────────────────────────────────────────────────────────────
const BASE = '/api/v1/plans/plan-1/scenarios/scenario-1/products'

const mockConsultingProduct: Product = {
  id: 'prod-c',
  scenarioId: 'scenario-1',
  name: 'Consulting Co',
  sortOrder: 0,
  productType: 'service',
  driverType: 'consulting',
}

const mockConsultingParams: ConsultingParams = {
  headcount:       ['2', '2', '3', '3', '4'],
  workingDays:     220,
  utilizationRate: ['0.80', '0.80', '0.80', '0.80', '0.80'],
  monthlyGross:    ['5000', '5000', '5500', '5500', '6000'],
  employerCharges: '0.45',
}

const mockDerivedBundle: ProductDerivedBundle = {
  volumes: [
    { id: 'v1', productId: 'prod-c', yearIndex: 1, zone: 'france', channel: 'direct', unitsSold: 352 },
    { id: 'v2', productId: 'prod-c', yearIndex: 2, zone: 'france', channel: 'direct', unitsSold: 352 },
    { id: 'v3', productId: 'prod-c', yearIndex: 3, zone: 'france', channel: 'direct', unitsSold: 528 },
    { id: 'v4', productId: 'prod-c', yearIndex: 4, zone: 'france', channel: 'direct', unitsSold: 528 },
    { id: 'v5', productId: 'prod-c', yearIndex: 5, zone: 'france', channel: 'direct', unitsSold: 704 },
  ],
  assumptions: [
    { id: 'a1', productId: 'prod-c', yearIndex: 1, rawMaterialCost: '685.45', royaltiesCost: '0', logisticsCost: '0', costCoefficient: '1', baseUnitPrice: '1200', priceCoefficient: '1' },
    { id: 'a2', productId: 'prod-c', yearIndex: 2, rawMaterialCost: '685.45', royaltiesCost: '0', logisticsCost: '0', costCoefficient: '1', baseUnitPrice: '1200', priceCoefficient: '1' },
    { id: 'a3', productId: 'prod-c', yearIndex: 3, rawMaterialCost: '715.91', royaltiesCost: '0', logisticsCost: '0', costCoefficient: '1', baseUnitPrice: '1200', priceCoefficient: '1' },
    { id: 'a4', productId: 'prod-c', yearIndex: 4, rawMaterialCost: '715.91', royaltiesCost: '0', logisticsCost: '0', costCoefficient: '1', baseUnitPrice: '1200', priceCoefficient: '1' },
    { id: 'a5', productId: 'prod-c', yearIndex: 5, rawMaterialCost: '747.27', royaltiesCost: '0', logisticsCost: '0', costCoefficient: '1', baseUnitPrice: '1200', priceCoefficient: '1' },
  ],
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe('productStore — driver framework', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ── fetchDerivedBundle ────────────────────────────────────────────────────
  describe('fetchDerivedBundle', () => {
    it('fetches from the correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ data: mockDerivedBundle })
      const store = useProductStore()

      await store.fetchDerivedBundle('prod-c')

      expect(mockApi.get).toHaveBeenCalledWith(`${BASE}/prod-c/driver/bundle`)
    })

    it('stores result in derivedBundlesMap', async () => {
      mockApi.get.mockResolvedValue({ data: mockDerivedBundle })
      const store = useProductStore()

      await store.fetchDerivedBundle('prod-c')

      expect(store.getDerivedBundle('prod-c')).toEqual(mockDerivedBundle)
    })

    it('returns the fetched bundle', async () => {
      mockApi.get.mockResolvedValue({ data: mockDerivedBundle })
      const store = useProductStore()

      const result = await store.fetchDerivedBundle('prod-c')

      expect(result.volumes).toHaveLength(5)
      expect(result.assumptions).toHaveLength(5)
    })

    it('sets error and throws on failure', async () => {
      mockApi.get.mockRejectedValue({ response: { data: { message: 'not found' } } })
      const store = useProductStore()

      await expect(store.fetchDerivedBundle('prod-c')).rejects.toBeDefined()
      expect(store.error).toBe('not found')
    })
  })

  // ── getDerivedBundle ──────────────────────────────────────────────────────
  describe('getDerivedBundle', () => {
    it('returns undefined for unknown product', () => {
      const store = useProductStore()
      expect(store.getDerivedBundle('unknown')).toBeUndefined()
    })

    it('returns stored bundle after fetch', async () => {
      mockApi.get.mockResolvedValue({ data: mockDerivedBundle })
      const store = useProductStore()

      await store.fetchDerivedBundle('prod-c')

      const bundle = store.getDerivedBundle('prod-c')
      expect(bundle).not.toBeUndefined()
      expect(bundle!.volumes[0].unitsSold).toBe(352)
    })
  })

  // ── updateDriverParams ────────────────────────────────────────────────────
  describe('updateDriverParams', () => {
    it('calls PUT with driverType and driverParams', async () => {
      mockApi.put.mockResolvedValue({})
      const store = useProductStore()

      await store.updateDriverParams('prod-c', 'consulting', mockConsultingParams)

      expect(mockApi.put).toHaveBeenCalledWith(
        `${BASE}/prod-c`,
        { driverType: 'consulting', driverParams: mockConsultingParams }
      )
    })

    it('updates driverType and driverParams on the cached product', async () => {
      mockApi.get.mockResolvedValue({ data: [mockConsultingProduct] })
      mockApi.put.mockResolvedValue({})
      const store = useProductStore()
      await store.fetchProducts()

      const updatedParams: ConsultingParams = { ...mockConsultingParams, workingDays: 215 }
      await store.updateDriverParams('prod-c', 'consulting', updatedParams)

      const product = store.products.find((p) => p.id === 'prod-c')
      expect(product?.driverType).toBe('consulting')
      expect((product?.driverParams as ConsultingParams)?.workingDays).toBe(215)
    })

    it('invalidates the derived bundle cache', async () => {
      mockApi.get.mockResolvedValue({ data: mockDerivedBundle })
      mockApi.put.mockResolvedValue({})
      const store = useProductStore()

      // Populate cache
      await store.fetchDerivedBundle('prod-c')
      expect(store.getDerivedBundle('prod-c')).toBeDefined()

      // Update params → cache should be cleared
      await store.updateDriverParams('prod-c', 'consulting', mockConsultingParams)
      expect(store.getDerivedBundle('prod-c')).toBeUndefined()
    })

    it('sets error and throws on failure', async () => {
      mockApi.put.mockRejectedValue({ response: { data: { message: 'update failed' } } })
      const store = useProductStore()

      await expect(
        store.updateDriverParams('prod-c', 'consulting', mockConsultingParams)
      ).rejects.toBeDefined()
      expect(store.error).toBe('update failed')
    })

    it('does not modify product list when product is not cached', async () => {
      // Store has no products loaded
      mockApi.put.mockResolvedValue({})
      const store = useProductStore()

      await store.updateDriverParams('prod-c', 'consulting', mockConsultingParams)

      expect(store.products).toHaveLength(0)
    })
  })

  // ── createProduct with driver fields ─────────────────────────────────────
  describe('createProduct with driverType / driverParams', () => {
    it('sends driverType and driverParams to the API', async () => {
      const created = { ...mockConsultingProduct, driverParams: mockConsultingParams }
      mockApi.post.mockResolvedValue({ data: created })
      const store = useProductStore()

      await store.createProduct({
        name: 'Consulting Co',
        productType: 'service',
        driverType: 'consulting',
        driverParams: mockConsultingParams,
      })

      expect(mockApi.post).toHaveBeenCalledWith(
        `${BASE}/`,
        expect.objectContaining({
          driverType: 'consulting',
          driverParams: mockConsultingParams,
        })
      )
    })

    it('sends null driverParams for generic driver', async () => {
      const genericProduct: Product = {
        id: 'prod-g',
        scenarioId: 'scenario-1',
        name: 'Widget',
        sortOrder: 0,
        driverType: 'generic',
      }
      mockApi.post.mockResolvedValue({ data: genericProduct })
      const store = useProductStore()

      await store.createProduct({
        name: 'Widget',
        productType: 'product',
        driverType: 'generic',
        driverParams: null,
      })

      expect(mockApi.post).toHaveBeenCalledWith(
        `${BASE}/`,
        expect.objectContaining({ driverType: 'generic', driverParams: null })
      )
    })
  })

  // ── $reset clears derivedBundlesMap ──────────────────────────────────────
  describe('$reset', () => {
    it('clears derivedBundlesMap', async () => {
      mockApi.get.mockResolvedValue({ data: mockDerivedBundle })
      const store = useProductStore()
      await store.fetchDerivedBundle('prod-c')
      expect(store.getDerivedBundle('prod-c')).toBeDefined()

      store.$reset()

      expect(store.getDerivedBundle('prod-c')).toBeUndefined()
    })
  })
})
