import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/composables/useApi'

// ── Types ─────────────────────────────────────────────────────────────────────

export type FeatureType = 'access' | 'numeric_limit'

export interface TierRule {
  allowed?: boolean
  limit?: number
}

export interface FeaturePolicy {
  feature: string
  category: string
  label: string
  featureType: FeatureType
  freemium: TierRule
  pro: TierRule
  enterprise: TierRule
  updatedAt: string
}

export interface UpdateFeaturePolicyRequest {
  freemium: TierRule
  pro: TierRule
  enterprise: TierRule
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useFeaturePolicyStore = defineStore('featurePolicy', () => {
  const policies = ref<FeaturePolicy[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)
  const loaded = ref(false)

  /** Fetch all feature policies. Idempotent — skips if already loaded. */
  async function fetchAll() {
    if (loaded.value) return
    loading.value = true
    error.value = null
    try {
      const res = await api.get<FeaturePolicy[]>('/api/v1/feature-policies')
      policies.value = res.data ?? []
      loaded.value = true
    } catch (e: any) {
      error.value = e?.response?.data?.message ?? 'Failed to load feature policies'
    } finally {
      loading.value = false
    }
  }

  /** Force-refresh from the server (used after admin writes). */
  async function refresh() {
    loaded.value = false
    await fetchAll()
  }

  /** Admin: update a single policy row and refresh the local cache. */
  async function updatePolicy(feature: string, req: UpdateFeaturePolicyRequest): Promise<FeaturePolicy | null> {
    saving.value = true
    error.value = null
    try {
      const res = await api.put<FeaturePolicy>(`/api/v1/admin/feature-policies/${feature}`, req)
      const updated = res.data
      const idx = policies.value.findIndex(p => p.feature === feature)
      if (idx !== -1) policies.value[idx] = updated
      return updated
    } catch (e: any) {
      error.value = e?.response?.data?.message ?? 'Failed to update feature policy'
      return null
    } finally {
      saving.value = false
    }
  }

  /**
   * Returns whether the given feature is accessible for the specified plan.
   * Falls back to false (deny) if policies are not yet loaded or feature not found.
   */
  function isAllowed(feature: string, plan: string): boolean {
    const p = policies.value.find(fp => fp.feature === feature)
    if (!p || p.featureType !== 'access') return false
    const rule = ruleFor(p, plan)
    return rule?.allowed ?? false
  }

  /**
   * Returns the numeric limit for the given feature and plan.
   * Returns -1 for unlimited, 0 when not found.
   */
  function numericLimit(feature: string, plan: string): number {
    const p = policies.value.find(fp => fp.feature === feature)
    if (!p || p.featureType !== 'numeric_limit') return 0
    const rule = ruleFor(p, plan)
    return rule?.limit ?? 0
  }

  return {
    policies,
    loading,
    saving,
    error,
    loaded,
    fetchAll,
    refresh,
    updatePolicy,
    isAllowed,
    numericLimit,
  }
})

// ── Internal helpers ──────────────────────────────────────────────────────────

function normalisePlan(plan: string): 'freemium' | 'pro' | 'enterprise' {
  if (plan === 'pro') return 'pro'
  if (plan === 'enterprise') return 'enterprise'
  return 'freemium'
}

function ruleFor(p: FeaturePolicy, plan: string): TierRule | undefined {
  switch (normalisePlan(plan)) {
    case 'pro':        return p.pro
    case 'enterprise': return p.enterprise
    default:           return p.freemium
  }
}
