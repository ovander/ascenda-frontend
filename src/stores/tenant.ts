import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Tenant, User } from '@/types'
import api from '@/composables/useApi'

export const useTenantStore = defineStore('tenant', () => {
  const tenant = ref<Tenant | null>(null)
  const users = ref<User[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchTenant() {
    loading.value = true
    try {
      const response = await api.get<Tenant>('/api/v1/tenant/')
      tenant.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch tenant'
    } finally {
      loading.value = false
    }
  }

  async function updateTenant(data: Partial<Tenant>) {
    const response = await api.put<Tenant>('/api/v1/tenant/', data)
    tenant.value = response.data
  }

  async function fetchUsers() {
    loading.value = true
    try {
      const response = await api.get<User[] | { data: User[] }>('/api/v1/users/')
      const body = response.data
      users.value = Array.isArray(body) ? body : (body.data ?? [])
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to fetch users'
    } finally {
      loading.value = false
    }
  }

  async function inviteUser(email: string, role: string, name?: string) {
    await api.post('/api/v1/users/invite', { email, role, name })
    await fetchUsers()
  }

  async function updateUserRole(userId: string, role: string) {
    await api.put(`/api/v1/users/${userId}/role`, { role })
    await fetchUsers()
  }

  async function deactivateUser(userId: string) {
    await api.post(`/api/v1/users/${userId}/deactivate`)
    await fetchUsers()
  }

  async function reactivateUser(userId: string) {
    await api.post(`/api/v1/users/${userId}/reactivate`)
    await fetchUsers()
  }

  async function deleteUser(userId: string) {
    await api.delete(`/api/v1/users/${userId}`)
    users.value = users.value.filter((u) => u.id !== userId)
  }

  async function getUserImpact(userId: string) {
    const response = await api.get<{
      userId: string
      email: string
      name: string
      role: string
      isOwner: boolean
      canDelete: boolean
      message?: string
    }>(`/api/v1/users/${userId}/impact`)
    return response.data
  }

  return {
    tenant,
    users,
    loading,
    error,
    fetchTenant,
    updateTenant,
    fetchUsers,
    inviteUser,
    updateUserRole,
    deactivateUser,
    reactivateUser,
    deleteUser,
    getUserImpact,
  }
})
