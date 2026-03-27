import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/composables/useApi'

export interface AdminStats {
  users: {
    total: number
    active: number
    inactive: number
    byRole: { owner: number; admin: number; user: number }
  }
  plans: {
    total: number
    byStatus: { draft: number; active: number; archived: number }
  }
  scenarios: {
    total: number
  }
  recentActivity: Array<{
    type: 'plan' | 'scenario'
    name: string
    action: 'created' | 'updated'
    actor: string
    at: string
  }>
  topUsers: Array<{
    userId: string
    name: string
    email: string
    planCount: number
    scenarioCount: number
  }>
}

export const useAdminStatsStore = defineStore('adminStats', () => {
  const stats = ref<AdminStats | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchStats() {
    loading.value = true
    error.value = null
    try {
      const response = await api.get<AdminStats>('/api/v1/admin/stats')
      stats.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to load dashboard stats'
    } finally {
      loading.value = false
    }
  }

  return { stats, loading, error, fetchStats }
})
