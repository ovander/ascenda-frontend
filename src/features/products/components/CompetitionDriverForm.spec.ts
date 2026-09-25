import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import type { CompetitionParams } from '@/types'
import CompetitionDriverForm from './CompetitionDriverForm.vue'
import { defaultCompetition } from '../utils/athleteDrivers'

const InputNumberStub = defineComponent({
  props: ['modelValue', 'inputId', 'min', 'max', 'maxFractionDigits'],
  emits: ['update:modelValue'],
  template: '<input class="num-input" :id="inputId" :value="modelValue" />',
})
const SelectStub = defineComponent({
  props: ['modelValue', 'options'],
  emits: ['update:modelValue'],
  template: '<select class="circuit-select" :value="modelValue"><optgroup v-for="g in options" :key="g.label" :label="g.label"><option v-for="o in g.items" :key="o.value" :value="o.value">{{ o.label }}</option></optgroup></select>',
})
const stubs = { InputNumber: InputNumberStub, Select: SelectStub, KFieldLabel: { props: ['label'], template: '<span>{{ label }}</span>' } }

function mountForm(modelValue: CompetitionParams) {
  return mount(CompetitionDriverForm, { props: { modelValue }, global: { stubs } })
}
const lastEmit = (w: ReturnType<typeof mountForm>) =>
  (w.emitted('update:modelValue') as CompetitionParams[][]).at(-1)![0]!
const digits = (s: string) => s.replace(/[^\d]/g, '')

describe('CompetitionDriverForm', () => {
  it('shows the prize money and direct costs computed from the results', () => {
    const w = mountForm(defaultCompetition())
    // default: 20 events, 12 cuts, 3 top 10s, 1 win on the Alps Tour
    // gains = 7455 + 3 × 1647 + 8 × 692 = 17 932 ; costs = 20 × (350 + 1100) = 29 000
    const gains = w.findAll('[data-test="competition-gains"] td.num')
    const costs = w.findAll('[data-test="competition-costs"] td.num')
    expect(digits(gains[0]!.text())).toBe('17932')
    expect(digits(costs[0]!.text())).toBe('29000')
  })

  it('groups the tours by region', () => {
    const select = mountForm(defaultCompetition()).findAllComponents(SelectStub)[0]!
    const groups = select.props('options') as { label: string; items: { label: string }[] }[]
    expect(groups.map((g) => g.label)).toEqual(['Europe', 'United States', 'Other'])
    expect(groups[1]!.items.map((i) => i.label)).toEqual(['PGA Tour Americas', 'Korn Ferry Tour', 'PGA Tour'])
  })

  it('fills the year from a US tour preset', async () => {
    const w = mountForm(defaultCompetition())
    await w.findAllComponents(SelectStub)[3]!.vm.$emit('update:modelValue', 'kornferry')
    const next = lastEmit(w)
    expect(next.circuit[3]).toBe('Korn Ferry Tour')
    expect(next.prizePerWin[3]).toBe('158000')
  })

  it('converts a legacy per-event coach fee on load', () => {
    const legacy = { ...defaultCompetition(), coachFeePerEvent: ['400', '0', '0', '0', '0'] } as CompetitionParams
    delete (legacy as Partial<CompetitionParams>).coachAnnualFee
    const w = mountForm(legacy)
    const next = lastEmit(w)
    expect(next.coachAnnualFee[0]).toBe('8000') // 20 events × 400
    expect(next.coachFeePerEvent).toBeUndefined()
  })

  it('does not emit on load when the params are current', () => {
    expect(mountForm(defaultCompetition()).emitted('update:modelValue')).toBeUndefined()
  })

  it('fills the year from a tour preset', async () => {
    const w = mountForm(defaultCompetition())
    const selects = w.findAllComponents(SelectStub)
    await selects[1]!.vm.$emit('update:modelValue', 'dpworld')
    const next = lastEmit(w)
    expect(next.circuit[1]).toBe('DP World Tour')
    expect(next.prizePerWin[1]).toBe('380000')
    expect(next.prizePerTop10[1]).toBe('90000')
    expect(next.prizePerCut[1]).toBe('12000')
    expect(next.prizePerWin[0]).toBe('7455') // other years untouched
  })

  it('keeps counts as integers and money as strings', async () => {
    const w = mountForm(defaultCompetition())
    const input = (id: string) => w.findAllComponents(InputNumberStub).find((c) => c.props('inputId') === id)!
    await input('competition-wins-2').vm.$emit('update:modelValue', 2.6)
    expect(lastEmit(w).wins[2]).toBe(3)
    await input('competition-coachAnnualFee-2').vm.$emit('update:modelValue', 24000)
    expect(lastEmit(w).coachAnnualFee[2]).toBe('24000')
  })

  it('warns when the results are impossible', () => {
    const p = defaultCompetition()
    p.cuts = [25, 12, 12, 12, 12]
    const w = mountForm(p)
    const issues = w.find('[data-test="competition-issues"]')
    expect(issues.exists()).toBe(true)
    expect(issues.text()).toContain('Y1')
    expect(issues.text()).toContain('cuts made (25) exceed events played (20)')
  })

  it('shows no warning for consistent results', () => {
    expect(mountForm(defaultCompetition()).find('[data-test="competition-issues"]').exists()).toBe(false)
  })
})
