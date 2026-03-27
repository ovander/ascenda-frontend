import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/composables/useApi'

export interface CountryRateConfig {
  countryCode: string
  countryName: string
  corporateTaxRate: number
  vatRate: number
  employerTaxRate: number
  mltInterestRate: number
  language: string
  currencySymbol: string
  updatedAt: string
}

export interface UpdateCountryRateConfigRequest {
  corporateTaxRate?: number
  vatRate?: number
  employerTaxRate?: number
  mltInterestRate?: number
}

export const useAdminCountryConfigStore = defineStore('adminCountryConfig', () => {
  const configs = ref<CountryRateConfig[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      const res = await api.get<CountryRateConfig[]>('/admin/country-configs')
      configs.value = res.data ?? []
    } catch (e: any) {
      error.value = e?.response?.data?.message ?? 'Failed to load country configs'
    } finally {
      loading.value = false
    }
  }

  async function update(code: string, req: UpdateCountryRateConfigRequest): Promise<CountryRateConfig | null> {
    saving.value = true
    error.value = null
    try {
      const res = await api.put<CountryRateConfig>(`/admin/country-configs/${code}`, req)
      const updated = res.data
      const idx = configs.value.findIndex(c => c.countryCode === code)
      if (idx !== -1) configs.value[idx] = updated
      return updated
    } catch (e: any) {
      error.value = e?.response?.data?.message ?? 'Failed to update country config'
      return null
    } finally {
      saving.value = false
    }
  }

  async function resetToDefault(code: string): Promise<CountryRateConfig | null> {
    saving.value = true
    error.value = null
    try {
      const res = await api.post<CountryRateConfig>(`/admin/country-configs/${code}/reset`)
      const updated = res.data
      const idx = configs.value.findIndex(c => c.countryCode === code)
      if (idx !== -1) configs.value[idx] = updated
      return updated
    } catch (e: any) {
      error.value = e?.response?.data?.message ?? 'Failed to reset country config'
      return null
    } finally {
      saving.value = false
    }
  }

  return { configs, loading, saving, error, fetchAll, update, resetToDefault }
})
