import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import type { ContractParams, Product } from '@/types'
import ContractDriverForm from './ContractDriverForm.vue'
import { useProductStore } from '@/features/products/stores/productStore'
import { defaultCompetition } from '../utils/athleteDrivers'

const InputNumberStub = defineComponent({
  props: ['modelValue', 'inputId', 'min', 'maxFractionDigits'],
  emits: ['update:modelValue'],
  template: '<input class="num-input" :id="inputId" :value="modelValue" />',
})
const stubs = {
  InputNumber: InputNumberStub,
  InputText: defineComponent({ props: ['modelValue'], emits: ['update:modelValue'], template: '<input class="text-input" :value="modelValue" />' }),
  Button: defineComponent({ emits: ['click'], template: '<button @click="$emit(\'click\')"><slot /></button>' }),
}

const params: ContractParams = {
  contracts: [
    { partner: 'Main sponsor', amounts: ['0', '6000', '6000', '30000', '50000'], bonusPerWin: '1000' },
    { partner: 'Club', amounts: ['0', '4000', '4000', '5000', '5000'], bonusPerWin: '0' },
  ],
}

function mountForm(modelValue: ContractParams = params) {
  return mount(ContractDriverForm, { props: { modelValue }, global: { stubs } })
}
const lastEmit = (w: ReturnType<typeof mountForm>) =>
  (w.emitted('update:modelValue') as ContractParams[][]).at(-1)![0]!
const digits = (s: string) => s.replace(/[^\d]/g, '')

describe('ContractDriverForm', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('adds the bonus per win on wins from the scenario competition products', () => {
    const store = useProductStore()
    const competition = { ...defaultCompetition(), wins: [4, 0, 1, 0, 0] as [number, number, number, number, number] }
    store.products = [{ id: 'p1', name: 'Prize money', driverType: 'competition', driverParams: competition } as unknown as Product]

    const w = mountForm()
    const wins = w.findAll('[data-test="contract-wins"] td.num').map((c) => c.text())
    const total = w.findAll('[data-test="contract-total"] td.num').map((c) => digits(c.text()))

    expect(wins).toEqual(['4', '0', '1', '0', '0'])
    // Year 1: wins but no active contract, so no bonus; year 3: 10 000 + 1 win × 1 000.
    expect(total).toEqual(['0', '10000', '11000', '35000', '55000'])
  })

  it('adds and removes contracts', async () => {
    const w = mountForm()
    expect(w.findAll('[data-test="contract-row"]')).toHaveLength(2)

    await w.find('[data-test="contract-add"]').trigger('click')
    expect(lastEmit(w).contracts).toHaveLength(3)
    expect(lastEmit(w).contracts[2]).toEqual({ partner: '', amounts: ['0', '0', '0', '0', '0'], bonusPerWin: '0' })

    await w.findAll('[data-test="contract-remove"]')[0]!.trigger('click')
    expect(lastEmit(w).contracts.map((c) => c.partner)).toEqual(['Club'])
  })

  it('stores amounts as decimal strings for the edited year only', async () => {
    const w = mountForm()
    const amount = w.findAllComponents(InputNumberStub).find((c) => c.props('inputId') === 'contract-1-amount-4')!
    await amount.vm.$emit('update:modelValue', 7500)
    const next = lastEmit(w)
    expect(next.contracts[1]!.amounts).toEqual(['0', '4000', '4000', '5000', '7500'])
    expect(next.contracts[0]).toEqual(params.contracts[0])
  })
})
