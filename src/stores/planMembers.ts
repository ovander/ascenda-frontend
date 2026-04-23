import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PlanMember } from '@/types'
import api from '@/composables/useApi'
import { useAuthStore } from '@/stores/auth'

export interface PlanMemberWithUser extends PlanMember {
  email?: string
  name?: string
}

export const usePlanMembersStore = defineStore('planMembers', () => {
  const members = ref<PlanMemberWithUser[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Current user's role on the active plan (set by fetchMembers or from API)
  const myPlanRole = ref<string | null>(null)

  const canEdit = computed(() => {
    const auth = useAuthStore()
    // Owner can always edit
    if (auth.user?.role === 'owner') return true
    return myPlanRole.value === 'editor'
  })

  const canView = computed(() => {
    const auth = useAuthStore()
    if (auth.user?.role === 'owner') return true
    return myPlanRole.value === 'editor' || myPlanRole.value === 'viewer'
  })

  function basePath(planId: string) {
    return `/api/v1/plans/${planId}/members`
  }

  async function fetchMembers(planId: string) {
    loading.value = true
    error.value = null
    try {
      const response = await api.get<PlanMemberWithUser[]>(basePath(planId))
      const body = response.data
      members.value = Array.isArray(body) ? body : []

      // Determine current user's role
      const auth = useAuthStore()
      if (auth.user?.role === 'owner') {
        myPlanRole.value = 'owner'
      } else {
        const me = members.value.find(m => m.userId === auth.user?.id)
        myPlanRole.value = me?.role ?? null
      }
    } catch (err: any) {
      // May 404 if no members yet or endpoint not wired
      members.value = []
      error.value = err.response?.data?.error?.message || null
    } finally {
      loading.value = false
    }
  }

  async function grantAccess(planId: string, userId: string, role: 'editor' | 'viewer') {
    await api.post(basePath(planId), { userId, role })
    await fetchMembers(planId)
  }

  async function changeRole(planId: string, userId: string, role: 'editor' | 'viewer') {
    await api.put(`${basePath(planId)}/${userId}`, { role })
    await fetchMembers(planId)
  }

  async function revokeAccess(planId: string, userId: string) {
    await api.delete(`${basePath(planId)}/${userId}`)
    await fetchMembers(planId)
  }

  function $reset() {
    members.value = []
    myPlanRole.value = null
    error.value = null
  }

  return {
    members,
    myPlanRole,
    canEdit,
    canView,
    loading,
    error,
    fetchMembers,
    grantAccess,
    changeRole,
    revokeAccess,
    $reset,
  }
})
