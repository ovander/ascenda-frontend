import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/composables/useApi'

// ── Types ────────────────────────────────────────────────────────────────────

export interface AdminUser {
  socrateId: number
  email: string
  name: string
  role: string
  status: string
  isVerified: boolean
  kerplanId?: string
  tenantId?: string
  tenantName?: string
  kerplanRole?: string
  isActive: boolean
  lastLogin?: string
  createdAt: string
}

export interface AdminUserListResponse {
  users: AdminUser[]
  totalCount: number
  page: number
  pageSize: number
}

export interface AdminTenant {
  id: string
  name: string
  slug: string
  tier: string
  isActive: boolean
  maxUsers: number
  maxPlans: number
  createdAt: string
}

export interface AdminTenantListResponse {
  tenants: AdminTenant[]
  totalCount: number
  page: number
  pageSize: number
}

export interface CreateUserPayload {
  email: string
  fullName: string
  role?: string
}

export interface UpdateUserPayload {
  fullName?: string
  role?: string
}

export interface CreateTenantPayload {
  name: string
  slug: string
  tier?: string
  maxUsers?: number
  maxPlans?: number
}

export interface UpdateTenantPayload {
  name?: string
  tier?: string
  isActive?: boolean
  maxUsers?: number
  maxPlans?: number
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useAdminUsersStore = defineStore('adminUsers', () => {
  // Users
  const users = ref<AdminUser[]>([])
  const totalUsers = ref(0)
  const usersPage = ref(1)
  const usersPageSize = ref(20)
  const usersSearch = ref('')
  const usersLoading = ref(false)

  // Tenants
  const tenants = ref<AdminTenant[]>([])
  const totalTenants = ref(0)
  const tenantsPage = ref(1)
  const tenantsPageSize = ref(20)
  const tenantsLoading = ref(false)

  // ── Users ──────────────────────────────────────────────────────────────────

  async function fetchUsers(search = '', page = 1, pageSize = 20) {
    usersLoading.value = true
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))

      const res = await api.get<AdminUserListResponse>(`/api/v1/admin/users?${params}`)
      users.value = res.data.users
      totalUsers.value = res.data.totalCount
      usersPage.value = res.data.page
      usersPageSize.value = res.data.pageSize
      usersSearch.value = search
    } finally {
      usersLoading.value = false
    }
  }

  async function createUser(payload: CreateUserPayload): Promise<AdminUser> {
    const res = await api.post<AdminUser>('/api/v1/admin/users', payload)
    await fetchUsers(usersSearch.value, usersPage.value, usersPageSize.value)
    return res.data
  }

  async function updateUser(socrateId: number, payload: UpdateUserPayload): Promise<AdminUser> {
    const res = await api.put<AdminUser>(`/api/v1/admin/users/${socrateId}`, payload)
    const idx = users.value.findIndex(u => u.socrateId === socrateId)
    if (idx >= 0) users.value[idx] = res.data
    return res.data
  }

  async function deleteUser(socrateId: number): Promise<void> {
    await api.delete(`/api/v1/admin/users/${socrateId}`)
    users.value = users.value.filter(u => u.socrateId !== socrateId)
    totalUsers.value = Math.max(0, totalUsers.value - 1)
  }

  async function resendVerification(socrateId: number): Promise<void> {
    await api.post(`/api/v1/admin/users/${socrateId}/resend-verification`)
  }

  async function resetPassword(socrateId: number): Promise<void> {
    await api.post(`/api/v1/admin/users/${socrateId}/reset-password`)
  }

  // ── Tenants ────────────────────────────────────────────────────────────────

  async function fetchTenants(page = 1, pageSize = 20) {
    tenantsLoading.value = true
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))

      const res = await api.get<AdminTenantListResponse>(`/api/v1/admin/tenants?${params}`)
      tenants.value = res.data.tenants
      totalTenants.value = res.data.totalCount
      tenantsPage.value = res.data.page
      tenantsPageSize.value = res.data.pageSize
    } finally {
      tenantsLoading.value = false
    }
  }

  async function createTenant(payload: CreateTenantPayload): Promise<AdminTenant> {
    const res = await api.post<AdminTenant>('/api/v1/admin/tenants', payload)
    await fetchTenants(tenantsPage.value, tenantsPageSize.value)
    return res.data
  }

  async function updateTenant(id: string, payload: UpdateTenantPayload): Promise<AdminTenant> {
    const res = await api.put<AdminTenant>(`/api/v1/admin/tenants/${id}`, payload)
    const idx = tenants.value.findIndex(t => t.id === id)
    if (idx >= 0) tenants.value[idx] = res.data
    return res.data
  }

  return {
    // Users
    users, totalUsers, usersPage, usersPageSize, usersSearch, usersLoading,
    fetchUsers, createUser, updateUser, deleteUser, resendVerification, resetPassword,
    // Tenants
    tenants, totalTenants, tenantsPage, tenantsPageSize, tenantsLoading,
    fetchTenants, createTenant, updateTenant,
  }
})
