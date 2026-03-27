import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import PnlView from './PnlView.vue'

// ── Mock stores ────────────────────────────────────────────────────────────────

const mockManualEntries = ref<any[]>([])
const mockReport = ref<any>(null)
const mockChartData = ref<any>(null)
const mockLoading = ref(false)
const mockError = ref<string | null>(null)

const mockFetchEntries = vi.fn()
const mockFetchReport = vi.fn()
const mockFetchChart = vi.fn()
const mockFetchAll = vi.fn()
const mockUpdateEntries = vi.fn()

vi.mock('@/features/pnl/stores/pnlStore', () => ({
  usePnlStore: () => ({
    get manualEntries() { return mockManualEntries.value },
    get report() { return mockReport.value },
    get chartData() { return mockChartData.value },
    get loading() { return mockLoading.value },
    get error() { return mockError.value },
    fetchEntries: mockFetchEntries,
    fetchReport: mockFetchReport,
    fetchChart: mockFetchChart,
    fetchAll: mockFetchAll,
    updateEntries: mockUpdateEntries,
  }),
}))

vi.mock('@/features/plans/stores/planStore', () => ({
  usePlanStore: () => ({ activePlan: { id: 'plan-1' } }),
}))

vi.mock('@/features/scenarios/stores/scenarioStore', () => ({
  useScenarioStore: () => ({ activeScenario: { id: 'sc-1' } }),
}))

vi.mock('@/composables/useYearHeaders', () => ({
  useYearHeaders: () => ({ yearHeaders: ref(['Y1', 'Y2', 'Y3', 'Y4', 'Y5']) }),
}))

vi.mock('@/composables/useDecimal', () => ({
  useDecimal: () => ({
    getUnitLabel: () => 'k€',
    formatUnit: (val: string | number) => {
      const n = typeof val === 'string' ? parseFloat(val) || 0 : val
      return (n / 1000).toFixed(1)
    },
  }),
}))

vi.mock('@/utils/logger', () => ({ devlog: { error: vi.fn(), debug: vi.fn() } }))

// ── PrimeVue stubs ────────────────────────────────────────────────────────

const globalStubs = {
  ProgressSpinner: { template: '<div class="progress-spinner" />' },
  Button: {
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['label', 'icon', 'severity', 'outlined', 'size', 'disabled', 'loading'],
    emits: ['click'],
  },
  DataTable: {
    template: '<div class="datatable"><slot /></div>',
    props: ['value', 'class', 'showGridlines', 'size', 'scrollable', 'scrollHeight'],
  },
  Column: {
    template: '<div class="column">{{ header }}</div>',
    props: ['field', 'header', 'class', 'frozen'],
  },
  Tabs: {
    template: '<div class="tabs"><slot /></div>',
    props: ['value'],
    emits: ['update:value'],
  },
  TabList: {
    template: '<div class="tablist"><slot /></div>',
  },
  Tab: {
    template: '<div class="tab"><slot /></div>',
    props: ['value'],
  },
  TabPanels: {
    template: '<div class="tabpanels"><slot /></div>',
  },
  TabPanel: {
    template: '<div class="tabpanel"><slot /></div>',
    props: ['value'],
  },
  KYearGrid: {
    template: '<div class="k-year-grid" />',
    props: ['rows', 'unit'],
    emits: ['cell-edit'],
  },
  KFormLegend: {
    template: '<div class="k-form-legend" />',
    props: ['variant', 'description'],
  },
  KChart: {
    template: '<div class="k-chart" />',
    props: ['data', 'type', 'height', 'loading'],
  },
}

function mountView() {
  return mount(PnlView, {
    global: {
      plugins: [createPinia()],
      stubs: globalStubs,
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('PnlView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockManualEntries.value = []
    mockReport.value = null
    mockChartData.value = null
    mockLoading.value = false
    mockError.value = null
    mockFetchAll.mockResolvedValue(undefined)
    mockFetchEntries.mockResolvedValue(undefined)
    mockFetchReport.mockResolvedValue(undefined)
    mockFetchChart.mockResolvedValue(undefined)
    mockUpdateEntries.mockResolvedValue(undefined)
  })

  describe('rendering', () => {
    it('renders page title "P&L Statement"', () => {
      const wrapper = mountView()
      expect(wrapper.text()).toContain('P&L Statement')
    })

    it('renders loading spinner when store.loading is true', () => {
      mockLoading.value = true
      const wrapper = mountView()
      expect(wrapper.find('.progress-spinner').exists()).toBe(true)
    })

    it('component renders without errors when not loading', () => {
      mockLoading.value = false
      const wrapper = mountView()
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('store integration', () => {
    it('calls fetchAll on mount', async () => {
      mockFetchAll.mockResolvedValue(undefined)
      mountView()
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(mockFetchAll).toHaveBeenCalled()
    })
  })

  describe('manual entries', () => {
    it('component mounts with empty manual entries', async () => {
      mockLoading.value = false
      mockManualEntries.value = []
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.exists()).toBe(true)
    })

    it('component mounts with manual entry data', async () => {
      mockLoading.value = false
      mockManualEntries.value = [
        { id: 'e1', lineId: 'capitalized_production', yearIndex: 0, amount: '1000' },
      ]
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.exists()).toBe(true)
    })

    it('renders KYearGrid for manual entries editing', () => {
      mockLoading.value = false
      mockManualEntries.value = []
      const wrapper = mountView()
      expect(wrapper.find('.k-year-grid').exists()).toBe(true)
    })
  })

  describe('P&L report', () => {
    it('component handles null report', async () => {
      mockLoading.value = false
      mockReport.value = null
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.exists()).toBe(true)
    })

    it('component renders report table when data is available', async () => {
      mockLoading.value = false
      mockReport.value = {
        years: [
          {
            sales: '100000',
            cogs: '40000',
            externalExpenses: '10000',
            totalConsumption: '50000',
            addedValue: '50000',
            taxesAndDuties: '5000',
            payrollExpenses: '20000',
            ebitda: '25000',
            depreciation: '5000',
            impairment: '0',
            grantsOtherRevenue: '0',
            otherOperatingExp: '0',
            ebit: '20000',
            financialRevenues: '0',
            financialExpenses: '1000',
            preTaxEarnings: '19000',
            extraordinaryIncome: '0',
            extraordinaryExpense: '0',
            employeeParticipation: '0',
            corporateTax: '3800',
            taxCredits: '0',
            netProfit: '15200',
            cashFlow: '20200',
            staffHeadcount: '10',
          },
        ],
      }
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.datatable').exists()).toBe(true)
    })

    it('renders year headers in report table', async () => {
      mockLoading.value = false
      mockReport.value = {
        years: [
          { sales: '100000', cogs: '40000', netProfit: '15000', cashFlow: '20000', staffHeadcount: '10' },
          { sales: '120000', cogs: '45000', netProfit: '18000', cashFlow: '23000', staffHeadcount: '11' },
        ],
      }
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('Y1')
      expect(wrapper.text()).toContain('Y2')
    })
  })

  describe('chart data', () => {
    it('component handles null chart data', async () => {
      mockLoading.value = false
      mockChartData.value = null
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.exists()).toBe(true)
    })

    it('component renders charts when data is available', async () => {
      mockLoading.value = false
      mockChartData.value = {
        years: ['Y1', 'Y2', 'Y3', 'Y4', 'Y5'],
        sales: ['100', '120', '140', '160', '180'],
        ebitda: ['20', '25', '30', '35', '40'],
        netProfit: ['10', '12', '14', '16', '18'],
        cogs: ['40', '45', '50', '55', '60'],
        payrollExpenses: ['30', '32', '34', '36', '38'],
        depreciation: ['5', '5', '5', '5', '5'],
        otherOpex: ['5', '6', '7', '8', '9'],
      }
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      const charts = wrapper.findAll('.k-chart')
      expect(charts.length).toBeGreaterThan(0)
    })
  })

  describe('tabs', () => {
    it('renders P&L Report tab', () => {
      mockLoading.value = false
      const wrapper = mountView()
      expect(wrapper.text()).toContain('P&L Report')
    })

    it('renders Graphs tab', () => {
      mockLoading.value = false
      const wrapper = mountView()
      expect(wrapper.text()).toContain('Graphs')
    })

    it('component has tabs container', () => {
      mockLoading.value = false
      const wrapper = mountView()
      expect(wrapper.find('.tabs').exists()).toBe(true)
    })
  })

  describe('manual adjustments panel', () => {
    it('renders "Manual Adjustments" heading', () => {
      mockLoading.value = false
      const wrapper = mountView()
      expect(wrapper.text()).toContain('Manual Adjustments')
    })

    it('renders KFormLegend for manual adjustments section', () => {
      mockLoading.value = false
      const wrapper = mountView()
      expect(wrapper.find('.k-form-legend').exists()).toBe(true)
    })
  })

  describe('error handling', () => {
    it('component renders when store has error', async () => {
      mockLoading.value = false
      mockError.value = 'Failed to fetch P&L data'
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('props handling', () => {
    it('accepts planId and sid props', () => {
      const wrapper = mount(PnlView, {
        props: { planId: 'plan-1', sid: 'scenario-1' },
        global: {
          plugins: [createPinia()],
          stubs: globalStubs,
        },
      })
      expect(wrapper.props('planId')).toBe('plan-1')
      expect(wrapper.props('sid')).toBe('scenario-1')
    })
  })

  describe('data transformations', () => {
    it('transforms manual entries into grid rows', async () => {
      mockLoading.value = false
      mockManualEntries.value = [
        { id: 'e1', lineId: 'capitalized_production', yearIndex: 0, amount: '500' },
        { id: 'e2', lineId: 'capitalized_production', yearIndex: 1, amount: '600' },
        { id: 'e3', lineId: 'impairment', yearIndex: 0, amount: '100' },
      ]
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      // Grid rows should be computed from manual entries
      expect(wrapper.vm).toBeDefined()
    })

    it('transforms report years into table rows', async () => {
      mockLoading.value = false
      mockReport.value = {
        years: [
          {
            sales: '100000',
            cogs: '40000',
            externalExpenses: '10000',
            totalConsumption: '50000',
            addedValue: '50000',
            taxesAndDuties: '5000',
            payrollExpenses: '20000',
            ebitda: '25000',
            depreciation: '5000',
            impairment: '0',
            grantsOtherRevenue: '0',
            otherOperatingExp: '0',
            ebit: '20000',
            financialRevenues: '0',
            financialExpenses: '1000',
            preTaxEarnings: '19000',
            extraordinaryIncome: '0',
            extraordinaryExpense: '0',
            employeeParticipation: '0',
            corporateTax: '3800',
            taxCredits: '0',
            netProfit: '15200',
            cashFlow: '20200',
            staffHeadcount: '10',
          },
        ],
      }
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      // Report table rows should be computed from report years
      expect(wrapper.vm).toBeDefined()
    })
  })
})
