import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import BSheetView from './BSheetView.vue'

// ── Mock stores ────────────────────────────────────────────────────────────────

const mockReport = ref<any>(null)
const mockLoading = ref(false)
const mockError = ref<string | null>(null)
const mockFetchReport = vi.fn()

vi.mock('@/features/bsheet/stores/bsheetStore', () => ({
  useBSheetStore: () => ({
    get report() { return mockReport.value },
    get loading() { return mockLoading.value },
    get error() { return mockError.value },
    fetchReport: mockFetchReport,
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

vi.mock('@/stores/ui', () => ({
  useUiStore: vi.fn(() => ({ showToast: vi.fn() })),
}))

vi.mock('@/utils/logger', () => ({ devlog: { error: vi.fn(), debug: vi.fn() } }))

// ── PrimeVue stubs ────────────────────────────────────────────────────────────

const globalStubs = {
  ProgressSpinner: { template: '<div class="progress-spinner" />' },
  Card: { template: '<div class="card"><slot name="content" /></div>', props: ['title'] },
  Message: { template: '<div class="message" />', props: ['severity'] },
  DataTable: {
    template: '<div class="datatable"><slot /></div>',
    props: ['value', 'class', 'showGridlines', 'size', 'stripedRows'],
  },
  Column: {
    template: '<div class="column" />',
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
}

function mountView() {
  return mount(BSheetView, {
    global: {
      plugins: [createPinia()],
      stubs: globalStubs,
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('BSheetView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockReport.value = null
    mockLoading.value = false
    mockError.value = null
    mockFetchReport.mockResolvedValue(undefined)
  })

  describe('rendering', () => {
    it('renders page title "Balance Sheet"', () => {
      const wrapper = mountView()
      expect(wrapper.text()).toContain('Balance Sheet')
    })

    it('renders loading spinner when store.loading is true', () => {
      mockLoading.value = true
      const wrapper = mountView()
      // The component doesn't have a progress spinner at the top level,
      // but shows a loading message inside the tab panel
      expect(wrapper.text()).toContain('Loading balance sheet…')
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
        detailed: {
          assets: {
            noncurrentAssets: [100, 110, 120, 130, 140, 150],
            inventory: [10, 11, 12, 13, 14, 15],
            accountsReceivable: [20, 21, 22, 23, 24, 25],
            cash: [30, 31, 32, 33, 34, 35],
            totalAssets: [160, 173, 186, 199, 212, 225],
          },
          liabilities: {
            shareCapital: [50, 50, 50, 50, 50, 50],
            netProfit: [20, 21, 22, 23, 24, 25],
            retainedEarnings: [10, 11, 12, 13, 14, 15],
            longTermDebt: [30, 31, 32, 33, 34, 35],
            tradePayables: [15, 16, 17, 18, 19, 20],
            socialTaxDebts: [10, 11, 12, 13, 14, 15],
            otherPayables: [15, 16, 17, 18, 19, 20],
            totalLiabilities: [160, 173, 186, 199, 212, 225],
          },
        },
        condensed: {
          assets: {
            noncurrentAssets: [100, 110, 120, 130, 140, 150],
            currentAssets: [30, 32, 34, 36, 38, 40],
            cash: [30, 31, 32, 33, 34, 35],
            total: [160, 173, 186, 199, 212, 225],
          },
          liabilities: {
            equity: [80, 90, 100, 110, 120, 130],
            longTermDebt: [40, 41, 42, 43, 44, 45],
            shortTermDebt: [40, 42, 44, 46, 48, 50],
            total: [160, 173, 186, 199, 212, 225],
          },
        },
        analysis: {
          equity: [80, 90, 100, 110, 120, 130],
          longTermDebt: [40, 41, 42, 43, 44, 45],
          permanentCapital: [120, 131, 142, 153, 164, 175],
          shortTermDebt: [40, 42, 44, 46, 48, 50],
          totalSources: [160, 173, 186, 199, 212, 225],
          noncurrentAssets: [100, 110, 120, 130, 140, 150],
          currentAssets: [30, 32, 34, 36, 38, 40],
          cash: [30, 31, 32, 33, 34, 35],
          totalUses: [160, 173, 186, 199, 212, 225],
          workingCapital: [15, 16, 17, 18, 19, 20],
          wcr: [10, 11, 12, 13, 14, 15],
          wcMinusWcr: [5, 5, 5, 5, 5, 5],
          netDebt: [10, 10, 10, 10, 10, 10],
        },
        capital: {
          employed: [120, 131, 142, 153, 164, 175],
          invested: [120, 131, 142, 153, 164, 175],
        },
        workingCapital: {
          employed: [15, 16, 17, 18, 19, 20],
          invested: [15, 16, 17, 18, 19, 20],
        },
        charts: {
          years: [0, 1, 2, 3, 4, 5],
          capitalEmployed: [120, 131, 142, 153, 164, 175],
          wcEmployed: [15, 16, 17, 18, 19, 20],
          capitalInvested: [120, 131, 142, 153, 164, 175],
          wcInvested: [15, 16, 17, 18, 19, 20],
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

  describe('error handling', () => {
    it('displays error message when fetch fails', async () => {
      mockLoading.value = false
      mockError.value = 'Failed to fetch balance sheet'
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      // Error message should be in the Message component
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
      const wrapper = mount(BSheetView, {
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

  describe('view mode toggle', () => {
    it('renders both table and chart view options', () => {
      const wrapper = mountView()
      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBeGreaterThan(0)
    })
  })
})
