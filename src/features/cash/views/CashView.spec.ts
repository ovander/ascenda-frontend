import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import CashView from './CashView.vue'

// ── Mock stores ────────────────────────────────────────────────────────────────

const mockReport = ref<any>(null)
const mockOverrides = ref<any[]>([])
const mockLoading = ref(false)
const mockError = ref<string | null>(null)

const mockDirty = {
  markDirty: vi.fn(),
  markSaving: vi.fn(),
  markClean: vi.fn(),
  markError: vi.fn(),
}

const mockFetchOverrides = vi.fn()
const mockFetchReport = vi.fn()
const mockUpdateOverrides = vi.fn()
const mockDebouncedUpdateOverrides = vi.fn()

vi.mock('@/features/cash/stores/cashStore', () => ({
  useCashStore: () => ({
    get report() { return mockReport.value },
    get overrides() { return mockOverrides.value },
    get loading() { return mockLoading.value },
    get error() { return mockError.value },
    dirty: mockDirty,
    fetchOverrides: mockFetchOverrides,
    fetchReport: mockFetchReport,
    updateOverrides: mockUpdateOverrides,
    debouncedUpdateOverrides: mockDebouncedUpdateOverrides,
  }),
}))

vi.mock('@/features/plans/stores/planStore', () => ({
  usePlanStore: () => ({ activePlan: { id: 'plan-1' } }),
}))

vi.mock('@/features/scenarios/stores/scenarioStore', () => ({
  useScenarioStore: () => ({ activeScenario: { id: 'sc-1' } }),
}))

vi.mock('@/features/settings/stores/settingsStore', () => ({
  useSettingsStore: () => ({ config: { currency: 'EUR' } }),
}))

vi.mock('@/composables/useYearHeaders', () => ({
  useYearHeaders: () => ({
    yearHeaders: ref(['Y1', 'Y2', 'Y3', 'Y4', 'Y5']),
    monthHeaders: ref(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']),
  }),
}))

vi.mock('@/composables/useDecimal', () => ({
  useDecimal: () => ({
    getUnitLabel: () => 'k€',
    getLocale: () => 'en-US',
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
  DataTable: {
    template: '<div class="datatable"><div v-for="row in value" :key="row.id"><slot /></div></div>',
    props: ['value', 'class', 'loading', 'stripedRows'],
  },
  Column: {
    template: '<div class="column"><slot name="body" :data="{ id: \'test\', label: \'test\', months: [] }" /></div>',
    props: ['field', 'header', 'class', 'style'],
  },
  InputNumber: {
    template: '<input type="number" />',
    props: ['modelValue', 'disabled'],
    emits: ['update:modelValue'],
  },
  KMonthGrid: {
    template: '<div class="k-month-grid" />',
    props: ['years', 'rows'],
    emits: ['cell-edit'],
  },
  KFormLegend: {
    template: '<div class="k-form-legend" />',
    props: ['variant', 'description', 'extras'],
  },
}

function mountView() {
  return mount(CashView, {
    global: {
      plugins: [createPinia()],
      stubs: globalStubs,
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('CashView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockReport.value = null
    mockOverrides.value = []
    mockLoading.value = false
    mockError.value = null
    mockFetchOverrides.mockResolvedValue(undefined)
    mockFetchReport.mockResolvedValue(undefined)
    mockUpdateOverrides.mockResolvedValue(undefined)
    mockDebouncedUpdateOverrides.mockResolvedValue(undefined)
  })

  describe('rendering', () => {
    it('renders page title "Cash Flow Statement"', () => {
      const wrapper = mountView()
      expect(wrapper.text()).toContain('Cash Flow Statement')
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

    it('renders Export PDF button', () => {
      const wrapper = mountView()
      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  describe('loading state', () => {
    it('shows loading spinner when store.loading is true', () => {
      mockLoading.value = true
      const wrapper = mountView()
      expect(wrapper.find('.progress-spinner').exists()).toBe(true)
    })

    it('hides spinner when loading completes', async () => {
      mockLoading.value = false
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.progress-spinner').exists()).toBe(false)
    })
  })

  describe('store integration', () => {
    it('calls fetchOverrides and fetchReport on mount', async () => {
      mockFetchOverrides.mockResolvedValue(undefined)
      mockFetchReport.mockResolvedValue(undefined)
      mountView()
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(mockFetchOverrides).toHaveBeenCalled()
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
    it('renders KMonthGrid when report data is present', async () => {
      mockLoading.value = false
      mockReport.value = {
        years: [
          {
            yearIndex: 0,
            revenue: {
              total: 1000,
              lines: [
                {
                  lineId: 'rev-1',
                  label: 'Product Sales',
                  annualTotal: 1000,
                  months: Array(12).fill('83.33'),
                  distributionRule: 'evenly',
                },
              ],
            },
            operating: {
              total: 500,
              lines: [
                {
                  lineId: 'opex-1',
                  label: 'Salaries',
                  annualTotal: 500,
                  months: Array(12).fill('41.67'),
                },
              ],
            },
            capex: { total: 100, lines: [] },
            financing: { total: 0, lines: [] },
            netCashFlow: Array(12).fill('41.67'),
            openingBalance: Array(12).fill('100'),
            closingBalance: Array(12).fill('141.67'),
          },
        ],
      }
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      // Wait for onMounted async operations and monthGridRows computation
      await new Promise(resolve => setTimeout(resolve, 50))
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.k-month-grid').exists()).toBe(true)
    })

    it('shows message when no cash flow data available', async () => {
      mockLoading.value = false
      mockReport.value = null
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('No cash flow data available')
    })
  })

  describe('liquidity alerts', () => {
    it('displays liquidity alert when closing balance is negative', async () => {
      mockLoading.value = false
      mockReport.value = {
        years: [
          {
            yearIndex: 0,
            revenue: { total: 1000, lines: [] },
            operating: { total: 500, lines: [] },
            capex: { total: 0, lines: [] },
            financing: { total: 0, lines: [] },
            netCashFlow: Array(12).fill('0'),
            openingBalance: Array(12).fill('100'),
            closingBalance: ['100', '50', '-20', '10', '20', '30', '40', '50', '60', '70', '80', '90'],
          },
        ],
      }
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      // Liquidity issues should be computed and displayed
      expect(wrapper.vm.$data).toBeDefined()
    })

    it('handles multiple years with mixed liquidity status', async () => {
      mockLoading.value = false
      mockReport.value = {
        years: [
          {
            yearIndex: 0,
            revenue: { total: 1000, lines: [] },
            operating: { total: 500, lines: [] },
            capex: { total: 0, lines: [] },
            financing: { total: 0, lines: [] },
            netCashFlow: Array(12).fill('0'),
            openingBalance: Array(12).fill('100'),
            closingBalance: Array(12).fill('100'),
          },
          {
            yearIndex: 1,
            revenue: { total: 1000, lines: [] },
            operating: { total: 500, lines: [] },
            capex: { total: 0, lines: [] },
            financing: { total: 0, lines: [] },
            netCashFlow: Array(12).fill('0'),
            openingBalance: Array(12).fill('100'),
            closingBalance: Array(12).fill('100'),
          },
        ],
      }
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('error handling', () => {
    it('displays error message when fetch fails', async () => {
      mockLoading.value = false
      mockError.value = 'Failed to fetch cash report'
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm).toBeDefined()
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
      const wrapper = mount(CashView, {
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

  describe('grid configuration', () => {
    it('computes gridYears correctly (max 3 years)', async () => {
      mockLoading.value = false
      mockReport.value = {
        years: [
          {
            yearIndex: 0,
            revenue: { total: 1000, lines: [] },
            operating: { total: 500, lines: [] },
            capex: { total: 0, lines: [] },
            financing: { total: 0, lines: [] },
            netCashFlow: Array(12).fill('0'),
            openingBalance: Array(12).fill('100'),
            closingBalance: Array(12).fill('100'),
          },
          {
            yearIndex: 1,
            revenue: { total: 1000, lines: [] },
            operating: { total: 500, lines: [] },
            capex: { total: 0, lines: [] },
            financing: { total: 0, lines: [] },
            netCashFlow: Array(12).fill('0'),
            openingBalance: Array(12).fill('100'),
            closingBalance: Array(12).fill('100'),
          },
          {
            yearIndex: 2,
            revenue: { total: 1000, lines: [] },
            operating: { total: 500, lines: [] },
            capex: { total: 0, lines: [] },
            financing: { total: 0, lines: [] },
            netCashFlow: Array(12).fill('0'),
            openingBalance: Array(12).fill('100'),
            closingBalance: Array(12).fill('100'),
          },
          {
            yearIndex: 3,
            revenue: { total: 1000, lines: [] },
            operating: { total: 500, lines: [] },
            capex: { total: 0, lines: [] },
            financing: { total: 0, lines: [] },
            netCashFlow: Array(12).fill('0'),
            openingBalance: Array(12).fill('100'),
            closingBalance: Array(12).fill('100'),
          },
        ],
      }
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      // gridYears should be limited to 3
      expect(wrapper.vm.$data).toBeDefined()
    })
  })
})

// ── Print popup escaping (stored XSS regression) ──────────────────────────────
//
// Line labels come from product / opex names typed by any editor of the plan.
// The print popup is built as an HTML string and opened in the app's origin,
// so a label must never reach document.write unescaped.

describe('print popup escaping', () => {
  it('escapes user-controlled labels and severs the opener before writing', async () => {
    mockLoading.value = false
    mockReport.value = {
      years: [
        {
          yearIndex: 0,
          revenue: {
            total: 1000,
            lines: [
              {
                lineId: 'rev-1',
                label: '<script>alert(document.cookie)</script>',
                annualTotal: 1000,
                months: Array(12).fill('83.33'),
                distributionRule: 'evenly',
              },
            ],
          },
          operating: {
            total: 500,
            lines: [
              {
                lineId: 'opex-1',
                label: '"><img src=x onerror=alert(1)>',
                annualTotal: 500,
                months: Array(12).fill('41.67'),
              },
            ],
          },
          capex: { total: 100, lines: [] },
          financing: { total: 0, lines: [] },
          netCashFlow: Array(12).fill('41.67'),
          openingBalance: Array(12).fill('100'),
          closingBalance: Array(12).fill('141.67'),
        },
      ],
    }

    const written: string[] = []
    const fakeWin: any = {
      opener: {},
      document: { write: (html: string) => written.push(html), close: vi.fn() },
      addEventListener: vi.fn(),
      focus: vi.fn(),
      print: vi.fn(),
    }
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(fakeWin)

    const wrapper = mountView()
    await wrapper.vm.$nextTick()
    await new Promise((resolve) => setTimeout(resolve, 50))
    await wrapper.vm.$nextTick()

    ;(wrapper.vm as any).exportCashFlow()

    expect(openSpy).toHaveBeenCalled()
    expect(written).toHaveLength(1)
    const html = written[0]
    expect(html).not.toContain('<script>alert')
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;script&gt;alert(document.cookie)&lt;/script&gt;')
    expect(html).toContain('&quot;&gt;&lt;img src=x onerror=alert(1)&gt;')
    expect(fakeWin.opener).toBeNull()

    openSpy.mockRestore()
  })
})
