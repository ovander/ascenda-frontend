/**
 * Unit tests for ScenarioIntelligenceSection component.
 *
 * Covers: null/loading render states, pro-tier full content, freemium locked
 * overlay, defensive riskClasses normalisation (uppercase urgency values),
 * and the refresh emit.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount }      from '@vue/test-utils'
import { nextTick }   from 'vue'
import { ref }        from 'vue'
import type { ScenarioAnalysisResult } from '../types'

// ── Mock composables / stores BEFORE component import ─────────────────────────

vi.mock('@/composables/useTierGate')
vi.mock('@/stores/ui')

import { useTierGate } from '@/composables/useTierGate'
import { useUiStore }  from '@/stores/ui'

import ScenarioIntelligenceSection from './ScenarioIntelligenceSection.vue'

// ── Stubs for child components ────────────────────────────────────────────────

const ShowOnStub   = { template: '<slot />' }          // render content unconditionally
const ProBadgeStub = { template: '<span class="pro-badge" />' }
// Render the `label` prop as text so assertions on CTA labels work
const ButtonStub   = {
  props:    ['label', 'icon', 'severity', 'outlined', 'size', 'iconPos', 'as', 'href', 'disabled', 'loading'],
  template: '<button v-bind="$attrs" :href="href">{{ label }}<slot /></button>',
  inheritAttrs: false,
}

const GLOBAL_STUBS = {
  ShowOn:   ShowOnStub,
  ProBadge: ProBadgeStub,
  Button:   ButtonStub,
}

// ── Fixture data ──────────────────────────────────────────────────────────────

const MOCK_ANALYSIS: ScenarioAnalysisResult = {
  viability: {
    score:     72,
    label:     'Viable',
    rationale: 'Controlled risk profile with moderate growth outlook.',
  },
  highlights: {
    headline:   'Solid foundation with manageable risks',
    strengths:  ['Strong cash position', 'Diversified revenue streams'],
    weaknesses: ['High burn rate in Q1'],
  },
  risks: [
    { title: 'Cash flow risk',   description: 'Monthly burn exceeds projections', urgency: 'high'   },
    { title: 'Market risk',      description: 'Competition intensifying',          urgency: 'medium' },
    { title: 'Ops risk',         description: 'Team scaling challenges',           urgency: 'low'    },
  ],
  drivers:  [],
  trends:   [],
  generated_at: '2026-04-01T12:00:00Z',
}

const BASE_PATH = '/plans/plan-1/scenarios/scen-1'

// ── Mount helper ──────────────────────────────────────────────────────────────

function mountSection(
  analysis: ScenarioAnalysisResult | null,
  loading = false,
) {
  return mount(ScenarioIntelligenceSection, {
    props: { analysis, loading, basePath: BASE_PATH },
    global: { stubs: GLOBAL_STUBS },
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ScenarioIntelligenceSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: pro tier, desktop
    vi.mocked(useTierGate).mockReturnValue({
      isFreemium:       ref(false),
      isPro:            ref(true),
      isEnterprise:     ref(false),
      showUpgradeModal: vi.fn(),
      gate:             vi.fn(() => true),
    } as any)

    vi.mocked(useUiStore).mockReturnValue({
      isMobile:  false,
      isTablet:  false,
      isDesktop: true,
    } as any)
  })

  // ── Null state ─────────────────────────────────────────────────────────────

  it('renders nothing when analysis is null and not loading', () => {
    const wrapper = mountSection(null, false)
    // The component renders an empty <template v-if>; no visible text or elements.
    expect(wrapper.find('.animate-pulse').exists()).toBe(false)
    expect(wrapper.text().trim()).toBe('')
  })

  // ── Skeleton ───────────────────────────────────────────────────────────────

  it('renders animate-pulse skeleton when loading=true', () => {
    const wrapper = mountSection(null, true)
    expect(wrapper.find('.animate-pulse').exists()).toBe(true)
  })

  it('does not render the intelligence card content while loading', () => {
    const wrapper = mountSection(null, true)
    expect(wrapper.text()).not.toContain('Scenario Intelligence')
  })

  // ── Pro tier: full content ─────────────────────────────────────────────────

  it('renders section header with "Scenario Intelligence" for pro user', async () => {
    const wrapper = mountSection(MOCK_ANALYSIS)
    await nextTick()
    expect(wrapper.text()).toContain('Scenario Intelligence')
  })

  it('renders viability score for pro user', async () => {
    const wrapper = mountSection(MOCK_ANALYSIS)
    await nextTick()
    expect(wrapper.text()).toContain('72')
    expect(wrapper.text()).toContain('Viable')
  })

  it('renders headline for pro user', async () => {
    const wrapper = mountSection(MOCK_ANALYSIS)
    await nextTick()
    expect(wrapper.text()).toContain('Solid foundation with manageable risks')
  })

  it('renders top 3 risks for pro user', async () => {
    const wrapper = mountSection(MOCK_ANALYSIS)
    await nextTick()
    expect(wrapper.text()).toContain('Cash flow risk')
    expect(wrapper.text()).toContain('Market risk')
    expect(wrapper.text()).toContain('Ops risk')
  })

  it('renders "View Full Analysis" CTA for pro user', async () => {
    const wrapper = mountSection(MOCK_ANALYSIS)
    await nextTick()
    expect(wrapper.text()).toContain('View Full Analysis')
  })

  // ── Freemium tier: locked overlay ─────────────────────────────────────────

  it('renders blur overlay and lock icon for freemium user', async () => {
    vi.mocked(useTierGate).mockReturnValue({
      isFreemium:       ref(true),
      isPro:            ref(false),
      isEnterprise:     ref(false),
      showUpgradeModal: vi.fn(),
      gate:             vi.fn(() => false),
    } as any)

    const wrapper = mountSection(MOCK_ANALYSIS)
    await nextTick()

    expect(wrapper.find('.blur-sm').exists()).toBe(true)
    expect(wrapper.text()).toContain('Upgrade to Pro to unlock')
  })

  it('calls showUpgradeModal when freemium user clicks the locked area', async () => {
    const mockShowUpgradeModal = vi.fn()
    vi.mocked(useTierGate).mockReturnValue({
      isFreemium:       ref(true),
      isPro:            ref(false),
      isEnterprise:     ref(false),
      showUpgradeModal: mockShowUpgradeModal,
      gate:             vi.fn(() => false),
    } as any)

    const wrapper = mountSection(MOCK_ANALYSIS)
    await nextTick()

    // Click the locked overlay div
    await wrapper.find('[class*="cursor-pointer"]').trigger('click')
    await nextTick()

    expect(mockShowUpgradeModal).toHaveBeenCalledWith('Scenario Intelligence', 'pro')
  })

  // ── Defensive: uppercase urgency values ───────────────────────────────────

  it('renders without crashing when risk urgency values are uppercase', async () => {
    const analysisWithUppercase: ScenarioAnalysisResult = {
      ...MOCK_ANALYSIS,
      risks: [
        { title: 'Critical issue', description: 'Very bad', urgency: 'CRITICAL' as any },
        { title: 'High priority',  description: 'Also bad', urgency: 'HIGH' as any    },
      ],
    }

    const wrapper = mountSection(analysisWithUppercase)
    await nextTick()

    // Should render titles without throwing
    expect(wrapper.text()).toContain('Critical issue')
    expect(wrapper.text()).toContain('High priority')
  })

  // ── Refresh emit ──────────────────────────────────────────────────────────

  it('emits refresh when the refresh button is clicked', async () => {
    const wrapper = mountSection(MOCK_ANALYSIS)
    await nextTick()

    await wrapper.find('button[title="Refresh analysis"]').trigger('click')
    await nextTick()

    expect(wrapper.emitted('refresh')).toHaveLength(1)
  })
})
