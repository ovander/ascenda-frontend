import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import KpiGrid from './KpiGrid.vue'
import type { KpiItem } from './KpiGrid.vue'

const MOCK_ITEMS: KpiItem[] = [
  { id: 'r', label: 'Revenue', value: '€500K' },
  { id: 'e', label: 'EBITDA', value: '€100K', severity: 'positive' },
]

describe('KpiGrid', () => {
  it('renders all items', () => {
    const w = mount(KpiGrid, { props: { items: MOCK_ITEMS } })
    expect(w.text()).toContain('Revenue')
    expect(w.text()).toContain('EBITDA')
  })

  it('renders 2-column grid', () => {
    const w = mount(KpiGrid, { props: { items: MOCK_ITEMS } })
    expect(w.find('.grid-cols-2').exists()).toBe(true)
  })

  it('renders correct number of KpiCard components', () => {
    const w = mount(KpiGrid, { props: { items: MOCK_ITEMS } })
    expect(w.findAllComponents({ name: 'KpiCard' })).toHaveLength(2)
  })

  it('renders empty state gracefully', () => {
    const w = mount(KpiGrid, { props: { items: [] } })
    expect(w.findAllComponents({ name: 'KpiCard' })).toHaveLength(0)
  })
})
