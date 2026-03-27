import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import BepView from './BepView.vue'

// ── Mock stores ────────────────────────────────────────────────────────────────

const mockSnapshots = ref<any[]>([])
const mockActiveSnapshot = ref<any>(null)
const mockFixedCostLines = ref<any[]>([])
const mockVariableCostLines = ref<any[]>([])
const mockReport = ref<any>(null)
const mockMultiYearReport = ref<any>(null)
const mockPlans = ref<any[]>([])
const mockActivePlan = ref<any>(null)
const mockOptimisedReport = ref<any>(null)
const mockLoading = ref(false)
const mockReportLoading = ref(false)
const mockMultiYearLoading = ref(false)
const mockError = ref<string | null>(null)

const mockFetchSnapshots = vi.fn()
const mockSelectSnapshot = vi.fn()
const mockFetchReport = vi.fn()
const mockFetchMultiYearReport = vi.fn()
const mockCreateSnapshot = vi.fn()
const mockDeleteSnapshot = vi.fn()
const mockImportFromPlan = vi.fn()
const mockPreviewFromPlan = vi.fn()
const mockFetchOptimisedReport = vi.fn()
const mockSelectPlan = vi.fn()

vi.mock('@/features/bep/stores/bepStore', () => ({
  useBEPStore: () => ({
    get snapshots() { return mockSnapshots.value },
    get activeSnapshot() { return mockActiveSnapshot.value },
    get fixedCostLines() { return mockFixedCostLines.value },
    get variableCostLines() { return mockVariableCostLines.value },
    get report() { return mockReport.value },
    get multiYearReport() { return mockMultiYearReport.value },
    get plans() { return mockPlans.value },
    get activePlan() { return mockActivePlan.value },
    get optimisedReport() { return mockOptimisedReport.value },
    get loading() { return mockLoading.value },
    get reportLoading() { return mockReportLoading.value },
    get multiYearLoading() { return mockMultiYearLoading.value },
    get error() { return mockError.value },
    fetchSnapshots: mockFetchSnapshots,
    selectSnapshot: mockSelectSnapshot,
    fetchReport: mockFetchReport,
    fetchMultiYearReport: mockFetchMultiYearReport,
    createSnapshot: mockCreateSnapshot,
    deleteSnapshot: mockDeleteSnapshot,
    importFromPlan: mockImportFromPlan,
    previewFromPlan: mockPreviewFromPlan,
    fetchOptimisedReport: mockFetchOptimisedReport,
    selectPlan: mockSelectPlan,
  }),
}))

vi.mock('@/composables/useTierGate', () => ({
  useTierGate: () => ({
    isPro: ref(true),
    gate: vi.fn(() => true),
  }),
}))

vi.mock('@/composables/usePlanAccess', () => ({
  usePlanAccess: () => ({ canEdit: ref(true) }),
}))

vi.mock('@/stores/displayUnit', () => ({
  useDisplayUnitStore: () => ({ factor: 1_000_000 }),
}))

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
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
  Toast: { template: '<div class="toast" />' },
  Button: {
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['label', 'icon', 'severity', 'outlined', 'size', 'disabled', 'loading'],
    emits: ['click'],
  },
  Dialog: {
    template: '<div class="dialog" v-if="visible"><slot /></div>',
    props: ['visible', 'modal', 'header'],
    emits: ['update:visible'],
  },
  InputText: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
  InputNumber: {
    template: '<input type="number" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder'],
    emits: ['update:modelValue'],
  },
  Textarea: {
    template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
  Select: {
    template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
    props: ['modelValue', 'options'],
    emits: ['update:modelValue'],
  },
  DataTable: {
    template: '<div class="datatable"><slot /></div>',
    props: ['value', 'class', 'showGridlines', 'size'],
  },
  Column: {
    template: '<div class="column" />',
    props: ['field', 'header', 'class'],
  },
  Message: {
    template: '<div class="message" />',
    props: ['severity', 'text'],
  },
  Tag: {
    template: '<span class="tag" />',
    props: ['value', 'severity'],
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
    props: ['data', 'type', 'height', 'loading'],
  },
  UpgradeModal: {
    template: '<div class="upgrade-modal" />',
  },
  ProBadge: {
    template: '<span class="pro-badge" />',
  },
}

function mountView() {
  return mount(BepView, {
    global: {
      plugins: [createPinia()],
      stubs: globalStubs,
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('BepView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockSnapshots.value = []
    mockActiveSnapshot.value = null
    mockFixedCostLines.value = []
    mockVariableCostLines.value = []
    mockReport.value = null
    mockMultiYearReport.value = null
    mockPlans.value = []
    mockActivePlan.value = null
    mockOptimisedReport.value = null
    mockLoading.value = false
    mockReportLoading.value = false
    mockMultiYearLoading.value = false
    mockError.value = null
    mockFetchSnapshots.mockResolvedValue(undefined)
    mockSelectSnapshot.mockResolvedValue(undefined)
    mockFetchReport.mockResolvedValue(undefined)
    mockFetchMultiYearReport.mockResolvedValue(undefined)
  })

  describe('rendering', () => {
    it('renders page title "Break-Even Analysis"', () => {
      const wrapper = mountView()
      expect(wrapper.text()).toContain('Break-Even Analysis')
    })

    it('component renders without errors when not loading', () => {
      mockLoading.value = false
      const wrapper = mountView()
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('store integration', () => {
    it('calls fetchMultiYearReport on mount', async () => {
      mockFetchMultiYearReport.mockResolvedValue(undefined)
      mountView()
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(mockFetchMultiYearReport).toHaveBeenCalled()
    })

    it('calls fetchSnapshots on mount', async () => {
      mockFetchSnapshots.mockResolvedValue(undefined)
      mountView()
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(mockFetchSnapshots).toHaveBeenCalled()
    })

    it('selects first snapshot and fetches report when snapshots are available', async () => {
      const snapshot = { id: 'snap-1', label: 'Test Snapshot' }
      mockSnapshots.value = [snapshot]
      mockSelectSnapshot.mockResolvedValue(undefined)
      mockFetchReport.mockResolvedValue(undefined)
      mockActiveSnapshot.value = snapshot

      mountView()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockSelectSnapshot).toHaveBeenCalledWith('snap-1')
    })
  })

  describe('snapshot management', () => {
    it('component mounts with empty snapshots', async () => {
      mockLoading.value = false
      mockSnapshots.value = []
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.exists()).toBe(true)
    })

    it('component mounts with snapshot data', async () => {
      mockLoading.value = false
      mockSnapshots.value = [
        { id: 'snap-1', label: 'Test Snapshot', fixedCostsTotal: '1000' },
      ]
      mockActiveSnapshot.value = mockSnapshots.value[0]
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('report data', () => {
    it('component handles null report', async () => {
      mockLoading.value = false
      mockReport.value = null
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.exists()).toBe(true)
    })

    it('component handles report with data', async () => {
      mockLoading.value = false
      mockReport.value = {
        core: {
          bepRevenue: '50000',
          fixedCosts: '10000',
          contributionMarginPct: '30',
        },
        ebeTable: [
          {
            variationPct: '-10',
            revenue: '45000',
            totalCosts: '15000',
            ebe: '-5000',
            isBep: false,
          },
          {
            variationPct: '0',
            revenue: '50000',
            totalCosts: '15000',
            ebe: '5000',
            isBep: true,
          },
        ],
        marginSens: [],
        costSens: [],
      }
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('multi-year report', () => {
    it('component handles null multi-year report', async () => {
      mockLoading.value = false
      mockMultiYearReport.value = null
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.exists()).toBe(true)
    })

    it('component handles multi-year report data', async () => {
      mockLoading.value = false
      mockMultiYearReport.value = {
        years: [
          { year: 1, revenue: '100000', fixedCosts: '20000', bepRevenue: '50000' },
          { year: 2, revenue: '150000', fixedCosts: '20000', bepRevenue: '50000' },
        ],
      }
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('error handling', () => {
    it('component renders when store has error', async () => {
      mockLoading.value = false
      mockError.value = 'Failed to fetch BEP data'
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('props handling', () => {
    it('accepts planId and sid props', () => {
      const wrapper = mount(BepView, {
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

  describe('tabs', () => {
    it('renders overview tab by default', () => {
      mockLoading.value = false
      const wrapper = mountView()
      expect(wrapper.text()).toContain('Overview')
    })

    it('component renders without errors with tabs', async () => {
      mockLoading.value = false
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.tabs').exists()).toBe(true)
    })
  })
})
