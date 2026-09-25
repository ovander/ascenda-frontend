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
  template: '<select class="circuit-select" :value="modelValue"><option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
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
    await input('competition-coachFeePerEvent-2').vm.$emit('update:modelValue', 450)
    expect(lastEmit(w).coachFeePerEvent[2]).toBe('450')
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
