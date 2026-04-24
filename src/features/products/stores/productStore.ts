import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  Product,
  ProductAssumption,
  ProductSalesVolume,
  ProductDistributorMargin,
  ProductRevenueSummary,
  ConsolidatedRevenue,
  ProductDerivedBundle,
  DriverType,
  DriverParams,
} from '@/types'
import api from '@/composables/useApi'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import { DEBOUNCE_MS } from '@/utils/constants'
import { debounce } from '@/utils/format'
import { useDirtyState } from '@/composables/useDirtyState'

export const useProductStore = defineStore('products', () => {
  const products = ref<Product[]>([])
  const assumptionsMap = ref<Map<string, ProductAssumption[]>>(new Map())
  const volumesMap = ref<Map<string, ProductSalesVolume[]>>(new Map())
  const marginsMap = ref<Map<string, ProductDistributorMargin[]>>(new Map())
  const revenueSummaries = ref<Map<string, ProductRevenueSummary>>(new Map())
  const consolidatedRevenue = ref<ConsolidatedRevenue | null>(null)
  const derivedBundlesMap = ref<Map<string, ProductDerivedBundle>>(new Map())
  const loading = ref(false)
  const error = ref<string | null>(null)

  const dirty = useDirtyState('products')

  function basePath() {
    const planStore = usePlanStore()
    const scenarioStore = useScenarioStore()
    const planId = planStore.activePlan?.id
    const scenarioId = scenarioStore.activeScenario?.id
    if (!planId || !scenarioId) throw new Error('No active plan/scenario')
    return `/api/v1/plans/${planId}/scenarios/${scenarioId}/products`
  }

  async function fetchProducts() {
    loading.value = true
    error.value = null
    try {
      const response = await api.get<Product[]>(`${basePath()}/`)
      products.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch products'
    } finally {
      loading.value = false
    }
  }

  async function fetchProduct(productId: string) {
    try {
      const response = await api.get<Product>(`${basePath()}/${productId}`)
      const idx = products.value.findIndex((p) => p.id === productId)
      if (idx !== -1) {
        products.value[idx] = response.data
      }
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch product'
      throw err
    }
  }

  async function createProduct(data: {
    name: string
    productType?: string
    driverType?: DriverType
    driverParams?: DriverParams
    directCostVariability: string
    externalChargeVariability: string
    taxVariability: string
    staffVariability: string
    depreciationVariability: string
  }) {
    try {
      const response = await api.post<Product>(`${basePath()}/`, data)
      products.value.push(response.data)
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to create product'
      throw err
    }
  }

  async function updateProduct(productId: string, data: Partial<Product>) {
    try {
      await api.put(`${basePath()}/${productId}`, data)
      // The backend returns 204 No Content, so we apply the change locally.
      const idx = products.value.findIndex((p) => p.id === productId)
      if (idx !== -1) products.value[idx] = { ...products.value[idx], ...data }
      return products.value[idx]
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update product'
      throw err
    }
  }

  async function deleteProduct(productId: string) {
    try {
      await api.delete(`${basePath()}/${productId}`)
      products.value = products.value.filter((p) => p.id !== productId)
      assumptionsMap.value.delete(productId)
      volumesMap.value.delete(productId)
      marginsMap.value.delete(productId)
      revenueSummaries.value.delete(productId)
      // Refresh consolidated revenue so the summary reflects the deletion.
      // If no products remain, reset immediately without an extra API call.
      if (products.value.length === 0) {
        consolidatedRevenue.value = null
      } else {
        await fetchConsolidated()
      }
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to delete product'
      throw err
    }
  }

  async function fetchAssumptions(productId: string) {
    try {
      const response = await api.get<ProductAssumption[]>(
        `${basePath()}/${productId}/assumptions`
      )
      assumptionsMap.value.set(productId, response.data)
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch assumptions'
      throw err
    }
  }

  async function updateAssumptions(productId: string, data: ProductAssumption[]) {
    dirty.markSaving()
    try {
      await api.put(`${basePath()}/${productId}/assumptions`, data)
      // Backend returns 204 No Content; local state is managed by the component
      dirty.markClean()
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update assumptions'
      error.value = msg
      dirty.markError(msg)
      throw err
    }
  }

  async function fetchVolumes(productId: string) {
    try {
      const response = await api.get<ProductSalesVolume[]>(
        `${basePath()}/${productId}/volumes`
      )
      volumesMap.value.set(productId, response.data)
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch volumes'
      throw err
    }
  }

  async function updateVolumes(productId: string, data: ProductSalesVolume[]) {
    dirty.markSaving()
    try {
      await api.put(`${basePath()}/${productId}/volumes`, data)
      // Backend returns 204 No Content; local state is managed by the component
      dirty.markClean()
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update volumes'
      error.value = msg
      dirty.markError(msg)
      throw err
    }
  }

  async function fetchMargins(productId: string) {
    try {
      const response = await api.get<ProductDistributorMargin[]>(
        `${basePath()}/${productId}/margins`
      )
      marginsMap.value.set(productId, response.data)
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch margins'
      throw err
    }
  }

  async function updateMargins(productId: string, data: ProductDistributorMargin[]) {
    dirty.markSaving()
    try {
      await api.put(`${basePath()}/${productId}/margins`, data)
      // Backend returns 204 No Content; local state is managed by the component
      dirty.markClean()
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update margins'
      error.value = msg
      dirty.markError(msg)
      throw err
    }
  }

  async function fetchConsolidated() {
    try {
      const response = await api.get<ConsolidatedRevenue>(
        `${basePath()}/revenue/consolidated`
      )
      consolidatedRevenue.value = response.data
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch consolidated revenue'
      throw err
    }
  }

  async function fetchDerivedBundle(productId: string) {
    try {
      const response = await api.get<ProductDerivedBundle>(
        `${basePath()}/${productId}/driver/bundle`
      )
      derivedBundlesMap.value.set(productId, response.data)
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch derived bundle'
      throw err
    }
  }

  async function updateDriverParams(productId: string, driverType: DriverType, driverParams: DriverParams) {
    try {
      await api.put(`${basePath()}/${productId}`, { driverType, driverParams })
      const idx = products.value.findIndex((p) => p.id === productId)
      if (idx !== -1) {
        products.value[idx] = { ...products.value[idx], driverType, driverParams }
      }
      // Invalidate cached derived bundle so it is re-fetched
      derivedBundlesMap.value.delete(productId)
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update driver params'
      throw err
    }
  }

  async function fetchRevenueByProduct(productId: string) {
    try {
      const response = await api.get<ProductRevenueSummary>(
        `${basePath()}/${productId}/revenue`
      )
      revenueSummaries.value.set(productId, response.data)
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch revenue summary'
      throw err
    }
  }

  // Debounced save functions
  const debouncedUpdateAssumptions = debounce(
    async (productId: string, data: ProductAssumption[]) => {
      await updateAssumptions(productId, data)
    },
    DEBOUNCE_MS
  )

  const debouncedUpdateVolumes = debounce(
    async (productId: string, data: ProductSalesVolume[]) => {
      await updateVolumes(productId, data)
    },
    DEBOUNCE_MS
  )

  const debouncedUpdateMargins = debounce(
    async (productId: string, data: ProductDistributorMargin[]) => {
      await updateMargins(productId, data)
    },
    DEBOUNCE_MS
  )

  function getAssumptions(productId: string): ProductAssumption[] {
    return assumptionsMap.value.get(productId) || []
  }

  function getVolumes(productId: string): ProductSalesVolume[] {
    return volumesMap.value.get(productId) || []
  }

  function getMargins(productId: string): ProductDistributorMargin[] {
    return marginsMap.value.get(productId) || []
  }

  function getRevenueSummary(productId: string): ProductRevenueSummary | undefined {
    return revenueSummaries.value.get(productId)
  }

  function getDerivedBundle(productId: string): ProductDerivedBundle | undefined {
    return derivedBundlesMap.value.get(productId)
  }

  function $reset() {
    products.value = []
    assumptionsMap.value.clear()
    volumesMap.value.clear()
    marginsMap.value.clear()
    revenueSummaries.value.clear()
    derivedBundlesMap.value.clear()
    consolidatedRevenue.value = null
    error.value = null
  }

  return {
    products,
    assumptionsMap,
    volumesMap,
    marginsMap,
    revenueSummaries,
    consolidatedRevenue,
    loading,
    error,
    dirty,
    fetchProducts,
    fetchProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    fetchAssumptions,
    updateAssumptions,
    debouncedUpdateAssumptions,
    fetchVolumes,
    updateVolumes,
    debouncedUpdateVolumes,
    fetchMargins,
    updateMargins,
    debouncedUpdateMargins,
    fetchConsolidated,
    fetchRevenueByProduct,
    fetchDerivedBundle,
    updateDriverParams,
    getAssumptions,
    getVolumes,
    getMargins,
    getRevenueSummary,
    getDerivedBundle,
    $reset,
  }
})
