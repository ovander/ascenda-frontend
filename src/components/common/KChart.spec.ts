import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import KChart from './KChart.vue'
import type { ChartData } from '@/types'

// Mock vue-chartjs components
vi.mock('vue-chartjs', () => ({
  Bar: {
    name: 'Bar',
    template: '<div class="chart-bar"><canvas /></div>',
  },
  Line: {
    name: 'Line',
    template: '<div class="chart-line"><canvas /></div>',
  },
  Radar: {
    name: 'Radar',
    template: '<div class="chart-radar"><canvas /></div>',
  },
}))

// Mock Chart.js plugin
vi.mock('@/plugins/chartjs', () => ({
  PALETTE_BG: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff'],
  PALETTE_BORDER: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff'],
  DEFAULT_BAR_OPTIONS: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
    scales: { x: { stacked: false }, y: { beginAtZero: true } },
  },
  DEFAULT_LINE_OPTIONS: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
    scales: { x: { stacked: false }, y: { beginAtZero: true } },
  },
  DEFAULT_STACKED_BAR_OPTIONS: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
    scales: { x: { stacked: true }, y: { beginAtZero: true } },
  },
}))

describe('KChart', () => {
  const mockChartData: ChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr'],
    datasets: [
      {
        label: 'Series 1',
        data: [10, 20, 30, 40],
        backgroundColor: '#ff6384',
        borderColor: '#ff6384',
      },
      {
        label: 'Series 2',
        data: [15, 25, 35, 45],
        backgroundColor: '#36a2eb',
        borderColor: '#36a2eb',
      },
    ],
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders chart wrapper with correct height', () => {
    const wrapper = shallowMount(KChart, {
      props: {
        data: mockChartData,
        height: '400px',
      },
    })

    expect(wrapper.find('.kchart-wrapper').exists()).toBe(true)
    expect(wrapper.find('.kchart-wrapper').attributes('style')).toContain('height: 400px')
  })

  it('uses responsive default height when height prop is not provided', () => {
    const wrapper = shallowMount(KChart, {
      global: { plugins: [createPinia()] },
      props: { data: mockChartData },
    })
    // In jsdom the window width is large enough to be "desktop", so default resolves to 320px.
    const style = wrapper.find('.kchart-wrapper').attributes('style') ?? ''
    expect(style).toMatch(/height/)
  })

  it('displays title when provided', () => {
    const wrapper = shallowMount(KChart, {
      props: {
        data: mockChartData,
        title: 'Sales Report',
      },
    })

    expect(wrapper.find('h3').text()).toBe('Sales Report')
  })

  it('hides title when not provided', () => {
    const wrapper = shallowMount(KChart, {
      props: {
        data: mockChartData,
      },
    })

    expect(wrapper.find('h3').exists()).toBe(false)
  })

  it('shows loading state when loading prop is true', () => {
    const wrapper = shallowMount(KChart, {
      props: {
        data: mockChartData,
        loading: true,
      },
    })

    expect(wrapper.text()).toContain('Loading chart data')
  })

  it('hides loading state when loading is false', () => {
    const wrapper = shallowMount(KChart, {
      props: {
        data: mockChartData,
        loading: false,
      },
    })

    expect(wrapper.text()).not.toContain('Loading chart data')
  })

  it('shows empty state when data is null', () => {
    const wrapper = shallowMount(KChart, {
      props: {
        data: null,
      },
    })

    expect(wrapper.text()).toContain('No chart data available')
  })

  it('shows empty state when datasets array is empty', () => {
    const emptyChartData: ChartData = {
      labels: ['Jan', 'Feb', 'Mar'],
      datasets: [],
    }

    const wrapper = shallowMount(KChart, {
      props: {
        data: emptyChartData,
      },
    })

    expect(wrapper.text()).toContain('No chart data available')
  })

  it('renders Bar chart by default', () => {
    const wrapper = shallowMount(KChart, {
      props: {
        data: mockChartData,
      },
    })

    const vm = wrapper.vm as any
    expect(vm.chartComponent.name).toBe('Bar')
  })

  it('renders Bar chart when type is "bar"', () => {
    const wrapper = shallowMount(KChart, {
      props: {
        data: mockChartData,
        type: 'bar',
      },
    })

    const vm = wrapper.vm as any
    expect(vm.chartComponent.name).toBe('Bar')
  })

  it('renders Line chart when type is "line"', () => {
    const wrapper = shallowMount(KChart, {
      props: {
        data: mockChartData,
        type: 'line',
      },
    })

    const vm = wrapper.vm as any
    expect(vm.chartComponent.name).toBe('Line')
  })

  it('renders Line chart when type is "area"', () => {
    const wrapper = shallowMount(KChart, {
      props: {
        data: mockChartData,
        type: 'area',
      },
    })

    const vm = wrapper.vm as any
    expect(vm.chartComponent.name).toBe('Line')
  })

  it('renders Radar chart when type is "radar"', () => {
    const wrapper = shallowMount(KChart, {
      props: {
        data: mockChartData,
        type: 'radar',
      },
    })

    const vm = wrapper.vm as any
    expect(vm.chartComponent.name).toBe('Radar')
  })

  it('uses default bar options for bar chart', () => {
    const wrapper = shallowMount(KChart, {
      props: {
        data: mockChartData,
        type: 'bar',
      },
    })

    const vm = wrapper.vm as any
    expect(vm.chartOptions).toHaveProperty('responsive')
    expect(vm.chartOptions).toHaveProperty('maintainAspectRatio')
  })

  it('uses stacked bar options for stacked-bar chart', () => {
    const wrapper = shallowMount(KChart, {
      props: {
        data: mockChartData,
        type: 'stacked-bar',
      },
    })

    const vm = wrapper.vm as any
    expect(vm.chartOptions.scales?.x?.stacked).toBe(true)
  })

  it('uses line options for line chart', () => {
    const wrapper = shallowMount(KChart, {
      props: {
        data: mockChartData,
        type: 'line',
      },
    })

    const vm = wrapper.vm as any
    expect(vm.chartOptions).toHaveProperty('responsive')
  })

  it('uses radar options for radar chart', () => {
    const wrapper = shallowMount(KChart, {
      props: {
        data: mockChartData,
        type: 'radar',
      },
    })

    const vm = wrapper.vm as any
    expect(vm.chartOptions).toHaveProperty('plugins')
    expect(vm.chartOptions.plugins.legend.position).toBe('top')
  })

  it('applies auto-coloring to datasets without backgroundColor', () => {
    const dataWithoutColors: ChartData = {
      labels: ['A', 'B', 'C'],
      datasets: [
        {
          label: 'Dataset 1',
          data: [10, 20, 30],
        },
        {
          label: 'Dataset 2',
          data: [15, 25, 35],
        },
      ],
    }

    const wrapper = shallowMount(KChart, {
      props: {
        data: dataWithoutColors,
        type: 'bar',
      },
    })

    const vm = wrapper.vm as any
    expect(vm.chartData.datasets[0]).toHaveProperty('backgroundColor')
    expect(vm.chartData.datasets[1]).toHaveProperty('backgroundColor')
  })

  it('preserves existing colors when provided', () => {
    const wrapper = shallowMount(KChart, {
      props: {
        data: mockChartData,
        type: 'bar',
      },
    })

    const vm = wrapper.vm as any
    expect(vm.chartData.datasets[0].backgroundColor).toBe('#ff6384')
    expect(vm.chartData.datasets[1].backgroundColor).toBe('#36a2eb')
  })

  it('handles line chart styling correctly', () => {
    const lineChartData: ChartData = {
      labels: ['A', 'B', 'C'],
      datasets: [
        {
          label: 'Line 1',
          data: [10, 20, 30],
          type: 'line',
        },
      ],
    }

    const wrapper = shallowMount(KChart, {
      props: {
        data: lineChartData,
        type: 'line',
      },
    })

    const vm = wrapper.vm as any
    const dataset = vm.chartData.datasets[0]
    expect(dataset.backgroundColor).toBe('transparent')
    expect(dataset.tension).toBe(0.3)
    expect(dataset.pointRadius).toBe(4)
  })

  it('handles area chart styling correctly', () => {
    const areaChartData: ChartData = {
      labels: ['A', 'B', 'C'],
      datasets: [
        {
          label: 'Area 1',
          data: [10, 20, 30],
        },
      ],
    }

    const wrapper = shallowMount(KChart, {
      props: {
        data: areaChartData,
        type: 'area',
      },
    })

    const vm = wrapper.vm as any
    const dataset = vm.chartData.datasets[0]
    expect(dataset.fill).toBe(true)
    expect(dataset.tension).toBe(0.3)
  })

  it('handles combo chart options correctly', () => {
    const wrapper = shallowMount(KChart, {
      props: {
        data: mockChartData,
        type: 'combo',
      },
    })

    const vm = wrapper.vm as any
    expect(vm.chartOptions.scales?.x?.stacked).toBe(false)
    expect(vm.chartOptions.scales?.y?.beginAtZero).toBe(true)
  })

  it('transforms chart data with correct structure', () => {
    const wrapper = shallowMount(KChart, {
      props: {
        data: mockChartData,
      },
    })

    const vm = wrapper.vm as any
    expect(vm.chartData.labels).toEqual(['Jan', 'Feb', 'Mar', 'Apr'])
    expect(vm.chartData.datasets).toHaveLength(2)
    expect(vm.chartData.datasets[0]).toHaveProperty('label')
    expect(vm.chartData.datasets[0]).toHaveProperty('data')
  })

  it('handles dataset without type attribute', () => {
    const dataWithoutType: ChartData = {
      labels: ['A', 'B', 'C'],
      datasets: [
        {
          label: 'Dataset',
          data: [10, 20, 30],
        },
      ],
    }

    const wrapper = shallowMount(KChart, {
      props: {
        data: dataWithoutType,
        type: 'bar',
      },
    })

    const vm = wrapper.vm as any
    expect(vm.chartData.datasets[0]).toHaveProperty('backgroundColor')
    expect(vm.chartData.datasets[0]).toHaveProperty('borderColor')
  })

  it('returns empty chart data when data is null', () => {
    const wrapper = shallowMount(KChart, {
      props: {
        data: null,
      },
    })

    const vm = wrapper.vm as any
    expect(vm.chartData.labels).toEqual([])
    expect(vm.chartData.datasets).toEqual([])
  })

  it('applies border width to datasets', () => {
    const wrapper = shallowMount(KChart, {
      props: {
        data: mockChartData,
        type: 'bar',
      },
    })

    const vm = wrapper.vm as any
    expect(vm.chartData.datasets[0].borderWidth).toBe(2)
    expect(vm.chartData.datasets[1].borderWidth).toBe(2)
  })

  it('handles multiple datasets with different types', () => {
    const mixedDatasets: ChartData = {
      labels: ['A', 'B', 'C'],
      datasets: [
        {
          label: 'Bar',
          data: [10, 20, 30],
        },
        {
          label: 'Line',
          data: [15, 25, 35],
          type: 'line',
        },
      ],
    }

    const wrapper = shallowMount(KChart, {
      props: {
        data: mixedDatasets,
        type: 'combo',
      },
    })

    const vm = wrapper.vm as any
    expect(vm.chartData.datasets).toHaveLength(2)
    expect(vm.chartData.datasets[0].backgroundColor).not.toBe('transparent')
    expect(vm.chartData.datasets[1].backgroundColor).toBe('transparent')
  })
})
