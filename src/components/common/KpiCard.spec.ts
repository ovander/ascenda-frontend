import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import KpiCard from './KpiCard.vue'

describe('KpiCard', () => {
  it('renders label and value', () => {
    const w = mount(KpiCard, { props: { label: 'Revenue', value: '€500K' } })
    expect(w.text()).toContain('Revenue')
    expect(w.text()).toContain('€500K')
  })

  it('renders unit when provided', () => {
    const w = mount(KpiCard, { props: { label: 'Margin', value: '23.4', unit: '%' } })
    expect(w.text()).toContain('%')
  })

  it('applies positive severity class', () => {
    const w = mount(KpiCard, { props: { label: 'EBITDA', value: '€100K', severity: 'positive' } })
    expect(w.find('.text-green-700').exists()).toBe(true)
  })

  it('applies negative severity class', () => {
    const w = mount(KpiCard, { props: { label: 'Net Loss', value: '-€50K', severity: 'negative' } })
    expect(w.find('.text-red-600').exists()).toBe(true)
  })

  it('renders up trend icon', () => {
    const w = mount(KpiCard, { props: { label: 'Growth', value: '15%', trend: 'up' } })
    expect(w.find('.pi-arrow-up').exists()).toBe(true)
  })

  it('renders down trend icon', () => {
    const w = mount(KpiCard, { props: { label: 'Decline', value: '-5%', trend: 'down' } })
    expect(w.find('.pi-arrow-down').exists()).toBe(true)
  })

  it('renders subtitle when provided', () => {
    const w = mount(KpiCard, { props: { label: 'EBITDA', value: '€100K', subtitle: '23% of sales' } })
    expect(w.text()).toContain('23% of sales')
  })
})
