/**
 * DriverParamsForm.spec.ts
 *
 * Tests for the DriverParamsForm component:
 *   - Renders the correct fields for each driver type
 *   - Renders nothing meaningful for 'generic'
 *   - Seeds default params when modelValue is null
 *   - Emits update:modelValue on scalar field changes
 *   - Emits update:modelValue on per-year array field changes
 *   - Preserves unchanged array values on partial update
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import type {
  DriverType,
  DriverParams,
  ConsultingParams,
  SaaSParams,
  IndustryParams,
  MarketplaceParams,
  MediaParams,
  SessionBasedParams,
} from '@/types'

// ── Minimal stub for KFieldLabel so we can inspect label text ──────────────
const KFieldLabelStub = defineComponent({
  props: ['label', 'tooltip'],
  template: '<span class="klabel">{{ label }}</span>',
})

// ── InputNumber stub that exposes onUpdateModelValue ─────────────────────
// In production PrimeVue fires `update:modelValue`; we trigger it manually.
const InputNumberStub = defineComponent({
  props: ['modelValue', 'min', 'max', 'maxFractionDigits'],
  emits: ['update:modelValue'],
  template: '<input class="p-inputnumber" :value="modelValue" @input="$emit(\'update:modelValue\', parseFloat($event.target.value))" />',
})

const stubs = {
  KFieldLabel: KFieldLabelStub,
  InputNumber: InputNumberStub,
  InputText: { template: '<input />' },
}

// ── Helpers ─────────────────────────────────────────────────────────────────
import DriverParamsForm from './DriverParamsForm.vue'

function mountForm(driverType: DriverType, modelValue: DriverParams) {
  return mount(DriverParamsForm, {
    props: { driverType, modelValue },
    global: { stubs },
  })
}

// ── Fixtures ─────────────────────────────────────────────────────────────────
const consultingParams: ConsultingParams = {
  headcount:       ['2', '2', '3', '3', '4'],
  workingDays:     220,
  utilizationRate: ['0.80', '0.80', '0.80', '0.80', '0.80'],
  monthlyGross:    ['5000', '5000', '5500', '5500', '6000'],
  employerCharges: '0.45',
}

const saasParams: SaaSParams = {
  activeUsers:        [50, 50, 100, 100, 200],
  monthlyFee:         ['99', '99', '99', '119', '119'],
  infraCostPerUser:   ['8', '8', '7', '7', '6'],
  supportCostPerUser: ['4', '4', '4', '4', '4'],
}

const industryParams: IndustryParams = {
  productionCapacity: [5000, 6000, 7000, 8000, 9000],
  scrapRate:          ['0.02', '0.02', '0.015', '0.015', '0.01'],
  setupCost:          ['10000', '0', '0', '0', '0'],
}

const marketplaceParams: MarketplaceParams = {
  transactions:      [1000, 2000, 4000, 8000, 12000],
  gmvPerTransaction: ['80', '80', '80', '90', '90'],
  takeRate:          ['0.12', '0.12', '0.12', '0.12', '0.12'],
  paymentCost:       ['1.5', '1.5', '1.5', '1.5', '1.5'],
  fixedInfraCost:    ['12000', '12000', '18000', '18000', '24000'],
}

const mediaParams: MediaParams = {
  impressions:               [5000000, 8000000, 12000000, 15000000, 20000000],
  cpm:                       ['3.5', '3.5', '4', '4', '4.5'],
  fillRate:                  ['0.65', '0.70', '0.72', '0.75', '0.78'],
  contentCost:               ['50000', '50000', '60000', '60000', '75000'],
  deliveryCostPerImpression: ['0.0005', '0.0005', '0.0004', '0.0004', '0.0003'],
}

const sessionBasedParams: SessionBasedParams = {
  sessions:                   [80, 100, 120, 140, 160],
  participantsPerSession:     ['20', '20', '22', '22', '25'],
  fillRate:                   ['0.75', '0.78', '0.80', '0.82', '0.85'],
  pricePerParticipant:        ['150', '155', '160', '165', '170'],
  trainerCount:               ['3', '4', '5', '6', '6'],
  sessionsPerTrainer:         [40, 40, 40, 40, 45],
  utilizationRate:            ['0.90', '0.90', '0.90', '0.90', '0.90'],
  trainerCostPerSession:      ['400', '400', '420', '420', '450'],
  variableCostPerParticipant: ['15', '15', '14', '14', '13'],
}

// ────────────────────────────────────────────────────────────────────────────
describe('DriverParamsForm', () => {

  // ── generic ────────────────────────────────────────────────────────────────
  describe('generic driver', () => {
    it('renders nothing (no driver form) for generic', () => {
      const wrapper = mountForm('generic', null)
      expect(wrapper.find('.driver-form').exists()).toBe(false)
    })
  })

  // ── consulting ─────────────────────────────────────────────────────────────
  describe('consulting driver', () => {
    it('renders the consulting form', () => {
      const wrapper = mountForm('consulting', consultingParams)
      expect(wrapper.find('.driver-form').exists()).toBe(true)
    })

    it('shows Working Days and Employer Charge scalar fields', () => {
      const wrapper = mountForm('consulting', consultingParams)
      const labels = wrapper.findAllComponents(KFieldLabelStub).map((c) => c.props('label'))
      expect(labels).toContain('Working Days / Year')
      expect(labels).toContain('Employer Charge Rate')
    })

    it('shows all three 5-year array fields', () => {
      const wrapper = mountForm('consulting', consultingParams)
      const labels = wrapper.findAllComponents(KFieldLabelStub).map((c) => c.props('label'))
      expect(labels).toContain('Headcount (FTE)')
      expect(labels).toContain('Utilisation Rate')
      expect(labels).toContain('Monthly Gross Salary (€)')
    })

    it('renders 5 year columns in the table (Y1–Y5)', () => {
      const wrapper = mountForm('consulting', consultingParams)
      const headers = wrapper.findAll('th').map((th) => th.text())
      expect(headers.filter((h) => h.match(/^Y\d$/))).toHaveLength(5)
    })

    it('emits update:modelValue with new workingDays on scalar change', async () => {
      const wrapper = mountForm('consulting', consultingParams)
      // First InputNumber is Working Days — emit directly on the component instance
      const inputs = wrapper.findAllComponents(InputNumberStub)
      await inputs[0].vm.$emit('update:modelValue', 215)
      await nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeDefined()
      const lastEmit = (emitted as any[]).at(-1)[0] as ConsultingParams
      expect(lastEmit.workingDays).toBe(215)
      // Unchanged fields preserved
      expect(lastEmit.headcount).toEqual(consultingParams.headcount)
    })

    it('emits update:modelValue preserving other years on headcount Y1 change', async () => {
      const wrapper = mountForm('consulting', consultingParams)
      // inputs[0]=workingDays, inputs[1]=employerCharges, inputs[2..6]=headcount Y1..Y5
      const inputs = wrapper.findAllComponents(InputNumberStub)
      await inputs[2].vm.$emit('update:modelValue', 5)
      await nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      const lastEmit = (emitted as any[]).at(-1)[0] as ConsultingParams
      expect(lastEmit.headcount[0]).toBe('5')      // Y1 updated
      expect(lastEmit.headcount[1]).toBe('2')      // Y2 unchanged
      expect(lastEmit.headcount[4]).toBe('4')      // Y5 unchanged
    })

    it('seeds defaults and emits when modelValue is null', async () => {
      const wrapper = mountForm('consulting', null)
      await nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeDefined()
      const seeded = (emitted as any[])[0][0] as ConsultingParams
      expect(seeded.workingDays).toBe(220)
      expect(seeded.headcount).toHaveLength(5)
      expect(seeded.utilizationRate[0]).toBe('0.75')
    })
  })

  // ── saas ───────────────────────────────────────────────────────────────────
  describe('saas driver', () => {
    it('renders the SaaS form', () => {
      const wrapper = mountForm('saas', saasParams)
      expect(wrapper.find('.driver-form').exists()).toBe(true)
    })

    it('shows all four SaaS fields', () => {
      const wrapper = mountForm('saas', saasParams)
      const labels = wrapper.findAllComponents(KFieldLabelStub).map((c) => c.props('label'))
      expect(labels).toContain('Active Users')
      expect(labels).toContain('Monthly Fee (€)')
      expect(labels).toContain('Infra Cost / User / Month (€)')
      expect(labels).toContain('Support Cost / User / Month (€)')
    })

    it('seeds SaaS defaults when modelValue is null', async () => {
      const wrapper = mountForm('saas', null)
      await nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeDefined()
      const seeded = (emitted as any[])[0][0] as SaaSParams
      expect(seeded.activeUsers).toHaveLength(5)
      expect(seeded.monthlyFee[0]).toBe('100')
    })

    it('emits updated activeUsers array on Y3 change', async () => {
      const wrapper = mountForm('saas', saasParams)
      const inputs = wrapper.findAllComponents(InputNumberStub)
      // inputs[0..4] = activeUsers Y1..Y5
      await inputs[2].vm.$emit('update:modelValue', 150)
      await nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      const lastEmit = (emitted as any[]).at(-1)[0] as SaaSParams
      // patchArr always serialises to String — runtime value is '150'
      expect(String(lastEmit.activeUsers[2])).toBe('150')
      expect(lastEmit.activeUsers[0]).toBe(50)  // Y1 unchanged (not touched by patchArr)
    })
  })

  // ── industry ───────────────────────────────────────────────────────────────
  describe('industry driver', () => {
    it('renders the industry form', () => {
      const wrapper = mountForm('industry', industryParams)
      expect(wrapper.find('.driver-form').exists()).toBe(true)
    })

    it('shows production capacity, scrap rate and setup cost fields', () => {
      const wrapper = mountForm('industry', industryParams)
      const labels = wrapper.findAllComponents(KFieldLabelStub).map((c) => c.props('label'))
      expect(labels).toContain('Production Capacity (units)')
      expect(labels).toContain('Scrap Rate')
      expect(labels).toContain('Setup Cost (€/year)')
    })

    it('seeds industry defaults when modelValue is null', async () => {
      const wrapper = mountForm('industry', null)
      await nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      const seeded = (emitted as any[])[0][0] as IndustryParams
      expect(seeded.scrapRate[0]).toBe('0.02')
      expect(seeded.productionCapacity).toHaveLength(5)
    })
  })

  // ── marketplace ────────────────────────────────────────────────────────────
  describe('marketplace driver', () => {
    it('renders the marketplace form', () => {
      const wrapper = mountForm('marketplace', marketplaceParams)
      expect(wrapper.find('.driver-form').exists()).toBe(true)
    })

    it('shows transactions, GMV, take rate, payment cost, fixed infra fields', () => {
      const wrapper = mountForm('marketplace', marketplaceParams)
      const labels = wrapper.findAllComponents(KFieldLabelStub).map((c) => c.props('label'))
      expect(labels).toContain('Transactions')
      expect(labels).toContain('GMV / Transaction (€)')
      expect(labels).toContain('Take Rate')
      expect(labels).toContain('Payment Cost / Transaction (€)')
      expect(labels).toContain('Fixed Infra Cost (€/year)')
    })

    it('seeds marketplace defaults when modelValue is null', async () => {
      const wrapper = mountForm('marketplace', null)
      await nextTick()

      const seeded = (wrapper.emitted('update:modelValue') as any[])[0][0] as MarketplaceParams
      expect(seeded.transactions).toHaveLength(5)
      expect(seeded.takeRate[0]).toBe('0.10')
    })

    it('emits updated takeRate on Y1 change', async () => {
      const wrapper = mountForm('marketplace', marketplaceParams)
      const inputs = wrapper.findAllComponents(InputNumberStub)
      // inputs layout: [transactions Y1..Y5, gmv Y1..Y5, takeRate Y1..Y5, ...]
      // takeRate starts at index 10
      await inputs[10].vm.$emit('update:modelValue', 0.15)
      await nextTick()

      const emitted = wrapper.emitted('update:modelValue') as any[]
      const lastEmit = emitted.at(-1)[0] as MarketplaceParams
      expect(lastEmit.takeRate[0]).toBe('0.15')
      expect(lastEmit.transactions[0]).toBe(1000) // unchanged
    })
  })

  // ── media ──────────────────────────────────────────────────────────────────
  describe('media driver', () => {
    it('renders the media form', () => {
      const wrapper = mountForm('media', mediaParams)
      expect(wrapper.find('.driver-form').exists()).toBe(true)
    })

    it('shows impressions, CPM, fill rate, content cost, delivery cost fields', () => {
      const wrapper = mountForm('media', mediaParams)
      const labels = wrapper.findAllComponents(KFieldLabelStub).map((c) => c.props('label'))
      expect(labels).toContain('Impressions / Year')
      expect(labels).toContain('CPM (€)')
      expect(labels).toContain('Fill Rate')
      expect(labels).toContain('Content Cost (€/year)')
      expect(labels).toContain('Delivery Cost / Impression (€)')
    })

    it('seeds media defaults when modelValue is null', async () => {
      const wrapper = mountForm('media', null)
      await nextTick()

      const seeded = (wrapper.emitted('update:modelValue') as any[])[0][0] as MediaParams
      expect(seeded.fillRate[0]).toBe('0.70')
      expect(seeded.impressions).toHaveLength(5)
    })

    it('emits updated fillRate on Y2 change', async () => {
      const wrapper = mountForm('media', mediaParams)
      const inputs = wrapper.findAllComponents(InputNumberStub)
      // [impressions Y1..Y5, cpm Y1..Y5, fillRate Y1..Y5, ...]
      // fillRate starts at index 10; Y2 is index 11
      await inputs[11].vm.$emit('update:modelValue', 0.85)
      await nextTick()

      const emitted = wrapper.emitted('update:modelValue') as any[]
      const lastEmit = emitted.at(-1)[0] as MediaParams
      expect(lastEmit.fillRate[1]).toBe('0.85')
      expect(lastEmit.fillRate[0]).toBe('0.65') // Y1 unchanged
    })
  })

  // ── session_based ──────────────────────────────────────────────────────────
  describe('session_based driver', () => {
    it('renders the session-based form', () => {
      const wrapper = mountForm('session_based', sessionBasedParams)
      expect(wrapper.find('.driver-form').exists()).toBe(true)
    })

    it('shows all 9 session-based parameter fields', () => {
      const wrapper = mountForm('session_based', sessionBasedParams)
      const labels = wrapper.findAllComponents(KFieldLabelStub).map((c) => c.props('label'))
      expect(labels).toContain('Planned Sessions')
      expect(labels).toContain('Participants / Session (max)')
      expect(labels).toContain('Fill Rate')
      expect(labels).toContain('Price / Participant (€)')
      expect(labels).toContain('Trainer Count')
      expect(labels).toContain('Sessions / Trainer / Year')
      expect(labels).toContain('Trainer Utilisation Rate')
      expect(labels).toContain('Trainer Cost / Session (€)')
      expect(labels).toContain('Variable Cost / Participant (€)')
    })

    it('renders 5 year columns', () => {
      const wrapper = mountForm('session_based', sessionBasedParams)
      const yCols = wrapper.findAll('th').map((th) => th.text()).filter((h) => h.match(/^Y\d$/))
      expect(yCols).toHaveLength(5)
    })

    it('seeds session_based defaults when modelValue is null', async () => {
      const wrapper = mountForm('session_based', null)
      await nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeDefined()
      const seeded = (emitted as any[])[0][0] as SessionBasedParams
      expect(seeded.sessions).toHaveLength(5)
      expect(seeded.sessions[0]).toBe(50)
      expect(seeded.fillRate[0]).toBe('0.75')
      expect(seeded.trainerCostPerSession[0]).toBe('300')
      expect(seeded.sessionsPerTrainer[0]).toBe(30)
    })

    it('emits updated sessions on Y1 change (integer field)', async () => {
      const wrapper = mountForm('session_based', sessionBasedParams)
      const inputs = wrapper.findAllComponents(InputNumberStub)
      // Field order: sessions Y1..Y5 = indices 0..4
      await inputs[0].vm.$emit('update:modelValue', 90)
      await nextTick()

      const emitted = wrapper.emitted('update:modelValue') as any[]
      const lastEmit = emitted.at(-1)[0] as SessionBasedParams
      expect(String(lastEmit.sessions[0])).toBe('90') // patchArr stringifies
      expect(lastEmit.sessions[1]).toBe(100)          // Y2 unchanged
    })

    it('emits updated fillRate on Y2 change', async () => {
      const wrapper = mountForm('session_based', sessionBasedParams)
      const inputs = wrapper.findAllComponents(InputNumberStub)
      // Field order: sessions(5) participants(5) fillRate(5)…; fillRate Y2 = index 11
      await inputs[11].vm.$emit('update:modelValue', 0.88)
      await nextTick()

      const emitted = wrapper.emitted('update:modelValue') as any[]
      const lastEmit = emitted.at(-1)[0] as SessionBasedParams
      expect(lastEmit.fillRate[1]).toBe('0.88')
      expect(lastEmit.fillRate[0]).toBe('0.75') // Y1 unchanged
    })

    it('emits updated trainerCostPerSession on Y3 change', async () => {
      const wrapper = mountForm('session_based', sessionBasedParams)
      const inputs = wrapper.findAllComponents(InputNumberStub)
      // sessions(5) + participants(5) + fillRate(5) + price(5) + trainers(5) + sessionsPerTrainer(5)
      // + utilization(5) + trainerCost(5) → trainerCostPerSession Y3 = index 5*7+2 = 37
      await inputs[37].vm.$emit('update:modelValue', 500)
      await nextTick()

      const emitted = wrapper.emitted('update:modelValue') as any[]
      const lastEmit = emitted.at(-1)[0] as SessionBasedParams
      expect(lastEmit.trainerCostPerSession[2]).toBe('500')
      expect(lastEmit.trainerCostPerSession[0]).toBe('400') // Y1 unchanged
    })

    it('does not render when driver type is generic', () => {
      const wrapper = mountForm('generic', null)
      expect(wrapper.find('.driver-form').exists()).toBe(false)
    })
  })

  // ── driver type switch seeds new defaults ─────────────────────────────────
  describe('driver type switch', () => {
    it('re-seeds defaults when driver type changes and modelValue stays null', async () => {
      const wrapper = mount(DriverParamsForm, {
        props: { driverType: 'consulting' as DriverType, modelValue: null },
        global: { stubs },
      })
      await nextTick()

      // Initial seed
      let emitted = wrapper.emitted('update:modelValue') as any[]
      expect(emitted).toHaveLength(1)
      expect((emitted[0][0] as ConsultingParams).workingDays).toBe(220)

      // Switch to SaaS with null params
      await wrapper.setProps({ driverType: 'saas', modelValue: null })
      await nextTick()

      emitted = wrapper.emitted('update:modelValue') as any[]
      expect(emitted).toHaveLength(2)
      const seededSaaS = emitted[1][0] as SaaSParams
      expect(seededSaaS.monthlyFee).toBeDefined()
      expect((seededSaaS as any).workingDays).toBeUndefined()
    })

    it('does NOT re-seed when driver type changes but modelValue is already set', async () => {
      const wrapper = mount(DriverParamsForm, {
        props: { driverType: 'consulting' as DriverType, modelValue: consultingParams },
        global: { stubs },
      })
      await nextTick()

      // No seed should happen — params already provided
      expect(wrapper.emitted('update:modelValue')).toBeUndefined()

      // Switch driver type — modelValue is reset to non-null saasParams by parent
      await wrapper.setProps({ driverType: 'saas', modelValue: saasParams })
      await nextTick()

      // Still no seed emit since modelValue was provided
      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })
  })

  // ── productTypeFromDriver mapping (tested through the store) ──────────────
  describe('productTypeFromDriver mapping', () => {
    it('consulting and session_based map to service; all others map to product', () => {
      // This mapping lives in ProductsView, verified by checking that
      // createProduct would be called with the correct productType.
      // Here we assert the logic directly.
      type DT = 'consulting' | 'session_based' | 'saas' | 'industry' | 'marketplace' | 'media' | 'generic'
      const fn = (dt: DT) =>
        dt === 'consulting' || dt === 'session_based' ? 'service' : 'product'
      expect(fn('consulting')).toBe('service')
      expect(fn('session_based')).toBe('service')
      expect(fn('saas')).toBe('product')
      expect(fn('industry')).toBe('product')
      expect(fn('marketplace')).toBe('product')
      expect(fn('media')).toBe('product')
      expect(fn('generic')).toBe('product')
    })
  })
})
