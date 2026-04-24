// useTierGate — checks whether the current user has access to a given commercial tier.
// Tiers rank: freemium < pro < enterprise.
//
// Source of truth priority:
//   1. tenant.tier  — the backend overrides user.plan with tenant.Plan for enterprise-tenant
//                     members, and fetchTenant() is called on every AppShell mount.
//   2. user.plan    — fallback for users whose tenant hasn't been loaded yet.
//
// When the featurePolicyStore is loaded, canAccess/numericLimit delegate to DB-driven
// policies so admins can adjust tier rules without code changes.
// Usage: const { isPro, isEnterprise, gate, canAccess, numericLimit, showUpgradeModal } = useTierGate()
import { ref, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useFeaturePolicyStore } from '@/features/admin/stores/featurePolicyStore'
import { useTenantStore } from '@/stores/tenant'

export type AppTier = 'freemium' | 'pro' | 'enterprise'

const TIER_RANK: Record<AppTier, number> = {
  freemium: 0,
  pro: 1,
  enterprise: 2,
}

// Global reactive flags — shared across all component instances.
const upgradeVisible = ref(false)
const upgradeFeatureName = ref('')
const upgradeTargetTier = ref<'pro' | 'enterprise'>('pro')

function normalizeTier(raw: string | undefined | null): AppTier {
  const s = (raw ?? 'freemium').toLowerCase()
  if (s === 'free' || s === 'freemium') return 'freemium'
  if (s === 'pro') return 'pro'
  if (s === 'enterprise') return 'enterprise'
  return 'freemium'
}

export function useTierGate() {
  const { user } = useAuth()

  const currentTier = computed<AppTier>(() => {
    // Prefer tenant.tier — the backend guarantees it reflects the effective plan
    // (enterprise tenant members get their tenant's plan, not their personal one).
    // Fall back to user.plan for the window between login and tenant fetch completion.
    try {
      const tenantStore = useTenantStore()
      if (tenantStore.tenant?.tier) return normalizeTier(tenantStore.tenant.tier)
    } catch {
      // Pinia not yet active (unit tests without full setup) — fall through.
    }
    return normalizeTier(user.value?.plan)
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

  const isFreemium = computed(() => currentTier.value === 'freemium')
  const isPro = computed(() => hasAccess('pro'))
  const isEnterprise = computed(() => hasAccess('enterprise'))

  // ── DB-driven policy helpers ─────────────────────────────────────────────────

  /**
   * Returns whether the current user's plan allows the named feature.
   * Delegates to the DB-backed feature_policies table when loaded;
   * falls back to false (deny) when policies are not yet loaded.
   *
   * The policyStore is resolved lazily so this composable works in contexts
   * where no active Pinia instance exists (e.g. unit tests without Pinia setup).
   *
   * @param feature  Feature slug (e.g. 'max_plans', 'plan_sharing') — matches model.FeatureX constants.
   * @param plan     Override plan (defaults to the current user's plan).
   */
  function canAccess(feature: string, plan?: string): boolean {
    const effectivePlan = plan ?? currentTier.value
    try {
      const policyStore = useFeaturePolicyStore()
      if (policyStore.loaded) {
        return policyStore.isAllowed(feature, effectivePlan)
      }
    } catch {
      // No active Pinia — safe fallback to deny.
    }
    return false
  }

  /**
   * Returns the numeric limit for the named feature under the current plan.
   * Returns -1 for unlimited, 0 when not found or policies not loaded.
   *
   * @param feature  Feature slug.
   * @param plan     Override plan (defaults to the current user's plan).
   */
  function numericLimit(feature: string, plan?: string): number {
    const effectivePlan = plan ?? currentTier.value
    try {
      const policyStore = useFeaturePolicyStore()
      if (policyStore.loaded) {
        return policyStore.numericLimit(feature, effectivePlan)
      }
    } catch {
      // No active Pinia — safe fallback.
    }
    return 0
  }

  return {
    currentTier,
    isFreemium,
    isPro,
    isEnterprise,
    hasAccess,
    gate,
    canAccess,
    numericLimit,
    showUpgradeModal,
    hideUpgradeModal,
    upgradeVisible,
    upgradeFeatureName,
    upgradeTargetTier,
  }
}
