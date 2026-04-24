import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/composables/useApi'

// ── DTO types ─────────────────────────────────────────────────────────────────

export interface AIUsageFeatureItem {
  feature: string
  totalCalls: number
  successfulCalls: number
  totalTokens: number
  estimatedCostCents: number
}

export interface AIUsageTenantItem {
  tenantId: string
  totalCalls: number
  successfulCalls: number
  totalTokens: number
  estimatedCostCents: number
}

export interface AdminAIUsageStats {
  periodStart: string
  periodEnd: string
  callsToday: number
  callsWeek: number
  callsMonth: number
  byFeature: AIUsageFeatureItem[]
  byTenant: AIUsageTenantItem[]
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useAdminAiUsageStore = defineStore('adminAiUsage', () => {
  const stats    = ref<AdminAIUsageStats | null>(null)
  const loading  = ref(false)
  const error    = ref<string | null>(null)

  async function fetchStats(start?: string, end?: string) {
    loading.value = true
    error.value   = null
    try {
      const params: Record<string, string> = {}
      if (start) params.start = start
      if (end)   params.end   = end
      const response = await api.get<AdminAIUsageStats>('/api/v1/admin/ai-usage', { params })
      stats.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || 'Failed to load AI usage stats'
    } finally {
      loading.value = false
    }
  }

  return { stats, loading, error, fetchStats }
})
