// useTierGate — checks whether the active tenant has access to a given tier.
// Tiers rank: free < pro < enterprise.
// Usage: const { requiresPro, showUpgradeModal, upgradeVisible } = useTierGate()
import { ref, computed } from 'vue'
import { useTenantStore } from '@/stores/tenant'

export type AppTier = 'free' | 'pro' | 'enterprise'

const TIER_RANK: Record<AppTier, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
}

// Global reactive flags — shared across all component instances.
const upgradeVisible = ref(false)
const upgradeFeatureName = ref('')
const upgradeTargetTier = ref<'pro' | 'enterprise'>('pro')

export function useTierGate() {
  const tenantStore = useTenantStore()

  const currentTier = computed<AppTier>(() => {
    const t = (tenantStore.tenant?.tier ?? 'free').toLowerCase() as AppTier
    return TIER_RANK[t] !== undefined ? t : 'free'
  })

  /** Returns true when the tenant's tier is at least `required`. */
  function hasAccess(required: AppTier): boolean {
    return TIER_RANK[currentTier.value] >= TIER_RANK[required]
  }

  /**
   * Guard helper. If the tenant does not have access to `required`,
   * opens the upgrade modal and returns false. Otherwise returns true.
   * Typical usage:
   *   if (!gate('pro', 'Break-Even Analysis')) return
   */
  function gate(required: AppTier, featureName = 'This feature'): boolean {
    if (hasAccess(required)) return true
    upgradeFeatureName.value = featureName
    upgradeTargetTier.value = required === 'enterprise' ? 'enterprise' : 'pro'
    upgradeVisible.value = true
    return false
  }

  function showUpgradeModal(featureName = 'This feature', targetTier: 'pro' | 'enterprise' = 'pro') {
    upgradeFeatureName.value = featureName
    upgradeTargetTier.value = targetTier
    upgradeVisible.value = true
  }

  function hideUpgradeModal() {
    upgradeVisible.value = false
  }

  const isPro = computed(() => hasAccess('pro'))
  const isEnterprise = computed(() => hasAccess('enterprise'))

  return {
    currentTier,
    isPro,
    isEnterprise,
    hasAccess,
    gate,
    showUpgradeModal,
    hideUpgradeModal,
    upgradeVisible,
    upgradeFeatureName,
    upgradeTargetTier,
  }
}
