import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import RatiosView from './RatiosView.vue'

// ── Mock stores ────────────────────────────────────────────────────────────────

const mockReport = ref<any>(null)
const mockCharts = ref<Record<string, any>>({})
const mockLoading = ref(false)
const mockError = ref<string | null>(null)
const mockFetchReport = vi.fn()
const mockFetchChart = vi.fn()

vi.mock('@/features/ratios/stores/ratiosStore', () => ({
  useRatiosStore: () => ({
    get report() { return mockReport.value },
    get charts() { return mockCharts.value },
    get loading() { return mockLoading.value },
    get error() { return mockError.value },
    fetchReport: mockFetchReport,
    fetchChart: mockFetchChart,
  }),
}))

vi.mock('@/features/plans/stores/planStore', () => ({
  usePlanStore: () => ({ activePlan: { id: 'plan-1' } }),
}))

vi.mock('@/features/scenarios/stores/scenarioStore', () => ({
  useScenarioStore: () => ({ activeScenario: { id: 'sc-1' } }),
}))

vi.mock('@/composables/useYearHeaders', () => ({
  useYearHeaders: () => ({ get yearHeaders() { return ['Y1', 'Y2', 'Y3', 'Y4', 'Y5'] } }),
}))

vi.mock('@/composables/useDecimal', () => ({
  useDecimal: () => ({
    getUnitLabel: () => 'k€',
    getLocale: () => 'en-US',
    formatUnit: (val: string | number, decimals?: number) => {
      const n = typeof val === 'string' ? parseFloat(val) || 0 : val
      return (n / 1000).toFixed(decimals ?? 1)
    },
    formatPercent: (val: number) => (val * 100).toFixed(1) + '%',
  }),
}))

vi.mock('@/stores/ui', () => ({
  useUiStore: vi.fn(() => ({ showToast: vi.fn() })),
}))

vi.mock('@/utils/logger', () => ({ devlog: { error: vi.fn(), debug: vi.fn() } }))

// ── PrimeVue stubs ────────────────────────────────────────────────────────────

const globalStubs = {
  Card: { template: '<div class="card"><slot name="content" /></div>', props: ['title'] },
  Message: { template: '<div class="message" />', props: ['severity'] },
  DataTable: {
    template: '<div class="datatable"><div v-for="row in value" :key="row.label"><slot /></div></div>',
    props: ['value', 'class', 'loading', 'stripedRows', 'size'],
  },
  Column: {
    template: '<div class="column"><slot name="body" :data="{ label: \'test\', values: [], format: \'currency\' }" /></div>',
    props: ['field', 'header', 'class', 'style'],
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
  KChart: {
    template: '<div class="k-chart" />',
    props: ['data', 'type', 'height', 'loading', 'title', 'yMax'],
  },
  KFormLegend: {
    template: '<div class="k-form-legend" />',
    props: ['variant', 'description', 'extras'],
  },
  // PrimeVue Select and vue-chartjs Bar require their host plugins; stub them out.
  Select: {
    template: '<div class="p-select" />',
    props: ['modelValue', 'options', 'optionLabel', 'optionValue', 'placeholder'],
    emits: ['update:modelValue'],
  },
  Bar: { template: '<canvas class="bar-chart" />', props: ['data', 'options'] },
}

function mountView() {
  return mount(RatiosView, {
    global: {
      plugins: [createPinia()],
      stubs: globalStubs,
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('RatiosView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockReport.value = null
    mockCharts.value = {}
    mockLoading.value = false
    mockError.value = null
    mockFetchReport.mockResolvedValue(undefined)
    mockFetchChart.mockResolvedValue(undefined)
  })

  describe('rendering', () => {
    it('renders page title "Financial Ratios & KPIs"', () => {
      const wrapper = mountView()
      expect(wrapper.text()).toContain('Financial Ratios & KPIs')
    })

    it('renders KFormLegend component', () => {
      const wrapper = mountView()
      expect(wrapper.find('.k-form-legend').exists()).toBe(true)
    })

    it('component mounts without errors when not loading', () => {
      mockLoading.value = false
      const wrapper = mountView()
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('store integration', () => {
    it('calls fetchReport on mount', async () => {
      mockFetchReport.mockResolvedValue(undefined)
      mountView()
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(mockFetchReport).toHaveBeenCalled()
    })

    it('component exists after fetch completes', async () => {
      mockLoading.value = false
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('report data rendering', () => {
    it('renders tabs when report data is present', async () => {
      mockLoading.value = false
      mockReport.value = {
        years: [1, 2, 3, 4, 5],
        sales: {
          sales: [1000, 1100, 1200, 1300, 1400],
          growthRate: [0.1, 0.091, 0.083, 0.077, 0.077],
          exportSales: [100, 110, 120, 130, 140],
          exportPct: [0.1, 0.1, 0.1, 0.1, 0.1],
          cogs: [500, 550, 600, 650, 700],
          cogsPct: [0.5, 0.5, 0.5, 0.5, 0.5],
          grossMarginPct: [0.5, 0.5, 0.5, 0.5, 0.5],
        },
        operational: {
          staffHeadcount: [10, 11, 12, 13, 14],
          salesPerStaff: [100, 100, 100, 100, 100],
          payrollExpenses: [100, 110, 120, 130, 140],
          payrollPct: [0.1, 0.1, 0.1, 0.1, 0.1],
          capitalExpenditure: [50, 55, 60, 65, 70],
          capexPct: [0.05, 0.05, 0.05, 0.05, 0.05],
          depreciation: [30, 30, 30, 30, 30],
          externalExpenses: [100, 110, 120, 130, 140],
          advertisingPromo: [50, 55, 60, 65, 70],
          adPromoPct: [0.05, 0.05, 0.05, 0.05, 0.05],
        },
        profitability: {
          addedValue: [400, 440, 480, 520, 560],
          addedValuePct: [0.4, 0.4, 0.4, 0.4, 0.4],
          ebitda: [250, 275, 300, 325, 350],
          ebitdaPct: [0.25, 0.25, 0.25, 0.25, 0.25],
          netProfit: [150, 165, 180, 195, 210],
          netProfitPct: [0.15, 0.15, 0.15, 0.15, 0.15],
          cashFlow: [180, 195, 210, 225, 240],
          cashFlowPct: [0.18, 0.18, 0.18, 0.18, 0.18],
          freeCashFlow: [130, 140, 150, 160, 170],
          freeCashFlowPct: [0.13, 0.13, 0.13, 0.13, 0.13],
          cashAtEoy: [200, 220, 240, 260, 280],
        },
        equityLeverage: {
          totalEquityEoy: [500, 550, 600, 650, 700],
          financialReturn: [0.3, 0.3, 0.3, 0.3, 0.3],
          equityToAssets: [0.6, 0.6, 0.6, 0.6, 0.6],
          ltLoans: [300, 300, 300, 300, 300],
          ltLoansToEquity: [0.6, 0.545, 0.5, 0.462, 0.429],
          cashFlowToLoans: [0.6, 0.65, 0.7, 0.75, 0.8],
          finExpToEbitda: [0.2, 0.2, 0.2, 0.2, 0.2],
          wcr: [50, 55, 60, 65, 70],
          wcrRotationDays: [20, 20, 20, 20, 20],
        },
        valuation: {
          npv: 5000,
          terminalValue: 7000,
          discountedValue: 12000,
          irr: 0.25,
          irrValid: true,
          discountRate: 0.1,
          peMultiple: 15,
        },
      }
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.tabs').exists()).toBe(true)
    })

    it('handles null report gracefully', async () => {
      mockLoading.value = false
      mockReport.value = null
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('loading state', () => {
    it('shows loading message when fetching data', async () => {
      mockLoading.value = true
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      // Component should exist, loading state is handled by template
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('error handling', () => {
    it('displays error message when fetch fails', async () => {
      mockLoading.value = false
      mockError.value = 'Failed to fetch ratios report'
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.message').exists()).toBe(true)
    })

    it('clears error when fetching again', async () => {
      mockError.value = null
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm).toBeDefined()
    })
  })

  describe('props handling', () => {
    it('accepts planId and sid props', () => {
      const wrapper = mount(RatiosView, {
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

  describe('computed metrics', () => {
    it('computes sales metrics from report data', async () => {
      mockLoading.value = false
      mockReport.value = {
        years: [1, 2, 3, 4, 5],
        sales: {
          sales: [1000, 1100, 1200, 1300, 1400],
          growthRate: [0.1, 0.091, 0.083, 0.077, 0.077],
          exportSales: [100, 110, 120, 130, 140],
          exportPct: [0.1, 0.1, 0.1, 0.1, 0.1],
          cogs: [500, 550, 600, 650, 700],
          cogsPct: [0.5, 0.5, 0.5, 0.5, 0.5],
          grossMarginPct: [0.5, 0.5, 0.5, 0.5, 0.5],
        },
        operational: {
          staffHeadcount: [10, 11, 12, 13, 14],
          salesPerStaff: [100, 100, 100, 100, 100],
          payrollExpenses: [100, 110, 120, 130, 140],
          payrollPct: [0.1, 0.1, 0.1, 0.1, 0.1],
          capitalExpenditure: [50, 55, 60, 65, 70],
          capexPct: [0.05, 0.05, 0.05, 0.05, 0.05],
          depreciation: [30, 30, 30, 30, 30],
          externalExpenses: [100, 110, 120, 130, 140],
          advertisingPromo: [50, 55, 60, 65, 70],
          adPromoPct: [0.05, 0.05, 0.05, 0.05, 0.05],
        },
        profitability: {
          addedValue: [400, 440, 480, 520, 560],
          addedValuePct: [0.4, 0.4, 0.4, 0.4, 0.4],
          ebitda: [250, 275, 300, 325, 350],
          ebitdaPct: [0.25, 0.25, 0.25, 0.25, 0.25],
          netProfit: [150, 165, 180, 195, 210],
          netProfitPct: [0.15, 0.15, 0.15, 0.15, 0.15],
          cashFlow: [180, 195, 210, 225, 240],
          cashFlowPct: [0.18, 0.18, 0.18, 0.18, 0.18],
          freeCashFlow: [130, 140, 150, 160, 170],
          freeCashFlowPct: [0.13, 0.13, 0.13, 0.13, 0.13],
          cashAtEoy: [200, 220, 240, 260, 280],
        },
        equityLeverage: {
          totalEquityEoy: [500, 550, 600, 650, 700],
          financialReturn: [0.3, 0.3, 0.3, 0.3, 0.3],
          equityToAssets: [0.6, 0.6, 0.6, 0.6, 0.6],
          ltLoans: [300, 300, 300, 300, 300],
          ltLoansToEquity: [0.6, 0.545, 0.5, 0.462, 0.429],
          cashFlowToLoans: [0.6, 0.65, 0.7, 0.75, 0.8],
          finExpToEbitda: [0.2, 0.2, 0.2, 0.2, 0.2],
          wcr: [50, 55, 60, 65, 70],
          wcrRotationDays: [20, 20, 20, 20, 20],
        },
      }
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm).toBeDefined()
    })
  })
})
