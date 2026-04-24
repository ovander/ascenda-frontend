import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/composables/useApi'

// ── Types ────────────────────────────────────────────────────────────────────

export interface AdminOrg {
  id: string
  name: string
  slug: string
  plan: string
  maxUsers: number
  billingEmail?: string
  domain?: string
  isActive: boolean
  tenantCount: number
  activeUserCount: number
  createdAt: string
  updatedAt: string
}

export interface OrgTenant {
  id: string
  name: string
  slug: string
  type: string
  plan: string
  isActive: boolean
  createdAt: string
}

export interface OrgListResponse {
  organizations: AdminOrg[]
  totalCount: number
  page: number
  pageSize: number
}

export interface OrgTenantsResponse {
  tenants: OrgTenant[]
}

export interface CreateOrgPayload {
  name: string
  slug: string
  plan?: string
  maxUsers?: number
  billingEmail?: string
  domain?: string
  ownerEmail: string
  firstDepartmentName: string
}

export interface UpdateOrgPayload {
  name?: string
  plan?: string
  maxUsers?: number
  billingEmail?: string
  domain?: string
  isActive?: boolean
}

export interface AddOrgTenantPayload {
  name: string
  ownerEmail: string
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useAdminOrgsStore = defineStore('adminOrgs', () => {
  const orgs = ref<AdminOrg[]>([])
  const totalOrgs = ref(0)
  const orgsPage = ref(1)
  const orgsPageSize = ref(20)
  const orgsLoading = ref(false)

  const orgTenants = ref<Record<string, OrgTenant[]>>({})
  const orgTenantsLoading = ref(false)

  // ── Organizations ──────────────────────────────────────────────────────────

  async function fetchOrgs(page = 1, pageSize = 20) {
    orgsLoading.value = true
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))

      const res = await api.get<OrgListResponse>(`/api/v1/admin/organizations?${params}`)
      orgs.value = res.data.organizations
      totalOrgs.value = res.data.totalCount
      orgsPage.value = res.data.page
      orgsPageSize.value = res.data.pageSize
    } finally {
      orgsLoading.value = false
    }
  }

  async function createOrg(payload: CreateOrgPayload): Promise<AdminOrg> {
    const res = await api.post<AdminOrg>('/api/v1/admin/organizations', payload)
    await fetchOrgs(orgsPage.value, orgsPageSize.value)
    return res.data
  }

  async function updateOrg(id: string, payload: UpdateOrgPayload): Promise<AdminOrg> {
    const res = await api.put<AdminOrg>(`/api/v1/admin/organizations/${id}`, payload)
    const idx = orgs.value.findIndex(o => o.id === id)
    if (idx >= 0) orgs.value[idx] = res.data
    return res.data
  }

  async function deleteOrg(id: string): Promise<void> {
    await api.delete(`/api/v1/admin/organizations/${id}`)
    orgs.value = orgs.value.filter(o => o.id !== id)
    totalOrgs.value = Math.max(0, totalOrgs.value - 1)
  }

  // ── Org Tenants (departments) ──────────────────────────────────────────────

  async function fetchOrgTenants(orgId: string): Promise<OrgTenant[]> {
    orgTenantsLoading.value = true
    try {
      const res = await api.get<OrgTenantsResponse>(`/api/v1/admin/organizations/${orgId}/tenants`)
      orgTenants.value[orgId] = res.data.tenants
      return res.data.tenants
    } finally {
      orgTenantsLoading.value = false
    }
  }

  async function addOrgTenant(orgId: string, payload: AddOrgTenantPayload): Promise<OrgTenant> {
    const res = await api.post<OrgTenant>(`/api/v1/admin/organizations/${orgId}/tenants`, payload)
    if (orgTenants.value[orgId]) {
      orgTenants.value[orgId].push(res.data)
    }
    // Refresh org list to get updated tenant/user counts
    await fetchOrgs(orgsPage.value, orgsPageSize.value)
    return res.data
  }

  return {
    // State
    orgs, totalOrgs, orgsPage, orgsPageSize, orgsLoading,
    orgTenants, orgTenantsLoading,
    // Actions
    fetchOrgs, createOrg, updateOrg, deleteOrg,
    fetchOrgTenants, addOrgTenant,
  }
})
