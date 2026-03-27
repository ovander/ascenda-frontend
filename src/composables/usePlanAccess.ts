import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usePlanMembersStore } from '@/stores/planMembers'

/**
 * Provides plan-level access checks for the current user.
 * Must be used inside a plan route where planMembers have been loaded.
 */
export function usePlanAccess() {
  const auth = useAuthStore()
  const planMembers = usePlanMembersStore()

  /** Owner can always edit; editors can edit; viewers cannot */
  const canEdit = computed(() => {
    if (auth.user?.role === 'owner') return true
    return planMembers.myPlanRole === 'editor'
  })

  /** Owner and all members can view */
  const canView = computed(() => {
    if (auth.user?.role === 'owner') return true
    return planMembers.myPlanRole === 'editor' || planMembers.myPlanRole === 'viewer'
  })

  /** Current user's effective role on this plan */
  const planRole = computed(() => {
    if (auth.user?.role === 'owner') return 'owner'
    return planMembers.myPlanRole
  })

  return { canEdit, canView, planRole }
}
