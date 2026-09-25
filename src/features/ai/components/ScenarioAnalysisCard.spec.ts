/**
 * Unit tests for ScenarioAnalysisCard component.
 *
 * Covers: section visibility rules (highlights/trends guarded by `?.`),
 * risk sorting by urgency priority, defensive handling of uppercase urgency /
 * impact / direction values, viability score display, and AI narration rendering.
 */
import { describe, it, expect } from 'vitest'
import { mount }    from '@vue/test-utils'
import { nextTick } from 'vue'
import type { ScenarioAnalysisResult } from '@/features/scenarios/types'

import ScenarioAnalysisCard from './ScenarioAnalysisCard.vue'

// ── Stubs ─────────────────────────────────────────────────────────────────────

const TagStub = {
  template: '<span class="p-tag" v-bind="$attrs"><slot /></span>',
  props: ['value', 'severity'],
  inheritAttrs: false,
}

const GLOBAL_STUBS = { Tag: TagStub }

// ── Fixture helpers ───────────────────────────────────────────────────────────

function minimal(): ScenarioAnalysisResult {
  return {
    viability: { score: 55, label: 'At Risk', rationale: 'Growth stalling.' },
    highlights: undefined as any,  // intentionally absent — backend sometimes omits
    risks:   [],
    drivers: [],
    trends:  undefined as any,
    generated_at: '2026-04-01T12:00:00Z',
  }
}

function full(): ScenarioAnalysisResult {
  return {
    viability: {
      score:     85,
      label:     'Strong',
      rationale: 'Robust revenue projections with tight cost management.',
    },
    highlights: {
      headline:   'Excellent growth trajectory',
      strengths:  ['Recurring revenue base', 'Low churn'],
      weaknesses: ['High CAC in new markets'],
    },
    risks: [
      { title: 'Cashflow squeeze', description: 'Q2 gap',       urgency: 'critical' },
      { title: 'Key person risk',  description: 'CTO departure', urgency: 'high'     },
      { title: 'Pricing pressure', description: 'Competition',   urgency: 'medium'   },
      { title: 'Reg compliance',   description: 'New rules',     urgency: 'low'      },
    ],
    drivers: [
      { title: 'ARR growth',     description: 'SaaS expansion',  impact: 'positive', priority: 1 },
      { title: 'Infra costs',    description: 'Scaling overhead', impact: 'negative', priority: 2 },
    ],
    trends: [
      { metric: 'MRR',  direction: 'up',   description: '12 % MoM growth' },
      { metric: 'Burn', direction: 'down',  description: 'Cost optimisation' },
    ],
    narration: {
      text:            'The scenario is well-positioned for the next 12 months.',
      language:        'en',
      is_ai_generated: true,
    },
    generated_at: '2026-04-01T12:00:00Z',
  }
}

const RouterLinkStub = {
  template: '<a><slot /></a>',
  props: ['to'],
}

function mount_(analysis: ScenarioAnalysisResult, mode?: 'full' | 'compact' | 'embedded') {
  return mount(ScenarioAnalysisCard, {
    props:  { analysis, mode },
    global: { stubs: { ...GLOBAL_STUBS, RouterLink: RouterLinkStub } },
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ScenarioAnalysisCard', () => {

  // ── Viability score ────────────────────────────────────────────────────────

  it('renders viability score and label', async () => {
    const wrapper = mount_(full())
    await nextTick()

    expect(wrapper.text()).toContain('85')
    expect(wrapper.text()).toContain('Strong')
  })

  it('renders viability rationale text', async () => {
    const wrapper = mount_(full())
    await nextTick()

    expect(wrapper.text()).toContain('Robust revenue projections')
  })

  it('renders "—" for score when viability is undefined', async () => {
    const data = full()
    ;(data as any).viability = undefined
    const wrapper = mount_(data)
    await nextTick()

    expect(wrapper.text()).toContain('—')
  })

  // ── Highlights ─────────────────────────────────────────────────────────────

  it('renders Highlights section when highlights are present', async () => {
    const wrapper = mount_(full())
    await nextTick()

    expect(wrapper.text()).toContain('Highlights')
    expect(wrapper.text()).toContain('Excellent growth trajectory')
    expect(wrapper.text()).toContain('Recurring revenue base')
    expect(wrapper.text()).toContain('High CAC in new markets')
  })

  it('omits Highlights section when highlights is absent', async () => {
    const wrapper = mount_(minimal())
    await nextTick()

    expect(wrapper.text()).not.toContain('Highlights')
  })

  // ── Risks ──────────────────────────────────────────────────────────────────

  it('renders all risks', async () => {
    const wrapper = mount_(full())
    await nextTick()

    expect(wrapper.text()).toContain('Cashflow squeeze')
    expect(wrapper.text()).toContain('Key person risk')
    expect(wrapper.text()).toContain('Pricing pressure')
    expect(wrapper.text()).toContain('Reg compliance')
  })

  it('renders risks sorted by urgency (critical first)', async () => {
    // Provide risks in wrong order — critical last
    const data = full()
    data.risks = [
      { title: 'Low issue',      description: '', urgency: 'low'      },
      { title: 'Critical issue', description: '', urgency: 'critical' },
      { title: 'Medium issue',   description: '', urgency: 'medium'   },
    ]
    const wrapper = mount_(data)
    await nextTick()

    const html = wrapper.html()
    const critIdx = html.indexOf('Critical issue')
    const medIdx  = html.indexOf('Medium issue')
    const lowIdx  = html.indexOf('Low issue')

    expect(critIdx).toBeLessThan(medIdx)
    expect(medIdx).toBeLessThan(lowIdx)
  })

  it('does not crash when risk urgency values are uppercase', async () => {
    const data = full()
    data.risks = [
      { title: 'CRITICAL thing', description: 'bad', urgency: 'CRITICAL' as any },
      { title: 'HIGH thing',     description: 'bad', urgency: 'HIGH' as any     },
    ]
    const wrapper = mount_(data)
    await nextTick()

    expect(wrapper.text()).toContain('CRITICAL thing')
    expect(wrapper.text()).toContain('HIGH thing')
  })

  // ── Drivers ────────────────────────────────────────────────────────────────

  it('renders Root Causes section when drivers are present', async () => {
    const wrapper = mount_(full())
    await nextTick()

    expect(wrapper.text()).toContain('Root Causes')
    expect(wrapper.text()).toContain('ARR growth')
    expect(wrapper.text()).toContain('Infra costs')
  })

  it('does not crash with uppercase driver impact values', async () => {
    const data = full()
    data.drivers = [
      { title: 'Growth', description: 'Up', impact: 'POSITIVE' as any, priority: 1 },
    ]
    const wrapper = mount_(data)
    await nextTick()

    expect(wrapper.text()).toContain('Growth')
  })

  // ── Trends ─────────────────────────────────────────────────────────────────

  it('renders Trend Insights section when trends are present', async () => {
    const wrapper = mount_(full())
    await nextTick()

    expect(wrapper.text()).toContain('Trend Insights')
    expect(wrapper.text()).toContain('MRR')
    expect(wrapper.text()).toContain('Burn')
  })

  it('omits Trend Insights section when trends is absent', async () => {
    const wrapper = mount_(minimal())  // trends: undefined
    await nextTick()

    expect(wrapper.text()).not.toContain('Trend Insights')
  })

  it('does not crash with uppercase trend direction values', async () => {
    const data = full()
    data.trends = [
      { metric: 'Revenue', direction: 'UP' as any, description: 'Growing fast' },
    ]
    const wrapper = mount_(data)
    await nextTick()

    expect(wrapper.text()).toContain('Revenue')
  })

  // ── AI Narration ───────────────────────────────────────────────────────────

  it('renders AI Commentary section when narration.text is present', async () => {
    const wrapper = mount_(full())
    await nextTick()

    expect(wrapper.text()).toContain('AI Commentary')
    expect(wrapper.text()).toContain('well-positioned for the next 12 months')
  })

  it('omits AI Commentary section when narration is absent', async () => {
    const data = full()
    data.narration = undefined
    const wrapper = mount_(data)
    await nextTick()

    expect(wrapper.text()).not.toContain('AI Commentary')
  })

  // ── Generated timestamp ────────────────────────────────────────────────────

  it('renders generated-at timestamp when present', async () => {
    const wrapper = mount_(full())
    await nextTick()

    expect(wrapper.text()).toContain('Analysis generated')
  })

  it('omits timestamp when generated_at is absent', async () => {
    const data = full()
    ;(data as any).generated_at = undefined
    const wrapper = mount_(data)
    await nextTick()

    expect(wrapper.text()).not.toContain('Analysis generated')
  })

  // ── Mode prop tests ────────────────────────────────────────────────────────

  describe('mode prop', () => {
    it('compact mode shows viability and top risks, hides drivers and trends', async () => {
      const wrapper = mount_(full(), 'compact')
      await nextTick()

      expect(wrapper.text()).toContain('85') // score visible
      expect(wrapper.find('[data-testid="drivers-section"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="trends-section"]').exists()).toBe(false)
    })

    it('compact mode shows only top 2 risks', async () => {
      const wrapper = mount_(full(), 'compact')
      await nextTick()

      // full() has 4 risks, compact should show only first 2 (sorted by urgency)
      const text = wrapper.text()
      expect(text).toContain('Cashflow squeeze')
      expect(text).toContain('Key person risk')
      // Last 2 risks should not be in the rendered text
      expect(text).not.toContain('Pricing pressure')
      expect(text).not.toContain('Reg compliance')
    })

    it('full mode shows all sections', async () => {
      const wrapper = mount_(full(), 'full')
      await nextTick()

      expect(wrapper.text()).toContain('85')
      expect(wrapper.find('[data-testid="drivers-section"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="trends-section"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('Root Causes')
      expect(wrapper.text()).toContain('Trend Insights')
    })

    it('full mode shows AI commentary', async () => {
      const wrapper = mount_(full(), 'full')
      await nextTick()

      expect(wrapper.text()).toContain('AI Commentary')
    })

    it('embedded mode shows view full analysis link', async () => {
      const wrapper = mount_(full(), 'embedded')
      await nextTick()

      expect(wrapper.text()).toContain('View Full Analysis')
    })

    it('full mode does not show view full analysis link', async () => {
      const wrapper = mount_(full(), 'full')
      await nextTick()

      expect(wrapper.text()).not.toContain('View Full Analysis')
    })

    it('compact mode does not show highlights section', async () => {
      const wrapper = mount_(full(), 'compact')
      await nextTick()

      expect(wrapper.text()).not.toContain('Highlights')
    })

    it('defaults to full mode when mode not provided', async () => {
      const wrapper = mount_(full())
      await nextTick()

      expect(wrapper.text()).toContain('Root Causes')
      expect(wrapper.text()).toContain('Trend Insights')
    })

    it('embedded mode hides AI commentary', async () => {
      const wrapper = mount_(full(), 'embedded')
      await nextTick()

      expect(wrapper.text()).not.toContain('AI Commentary')
    })

    it('compact mode hides timestamp', async () => {
      const wrapper = mount_(full(), 'compact')
      await nextTick()

      expect(wrapper.text()).not.toContain('Analysis generated')
    })
  })
})
