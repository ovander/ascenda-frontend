import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// ── Tenant store mock ──────────────────────────────────────────────────────
// We create a controllable ref so individual tests can override the tier.
import { ref } from 'vue'

const mockTenantRef = ref<{ tier: string } | null>({ tier: 'free' })

vi.mock('@/stores/tenant', () => ({
  useTenantStore: vi.fn(() => ({
    get tenant() { return mockTenantRef.value },
  })),
}))

import { useTierGate } from './useTierGate'

// Helper to set the active tier between tests
function setTier(tier: string) {
  mockTenantRef.value = { tier }
}

describe('useTierGate', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setTier('free')
    // Reset global modal state between tests by hiding it
    const { hideUpgradeModal } = useTierGate()
    hideUpgradeModal()
  })

  // ── Tier ranking ───────────────────────────────────────────────────────
  describe('currentTier', () => {
    it('returns "free" when tenant tier is free', () => {
      setTier('free')
      const { currentTier } = useTierGate()
      expect(currentTier.value).toBe('free')
    })

    it('returns "pro" when tenant tier is pro', () => {
      setTier('pro')
      const { currentTier } = useTierGate()
      expect(currentTier.value).toBe('pro')
    })

    it('returns "enterprise" when tenant tier is enterprise', () => {
      setTier('enterprise')
      const { currentTier } = useTierGate()
      expect(currentTier.value).toBe('enterprise')
    })

    it('falls back to "free" for unknown tier strings', () => {
      setTier('unknown_tier')
      const { currentTier } = useTierGate()
      expect(currentTier.value).toBe('free')
    })

    it('falls back to "free" when tenant is null', () => {
      mockTenantRef.value = null
      const { currentTier } = useTierGate()
      expect(currentTier.value).toBe('free')
    })

    it('is case-insensitive (Pro → pro)', () => {
      setTier('Pro')
      const { currentTier } = useTierGate()
      expect(currentTier.value).toBe('pro')
    })
  })

  // ── hasAccess ──────────────────────────────────────────────────────────
  describe('hasAccess', () => {
    it('free tier has access to free features', () => {
      setTier('free')
      const { hasAccess } = useTierGate()
      expect(hasAccess('free')).toBe(true)
    })

    it('free tier does NOT have access to pro features', () => {
      setTier('free')
      const { hasAccess } = useTierGate()
      expect(hasAccess('pro')).toBe(false)
    })

    it('free tier does NOT have access to enterprise features', () => {
      setTier('free')
      const { hasAccess } = useTierGate()
      expect(hasAccess('enterprise')).toBe(false)
    })

    it('pro tier has access to free features', () => {
      setTier('pro')
      const { hasAccess } = useTierGate()
      expect(hasAccess('free')).toBe(true)
    })

    it('pro tier has access to pro features', () => {
      setTier('pro')
      const { hasAccess } = useTierGate()
      expect(hasAccess('pro')).toBe(true)
    })

    it('pro tier does NOT have access to enterprise features', () => {
      setTier('pro')
      const { hasAccess } = useTierGate()
      expect(hasAccess('enterprise')).toBe(false)
    })

    it('enterprise tier has access to all tiers', () => {
      setTier('enterprise')
      const { hasAccess } = useTierGate()
      expect(hasAccess('free')).toBe(true)
      expect(hasAccess('pro')).toBe(true)
      expect(hasAccess('enterprise')).toBe(true)
    })
  })

  // ── isPro / isEnterprise computed ──────────────────────────────────────
  describe('isPro', () => {
    it('is false on free tier', () => {
      setTier('free')
      const { isPro } = useTierGate()
      expect(isPro.value).toBe(false)
    })

    it('is true on pro tier', () => {
      setTier('pro')
      const { isPro } = useTierGate()
      expect(isPro.value).toBe(true)
    })

    it('is true on enterprise tier (pro is included)', () => {
      setTier('enterprise')
      const { isPro } = useTierGate()
      expect(isPro.value).toBe(true)
    })
  })

  describe('isEnterprise', () => {
    it('is false on free tier', () => {
      setTier('free')
      const { isEnterprise } = useTierGate()
      expect(isEnterprise.value).toBe(false)
    })

    it('is false on pro tier', () => {
      setTier('pro')
      const { isEnterprise } = useTierGate()
      expect(isEnterprise.value).toBe(false)
    })

    it('is true on enterprise tier', () => {
      setTier('enterprise')
      const { isEnterprise } = useTierGate()
      expect(isEnterprise.value).toBe(true)
    })
  })

  // ── gate() ─────────────────────────────────────────────────────────────
  describe('gate()', () => {
    it('returns true and keeps modal hidden when access is granted', () => {
      setTier('pro')
      const { gate, upgradeVisible } = useTierGate()
      const result = gate('pro', 'Break-Even Analysis')
      expect(result).toBe(true)
      expect(upgradeVisible.value).toBe(false)
    })

    it('returns false and shows modal when access is denied', () => {
      setTier('free')
      const { gate, upgradeVisible } = useTierGate()
      const result = gate('pro', 'Break-Even Analysis')
      expect(result).toBe(false)
      expect(upgradeVisible.value).toBe(true)
    })

    it('sets the feature name in the modal when access is denied', () => {
      setTier('free')
      const { gate, upgradeFeatureName } = useTierGate()
      gate('pro', 'Cap Table')
      expect(upgradeFeatureName.value).toBe('Cap Table')
    })

    it('uses default feature name when none provided', () => {
      setTier('free')
      const { gate, upgradeFeatureName } = useTierGate()
      gate('pro')
      expect(upgradeFeatureName.value).toBe('This feature')
    })

    it('enterprise tenant passes a pro gate', () => {
      setTier('enterprise')
      const { gate, upgradeVisible } = useTierGate()
      const result = gate('pro', 'BEP')
      expect(result).toBe(true)
      expect(upgradeVisible.value).toBe(false)
    })

    it('pro tenant fails an enterprise gate', () => {
      setTier('pro')
      const { gate, upgradeVisible } = useTierGate()
      const result = gate('enterprise', 'Enterprise Feature')
      expect(result).toBe(false)
      expect(upgradeVisible.value).toBe(true)
    })
  })

  // ── showUpgradeModal / hideUpgradeModal ────────────────────────────────
  describe('showUpgradeModal / hideUpgradeModal', () => {
    it('showUpgradeModal sets visible and feature name', () => {
      const { showUpgradeModal, upgradeVisible, upgradeFeatureName } = useTierGate()
      showUpgradeModal('Break-Even Analysis')
      expect(upgradeVisible.value).toBe(true)
      expect(upgradeFeatureName.value).toBe('Break-Even Analysis')
    })

    it('hideUpgradeModal sets visible to false', () => {
      const { showUpgradeModal, hideUpgradeModal, upgradeVisible } = useTierGate()
      showUpgradeModal('Some Feature')
      expect(upgradeVisible.value).toBe(true)
      hideUpgradeModal()
      expect(upgradeVisible.value).toBe(false)
    })

    it('showUpgradeModal uses default name when not provided', () => {
      const { showUpgradeModal, upgradeFeatureName } = useTierGate()
      showUpgradeModal()
      expect(upgradeFeatureName.value).toBe('This feature')
    })
  })

  // ── Global singleton behaviour ─────────────────────────────────────────
  describe('singleton modal state', () => {
    it('modal state is shared across two independent useTierGate() calls', () => {
      setTier('free')
      const instanceA = useTierGate()
      const instanceB = useTierGate()

      instanceA.showUpgradeModal('Feature A')

      // Both should see the same reactive state
      expect(instanceB.upgradeVisible.value).toBe(true)
      expect(instanceB.upgradeFeatureName.value).toBe('Feature A')
    })

    it('hiding from one instance hides for all', () => {
      const instanceA = useTierGate()
      const instanceB = useTierGate()

      instanceA.showUpgradeModal('X')
      instanceB.hideUpgradeModal()
      expect(instanceA.upgradeVisible.value).toBe(false)
    })
  })
})
