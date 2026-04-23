import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// ── useAuth mock — controllable user.plan ref ─────────────────────────────
// Must be declared before vi.mock() because the factory captures it by closure.
import { ref } from 'vue'

const mockUserRef = ref<{ plan: string } | null>({ plan: 'freemium' })

vi.mock('@/composables/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: mockUserRef,
  })),
}))

import { useTierGate } from './useTierGate'

// Helper: set the user's commercial plan between tests
function setPlan(plan: string) {
  mockUserRef.value = { plan }
}

describe('useTierGate', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setPlan('freemium')
    // Reset global modal state between tests
    const { hideUpgradeModal } = useTierGate()
    hideUpgradeModal()
  })

  // ── currentTier ─────────────────────────────────────────────────────────
  describe('currentTier', () => {
    it('returns "freemium" when user plan is freemium', () => {
      setPlan('freemium')
      const { currentTier } = useTierGate()
      expect(currentTier.value).toBe('freemium')
    })

    it('accepts legacy "free" string and maps to "freemium"', () => {
      setPlan('free')
      const { currentTier } = useTierGate()
      expect(currentTier.value).toBe('freemium')
    })

    it('returns "pro" when user plan is pro', () => {
      setPlan('pro')
      const { currentTier } = useTierGate()
      expect(currentTier.value).toBe('pro')
    })

    it('returns "enterprise" when user plan is enterprise', () => {
      setPlan('enterprise')
      const { currentTier } = useTierGate()
      expect(currentTier.value).toBe('enterprise')
    })

    it('falls back to "freemium" for unknown plan strings', () => {
      setPlan('unknown_plan')
      const { currentTier } = useTierGate()
      expect(currentTier.value).toBe('freemium')
    })

    it('falls back to "freemium" when user is null', () => {
      mockUserRef.value = null
      const { currentTier } = useTierGate()
      expect(currentTier.value).toBe('freemium')
    })

    it('is case-insensitive (Pro → pro)', () => {
      setPlan('Pro')
      const { currentTier } = useTierGate()
      expect(currentTier.value).toBe('pro')
    })
  })

  // ── isFreemium ──────────────────────────────────────────────────────────
  describe('isFreemium', () => {
    it('is true on freemium plan', () => {
      setPlan('freemium')
      const { isFreemium } = useTierGate()
      expect(isFreemium.value).toBe(true)
    })

    it('is false on pro plan', () => {
      setPlan('pro')
      const { isFreemium } = useTierGate()
      expect(isFreemium.value).toBe(false)
    })

    it('is false on enterprise plan', () => {
      setPlan('enterprise')
      const { isFreemium } = useTierGate()
      expect(isFreemium.value).toBe(false)
    })
  })

  // ── isPro ───────────────────────────────────────────────────────────────
  describe('isPro', () => {
    it('is false on freemium plan', () => {
      setPlan('freemium')
      const { isPro } = useTierGate()
      expect(isPro.value).toBe(false)
    })

    it('is true on pro plan', () => {
      setPlan('pro')
      const { isPro } = useTierGate()
      expect(isPro.value).toBe(true)
    })

    it('is true on enterprise plan (pro features are included)', () => {
      setPlan('enterprise')
      const { isPro } = useTierGate()
      expect(isPro.value).toBe(true)
    })
  })

  // ── isEnterprise ────────────────────────────────────────────────────────
  describe('isEnterprise', () => {
    it('is false on freemium plan', () => {
      setPlan('freemium')
      const { isEnterprise } = useTierGate()
      expect(isEnterprise.value).toBe(false)
    })

    it('is false on pro plan', () => {
      setPlan('pro')
      const { isEnterprise } = useTierGate()
      expect(isEnterprise.value).toBe(false)
    })

    it('is true on enterprise plan', () => {
      setPlan('enterprise')
      const { isEnterprise } = useTierGate()
      expect(isEnterprise.value).toBe(true)
    })
  })

  // ── hasAccess ───────────────────────────────────────────────────────────
  describe('hasAccess', () => {
    it('freemium has access to freemium features', () => {
      setPlan('freemium')
      const { hasAccess } = useTierGate()
      expect(hasAccess('freemium')).toBe(true)
    })

    it('freemium does NOT have access to pro features', () => {
      setPlan('freemium')
      const { hasAccess } = useTierGate()
      expect(hasAccess('pro')).toBe(false)
    })

    it('freemium does NOT have access to enterprise features', () => {
      setPlan('freemium')
      const { hasAccess } = useTierGate()
      expect(hasAccess('enterprise')).toBe(false)
    })

    it('pro has access to freemium features', () => {
      setPlan('pro')
      const { hasAccess } = useTierGate()
      expect(hasAccess('freemium')).toBe(true)
    })

    it('pro has access to pro features', () => {
      setPlan('pro')
      const { hasAccess } = useTierGate()
      expect(hasAccess('pro')).toBe(true)
    })

    it('pro does NOT have access to enterprise features', () => {
      setPlan('pro')
      const { hasAccess } = useTierGate()
      expect(hasAccess('enterprise')).toBe(false)
    })

    it('enterprise has access to all tiers', () => {
      setPlan('enterprise')
      const { hasAccess } = useTierGate()
      expect(hasAccess('freemium')).toBe(true)
      expect(hasAccess('pro')).toBe(true)
      expect(hasAccess('enterprise')).toBe(true)
    })
  })

  // ── gate() ──────────────────────────────────────────────────────────────
  describe('gate()', () => {
    it('returns true and keeps modal hidden when access is granted', () => {
      setPlan('pro')
      const { gate, upgradeVisible } = useTierGate()
      const result = gate('pro', 'Break-Even Analysis')
      expect(result).toBe(true)
      expect(upgradeVisible.value).toBe(false)
    })

    it('returns false and shows modal when access is denied', () => {
      setPlan('freemium')
      const { gate, upgradeVisible } = useTierGate()
      const result = gate('pro', 'Break-Even Analysis')
      expect(result).toBe(false)
      expect(upgradeVisible.value).toBe(true)
    })

    it('sets the feature name in the modal when access is denied', () => {
      setPlan('freemium')
      const { gate, upgradeFeatureName } = useTierGate()
      gate('pro', 'Cap Table')
      expect(upgradeFeatureName.value).toBe('Cap Table')
    })

    it('uses default feature name when none provided', () => {
      setPlan('freemium')
      const { gate, upgradeFeatureName } = useTierGate()
      gate('pro')
      expect(upgradeFeatureName.value).toBe('This feature')
    })

    it('enterprise plan passes a pro gate', () => {
      setPlan('enterprise')
      const { gate, upgradeVisible } = useTierGate()
      const result = gate('pro', 'BEP')
      expect(result).toBe(true)
      expect(upgradeVisible.value).toBe(false)
    })

    it('pro plan fails an enterprise gate', () => {
      setPlan('pro')
      const { gate, upgradeVisible } = useTierGate()
      const result = gate('enterprise', 'Enterprise Feature')
      expect(result).toBe(false)
      expect(upgradeVisible.value).toBe(true)
    })
  })

  // ── showUpgradeModal / hideUpgradeModal ──────────────────────────────────
  describe('showUpgradeModal / hideUpgradeModal', () => {
    it('showUpgradeModal sets visible and feature name', () => {
      const { showUpgradeModal, upgradeVisible, upgradeFeatureName } = useTierGate()
      showUpgradeModal('Break-Even Analysis')
      expect(upgradeVisible.value).toBe(true)
      expect(upgradeFeatureName.value).toBe('Break-Even Analysis')
    })

    it('showUpgradeModal records the target tier', () => {
      const { showUpgradeModal, upgradeTargetTier } = useTierGate()
      showUpgradeModal('Cap Table', 'enterprise')
      expect(upgradeTargetTier.value).toBe('enterprise')
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

  // ── Global singleton behaviour ───────────────────────────────────────────
  describe('singleton modal state', () => {
    it('modal state is shared across two independent useTierGate() calls', () => {
      const instanceA = useTierGate()
      const instanceB = useTierGate()

      instanceA.showUpgradeModal('Feature A')

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
