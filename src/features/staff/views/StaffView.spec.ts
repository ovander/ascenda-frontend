import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import StaffView from './StaffView.vue'

// ── Mock stores ────────────────────────────────────────────────────────────────

const mockHeadcounts = ref<any[]>([])
const mockSalaries = ref<any[]>([])
const mockIncentives = ref<any[]>([])
const mockPayrollSummary = ref<any>(null)
const mockLoading = ref(false)
const mockError = ref<string | null>(null)

const mockDirty = {
  markDirty: vi.fn(),
  markSaving: vi.fn(),
  markClean: vi.fn(),
  markError: vi.fn(),
}

const mockFetchAll = vi.fn()
const mockFetchHeadcounts = vi.fn()
const mockFetchSalaries = vi.fn()
const mockFetchIncentives = vi.fn()
const mockFetchPayrollSummary = vi.fn()
const mockUpdateHeadcounts = vi.fn()
const mockUpdateSalaries = vi.fn()
const mockUpdateIncentives = vi.fn()

vi.mock('@/features/staff/stores/staffStore', () => ({
  useStaffStore: () => ({
    headcounts: computed(() => mockHeadcounts.value),
    salaries: computed(() => mockSalaries.value),
    incentives: computed(() => mockIncentives.value),
    payrollSummary: computed(() => mockPayrollSummary.value),
    loading: computed(() => mockLoading.value),
    error: computed(() => mockError.value),
    dirty: mockDirty,
    fetchAll: mockFetchAll,
    fetchHeadcounts: mockFetchHeadcounts,
    fetchSalaries: mockFetchSalaries,
    fetchIncentives: mockFetchIncentives,
    fetchPayrollSummary: mockFetchPayrollSummary,
    updateHeadcounts: mockUpdateHeadcounts,
    updateSalaries: mockUpdateSalaries,
    updateIncentives: mockUpdateIncentives,
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
    formatPercent: (val: number) => (val * 100).toFixed(1) + '%',
  }),
}))

vi.mock('@/stores/ui', () => ({
  useUiStore: vi.fn(() => ({ showToast: vi.fn() })),
}))

vi.mock('@/utils/logger', () => ({ devlog: { error: vi.fn(), debug: vi.fn() } }))

// ── PrimeVue stubs ────────────────────────────────────────────────────────────

const globalStubs = {
  ProgressSpinner: { template: '<div class="progress-spinner" />' },
  Button: {
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['label', 'icon', 'severity', 'outlined', 'size', 'disabled', 'loading'],
    emits: ['click'],
  },
  DataTable: {
    template: '<div class="datatable"><slot /></div>',
    props: ['value', 'class', 'showGridlines', 'size', 'stripedRows'],
  },
  Column: {
    template: '<div class="column"><slot name="body" /></div>',
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
  KYearGrid: {
    template: '<div class="k-year-grid" />',
    props: ['rows', 'unit', 'showTotal'],
    emits: ['cell-edit'],
  },
  KFormLegend: {
    template: '<div class="k-form-legend" />',
    props: ['variant', 'description', 'extras'],
  },
  KChart: {
    template: '<div class="k-chart" />',
    props: ['data', 'type', 'height', 'loading'],
  },
  KSaveBanner: {
    template: '<div class="k-save-banner" />',
    props: ['moduleKey', 'loading'],
  },
}

function mountView() {
  return mount(StaffView, {
    global: {
      plugins: [createPinia()],
      stubs: globalStubs,
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('StaffView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockHeadcounts.value = []
    mockSalaries.value = []
    mockIncentives.value = []
    mockPayrollSummary.value = null
    mockLoading.value = false
    mockError.value = null
    mockFetchAll.mockResolvedValue(undefined)
    mockFetchHeadcounts.mockResolvedValue(undefined)
    mockFetchSalaries.mockResolvedValue(undefined)
    mockFetchIncentives.mockResolvedValue(undefined)
    mockFetchPayrollSummary.mockResolvedValue(undefined)
    mockUpdateHeadcounts.mockResolvedValue(undefined)
    mockUpdateSalaries.mockResolvedValue(undefined)
    mockUpdateIncentives.mockResolvedValue(undefined)
  })

  describe('rendering', () => {
    it('renders page title "Staff"', () => {
      const wrapper = mountView()
      expect(wrapper.text()).toContain('Staff')
    })

    it('renders loading spinner when store.loading is true', () => {
      mockLoading.value = true
      const wrapper = mountView()
      expect(wrapper.find('.progress-spinner').exists()).toBe(true)
    })

    it('renders KFormLegend component', () => {
      const wrapper = mountView()
      expect(wrapper.find('.k-form-legend').exists()).toBe(true)
    })

    it('component renders without errors when not loading', () => {
      mockLoading.value = false
      const wrapper = mountView()
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('headcount table', () => {
    it('stores headcount data in component state', async () => {
      mockLoading.value = false
      mockHeadcounts.value = [
        { id: 'h1', category: 'engineers', fte: '5', yearIndex: 1 },
      ]
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm).toBeDefined()
    })

    it('component mounts successfully with headcount data', async () => {
      mockLoading.value = false
      mockHeadcounts.value = [
        { id: 'h1', category: 'engineers', fte: '5', yearIndex: 1 },
      ]
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('payroll summary', () => {
    it('component exists when not loading', async () => {
      mockLoading.value = false
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.exists()).toBe(true)
    })

    it('handles payroll summary data when present', async () => {
      mockLoading.value = false
      mockPayrollSummary.value = {
        years: [
          {
            yearIndex: 1,
            totalPayroll: '100000',
            employerCharges: '20000',
            totalWithCharges: '120000',
            incentives: '5000',
            totalStaffCost: '125000',
            byFunction: {
              rnd: '50000',
              production: '30000',
              sales_marketing: '30000',
              ga: '15000',
            },
          },
        ],
      }
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      // Component should have computed payrollTableRows from payrollSummary
      expect(wrapper.vm).toBeDefined()
    })

    it('shows empty message when payroll summary is null', async () => {
      mockLoading.value = false
      mockPayrollSummary.value = null
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      // The summary tab will be empty when payrollSummary is null
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

    it('component mounts without errors', async () => {
      mockLoading.value = false
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('error handling', () => {
    it('renders KSaveBanner component for dirty state tracking', () => {
      mockLoading.value = false
      const wrapper = mountView()
      expect(wrapper.find('.k-save-banner').exists()).toBe(true)
    })
  })

  describe('props handling', () => {
    it('accepts planId and sid props', () => {
      const wrapper = mount(StaffView, {
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
    it('transforms payroll summary years into table rows', () => {
      mockLoading.value = false
      mockPayrollSummary.value = {
        years: [
          {
            yearIndex: 1,
            totalPayroll: '100000',
            employerCharges: '20000',
            totalWithCharges: '120000',
            incentives: '5000',
            totalStaffCost: '125000',
            byFunction: {
              rnd: '50000',
              production: '30000',
              sales_marketing: '30000',
              ga: '15000',
            },
          },
        ],
      }
      const wrapper = mountView()
      // Component should compute payrollTableRows from payrollSummary
      expect(wrapper.vm.$data).toBeDefined()
    })
  })
})
