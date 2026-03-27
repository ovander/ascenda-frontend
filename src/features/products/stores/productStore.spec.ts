import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useProductStore } from './productStore'
import type { Product } from '@/types'

vi.mock('@/composables/useApi', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/features/plans/stores/planStore', () => ({
  usePlanStore: vi.fn(() => ({
    activePlan: { id: 'plan-1' },
  })),
}))

vi.mock('@/features/scenarios/stores/scenarioStore', () => ({
  useScenarioStore: vi.fn(() => ({
    activeScenario: { id: 'scenario-1' },
  })),
}))

vi.mock('@/utils/constants', () => ({
  MAX_YEARS: 5,
  DEBOUNCE_MS: 500,
}))

vi.mock('@/utils/format', () => ({
  debounce: (fn: any) => fn,
}))

import api from '@/composables/useApi'
const mockApi = vi.mocked(api)

const mockProduct: Product = {
  id: 'prod-1',
  scenarioId: 'scenario-1',
  name: 'Widget',
  sortOrder: 0,
  directCostVariability: '100',
  externalChargeVariability: '0',
  taxVariability: '0',
  staffVariability: '0',
  depreciationVariability: '0',
}

const mockProduct2: Product = {
  id: 'prod-2',
  scenarioId: 'scenario-1',
  name: 'Gadget',
  sortOrder: 1,
  directCostVariability: '50',
  externalChargeVariability: '20',
  taxVariability: '0',
  staffVariability: '0',
  depreciationVariability: '0',
}

const basePath = '/api/v1/plans/plan-1/scenarios/scenario-1/products'

describe('Product Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('has correct initial state', () => {
    const store = useProductStore()
    expect(store.products).toEqual([])
    expect(store.consolidatedRevenue).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetchProducts populates list', async () => {
    mockApi.get.mockResolvedValue({ data: [mockProduct, mockProduct2] })
    const store = useProductStore()

    await store.fetchProducts()

    expect(mockApi.get).toHaveBeenCalledWith(`${basePath}/`)
    expect(store.products).toHaveLength(2)
    expect(store.products[0].name).toBe('Widget')
    expect(store.loading).toBe(false)
  })

  it('fetchProducts handles error', async () => {
    mockApi.get.mockRejectedValue({ response: { data: { message: 'Server error' } } })
    const store = useProductStore()

    await store.fetchProducts()

    expect(store.error).toBe('Server error')
    expect(store.loading).toBe(false)
  })

  it('createProduct adds to list', async () => {
    mockApi.post.mockResolvedValue({ data: mockProduct })
    const store = useProductStore()

    const result = await store.createProduct({
      name: 'Widget',
      directCostVariability: '100',
      externalChargeVariability: '0',
      taxVariability: '0',
      staffVariability: '0',
      depreciationVariability: '0',
    })

    expect(result.id).toBe('prod-1')
    expect(store.products).toHaveLength(1)
  })

  it('updateProduct updates in list', async () => {
    const updated = { ...mockProduct, name: 'Super Widget' }
    mockApi.get.mockResolvedValue({ data: [mockProduct] })
    mockApi.put.mockResolvedValue({ data: updated })
    const store = useProductStore()

    await store.fetchProducts()
    await store.updateProduct('prod-1', { name: 'Super Widget' })

    expect(store.products[0].name).toBe('Super Widget')
  })

  it('deleteProduct removes from list and cleans maps', async () => {
    const consolidated = { scenarioId: 'scenario-1', totals: [{ yearIndex: 0, totalTurnover: '500' }] }
    mockApi.get
      .mockResolvedValueOnce({ data: [mockProduct, mockProduct2] }) // fetchProducts
      .mockResolvedValueOnce({ data: consolidated })                 // fetchConsolidated after delete
    mockApi.delete.mockResolvedValue({})
    const store = useProductStore()

    await store.fetchProducts()
    await store.deleteProduct('prod-1')

    expect(store.products).toHaveLength(1)
    expect(store.products[0].id).toBe('prod-2')
  })

  it('deleteProduct refreshes consolidatedRevenue when products remain', async () => {
    const consolidated = { scenarioId: 'scenario-1', totals: [{ yearIndex: 0, totalTurnover: '500' }] }
    mockApi.get
      .mockResolvedValueOnce({ data: [mockProduct, mockProduct2] }) // fetchProducts
      .mockResolvedValueOnce({ data: consolidated })                 // fetchConsolidated after delete
    mockApi.delete.mockResolvedValue({})
    const store = useProductStore()

    await store.fetchProducts()
    await store.deleteProduct('prod-1')

    expect(mockApi.get).toHaveBeenCalledWith(`${basePath}/revenue/consolidated`)
    expect(store.consolidatedRevenue).toEqual(consolidated)
  })

  it('deleteProduct sets consolidatedRevenue to null when last product is deleted', async () => {
    mockApi.get.mockResolvedValue({ data: [mockProduct] })
    mockApi.delete.mockResolvedValue({})
    const store = useProductStore()

    // Pre-seed consolidated revenue to ensure it gets cleared
    store.consolidatedRevenue = { scenarioId: 'scenario-1', totals: [{ yearIndex: 0, totalTurnover: '1000' }] } as any
    await store.fetchProducts()
    await store.deleteProduct('prod-1')

    expect(store.products).toHaveLength(0)
    // Should be null without calling the API again
    expect(store.consolidatedRevenue).toBeNull()
    // fetchConsolidated should NOT have been called (only the initial fetchProducts GET)
    expect(mockApi.get).toHaveBeenCalledTimes(1)
  })

  it('fetchAssumptions stores in map', async () => {
    const assumptions = [{ id: 'a1', productId: 'prod-1', yearIndex: 0, rawMaterialCost: '10', royaltiesCost: '0', logisticsCost: '0', costCoefficient: '1', baseUnitPrice: '100', priceCoefficient: '1' }]
    mockApi.get.mockResolvedValue({ data: assumptions })
    const store = useProductStore()

    await store.fetchAssumptions('prod-1')

    expect(store.getAssumptions('prod-1')).toEqual(assumptions)
  })

  it('fetchVolumes stores in map', async () => {
    const volumes = [{ id: 'v1', productId: 'prod-1', yearIndex: 0, zone: 'france', channel: 'direct', unitsSold: 100 }]
    mockApi.get.mockResolvedValue({ data: volumes })
    const store = useProductStore()

    await store.fetchVolumes('prod-1')

    expect(store.getVolumes('prod-1')).toEqual(volumes)
  })

  it('fetchConsolidated stores revenue data', async () => {
    const consolidated = { scenarioId: 'scenario-1', totals: [{ yearIndex: 0, totalTurnover: '1000' }] }
    mockApi.get.mockResolvedValue({ data: consolidated })
    const store = useProductStore()

    await store.fetchConsolidated()

    expect(store.consolidatedRevenue).toEqual(consolidated)
  })

  it('$reset clears all state', async () => {
    mockApi.get.mockResolvedValue({ data: [mockProduct] })
    const store = useProductStore()

    await store.fetchProducts()
    expect(store.products).toHaveLength(1)

    store.$reset()

    expect(store.products).toEqual([])
    expect(store.consolidatedRevenue).toBeNull()
    expect(store.error).toBeNull()
  })

  it('getAssumptions returns empty array for unknown product', () => {
    const store = useProductStore()
    expect(store.getAssumptions('unknown')).toEqual([])
  })

  it('getVolumes returns empty array for unknown product', () => {
    const store = useProductStore()
    expect(store.getVolumes('unknown')).toEqual([])
  })

  it('getMargins returns empty array for unknown product', () => {
    const store = useProductStore()
    expect(store.getMargins('unknown')).toEqual([])
  })

  it('getRevenueSummary returns undefined for unknown product', () => {
    const store = useProductStore()
    expect(store.getRevenueSummary('unknown')).toBeUndefined()
  })

  it('error is set on createProduct failure', async () => {
    mockApi.post.mockRejectedValue({ response: { data: { message: 'Duplicate name' } } })
    const store = useProductStore()

    await expect(store.createProduct({
      name: 'Widget',
      directCostVariability: '100',
      externalChargeVariability: '0',
      taxVariability: '0',
      staffVariability: '0',
      depreciationVariability: '0',
    })).rejects.toBeDefined()

    expect(store.error).toBe('Duplicate name')
  })
})
