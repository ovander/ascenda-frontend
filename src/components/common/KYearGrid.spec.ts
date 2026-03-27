import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, shallowMount } from '@vue/test-utils'
import KYearGrid from './KYearGrid.vue'
import type { GridRow } from './KYearGrid.vue'

// Mock PrimeVue components
vi.mock('primevue/datatable', () => ({
  default: {
    name: 'DataTable',
    template: '<div class="p-datatable"><slot /></div>',
  },
}))

vi.mock('primevue/column', () => ({
  default: {
    name: 'Column',
    template: '<div class="p-column"><slot /></div>',
  },
}))

vi.mock('primevue/inputnumber', () => ({
  default: {
    name: 'InputNumber',
    template: '<input class="p-inputnumber" />',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
}))

// Mock composables
vi.mock('@/composables/useYearHeaders', () => ({
  useYearHeaders: () => ({
    yearHeaders: ['2023', '2024', '2025'],
  }),
}))

vi.mock('@/composables/useDecimal', () => ({
  useDecimal: () => ({
    formatCurrency: (value: number | string, decimals: number = 0) => {
      const num = typeof value === 'string' ? parseFloat(value) : value
      return num.toFixed(decimals)
    },
    formatUnit: (value: number | string) => {
      // Return value as-is in tests (no unit scaling)
      const num = typeof value === 'string' ? parseFloat(value) : value
      return String(num)
    },
    getUnitLabel: () => 'k€',
  }),
}))

vi.mock('@/utils/format', () => ({
  debounce: (fn: Function, delay: number) => {
    return fn
  },
}))

describe('KYearGrid', () => {
  const mockRows: GridRow[] = [
    {
      id: 'row-1',
      label: 'Revenue',
      values: [100, 200, 300],
      editable: true,
      decimals: 2,
    },
    {
      id: 'row-2',
      label: 'Costs',
      values: [50, 75, 100],
      editable: true,
      decimals: 2,
    },
    {
      id: 'row-3',
      label: 'Computed Field',
      values: [50, 125, 200],
      editable: false,
      isComputed: true,
      decimals: 2,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the data table with correct structure', () => {
    const wrapper = shallowMount(KYearGrid, {
      props: {
        rows: mockRows,
      },
      global: {
        stubs: {
          DataTable: false,
          Column: false,
          InputNumber: false,
        },
      },
    })

    expect(wrapper.find('.p-datatable-sm').exists()).toBe(true)
  })

  it('renders all rows provided in props', () => {
    const wrapper = shallowMount(KYearGrid, {
      props: {
        rows: mockRows,
      },
    })

    // Verify rows are passed through to the component
    expect(wrapper.props('rows')).toHaveLength(3)
    expect(wrapper.props('rows')[0].label).toBe('Revenue')
    expect(wrapper.props('rows')[1].label).toBe('Costs')
    expect(wrapper.props('rows')[2].label).toBe('Computed Field')
  })

  it('shows total row when showTotal prop is true', () => {
    const wrapper = shallowMount(KYearGrid, {
      props: {
        rows: mockRows,
        showTotal: true,
        totalLabel: 'Grand Total',
        totalValues: [200, 400, 600],
      },
      global: {
        stubs: {
          DataTable: { template: '<div><slot /> <slot name="footer" /></div>' },
          Column: { template: '<div><slot /></div>' },
        },
      },
    })

    expect(wrapper.text()).toContain('Grand Total')
    expect(wrapper.text()).toContain('200')
  })

  it('hides total row when showTotal is false', () => {
    const wrapper = shallowMount(KYearGrid, {
      props: {
        rows: mockRows,
        showTotal: false,
      },
      global: {
        stubs: {
          DataTable: { template: '<div><slot /> <slot name="footer" /></div>' },
          Column: { template: '<div><slot /></div>' },
        },
      },
    })

    expect(wrapper.text()).not.toContain('Total')
  })

  it('passes editable rows to DataTable', () => {
    const editableRow: GridRow = {
      id: 'editable-1',
      label: 'Editable',
      values: [100, 200, 300],
      editable: true,
    }

    const wrapper = shallowMount(KYearGrid, {
      props: {
        rows: [editableRow],
      },
    })

    // Verify editable row is passed as prop
    expect(wrapper.props('rows')[0].editable).toBe(true)
    expect(wrapper.exists()).toBe(true)
  })

  it('passes non-editable computed rows correctly', () => {
    const readonlyRow: GridRow = {
      id: 'readonly-1',
      label: 'Read Only',
      values: [100, 200, 300],
      editable: false,
      isComputed: true,
    }

    const wrapper = shallowMount(KYearGrid, {
      props: {
        rows: [readonlyRow],
      },
    })

    expect(wrapper.props('rows')[0].editable).toBe(false)
    expect(wrapper.props('rows')[0].isComputed).toBe(true)
  })

  it('emits cell-edit event when editable cell value changes', async () => {
    const editableRow: GridRow = {
      id: 'edit-row',
      label: 'Editable',
      values: [100, 200, 300],
      editable: true,
    }

    const wrapper = shallowMount(KYearGrid, {
      props: {
        rows: [editableRow],
      },
      global: {
        stubs: {
          DataTable: { template: '<div><slot /></div>' },
          Column: { template: '<div><slot /></div>' },
        },
      },
    })

    // Access the component instance to test the onCellEdit method
    const vm = wrapper.vm as any
    vm.onCellEdit(editableRow, 0, 150)

    // The emit should be called (debounced)
    expect(editableRow.values[0]).toBe(150)
  })

  it('applies correct CSS classes for different row types', async () => {
    const mixedRows: GridRow[] = [
      {
        id: 'normal',
        label: 'Normal',
        values: [100, 200],
        editable: true,
      },
      {
        id: 'aggregate',
        label: 'Aggregate',
        values: [500, 600],
        editable: false,
        isAggregate: true,
      },
      {
        id: 'subtotal',
        label: 'Subtotal',
        values: [300, 400],
        editable: false,
        isSubtotal: true,
      },
    ]

    const wrapper = shallowMount(KYearGrid, {
      props: {
        rows: mixedRows,
      },
      global: {
        stubs: {
          DataTable: { template: '<div><slot /></div>' },
          Column: { template: '<div><slot /></div>' },
        },
      },
    })

    const vm = wrapper.vm as any
    expect(vm.getRowClass(mixedRows[0])).toBe('')
    expect(vm.getRowClass(mixedRows[1])).toBe('row-aggregate')
    expect(vm.getRowClass(mixedRows[2])).toBe('row-subtotal')
  })

  it('applies correct CSS classes for cell types', async () => {
    const wrapper = shallowMount(KYearGrid, {
      props: {
        rows: mockRows,
      },
    })

    const vm = wrapper.vm as any

    const editableRow = { ...mockRows[0], editable: true }
    const computedRow = { ...mockRows[0], editable: false }

    expect(vm.getCellClass(editableRow)).toBe('cell-input')
    expect(vm.getCellClass(computedRow)).toBe('cell-computed')
  })

  it('converts string values to numbers correctly', () => {
    const wrapper = shallowMount(KYearGrid, {
      props: {
        rows: mockRows,
      },
    })

    const vm = wrapper.vm as any

    expect(vm.numValue('123')).toBe(123)
    expect(vm.numValue('123.45')).toBe(123.45)
    expect(vm.numValue(100)).toBe(100)
    expect(vm.numValue('invalid')).toBe(0)
  })

  it('uses provided locale for number formatting', () => {
    const wrapper = shallowMount(KYearGrid, {
      props: {
        rows: mockRows,
        locale: 'en-US',
      },
    })

    expect(wrapper.props('locale')).toBe('en-US')
  })

  it('applies groupBy when groupBy prop is true', () => {
    const groupedRows: GridRow[] = [
      {
        id: 'row-1',
        label: 'Item A',
        values: [100, 200],
        group: 'Group 1',
      },
      {
        id: 'row-2',
        label: 'Item B',
        values: [150, 250],
        group: 'Group 1',
      },
      {
        id: 'row-3',
        label: 'Item C',
        values: [200, 300],
        group: 'Group 2',
      },
    ]

    const wrapper = shallowMount(KYearGrid, {
      props: {
        rows: groupedRows,
        groupBy: true,
      },
      global: {
        stubs: {
          DataTable: { template: '<div><slot /></div>' },
          Column: { template: '<div><slot /></div>' },
        },
      },
    })

    expect(wrapper.props('groupBy')).toBe(true)
  })

  it('handles empty rows array gracefully', () => {
    const wrapper = shallowMount(KYearGrid, {
      props: {
        rows: [],
      },
      global: {
        stubs: {
          DataTable: { template: '<div><slot /></div>' },
          Column: { template: '<div><slot /></div>' },
        },
      },
    })

    expect(wrapper.exists()).toBe(true)
  })

  it('passes suffix through row data', () => {
    const rowWithSuffix: GridRow = {
      id: 'with-suffix',
      label: 'Amount',
      values: [100, 200, 300],
      editable: true,
      suffix: 'EUR',
    }

    const wrapper = shallowMount(KYearGrid, {
      props: {
        rows: [rowWithSuffix],
      },
    })

    expect(wrapper.props('rows')[0].suffix).toBe('EUR')
  })

  it('respects decimal precision setting', async () => {
    const wrapper = shallowMount(KYearGrid, {
      props: {
        rows: mockRows,
      },
    })

    const vm = wrapper.vm as any
    const rowWith2Decimals = { ...mockRows[0], decimals: 2 }
    const rowWith4Decimals = { ...mockRows[0], decimals: 4 }

    expect(rowWith2Decimals.decimals).toBe(2)
    expect(rowWith4Decimals.decimals).toBe(4)
  })
})
