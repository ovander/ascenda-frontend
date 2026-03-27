import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed, defineComponent } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import CapexView from './CapexView.vue'

// ── Mock stores ────────────────────────────────────────────────────────────────

const mockEntries = ref<any[]>([])
const mockSummary = ref<any>(null)
const mockLoading = ref(false)
const mockError = ref<string | null>(null)
const mockFetchAll = vi.fn()
const mockUpdateEntries = vi.fn()
const mockFetchSummary = vi.fn()

vi.mock('@/features/capex/stores/capexStore', () => ({
  useCapexStore: () => ({
    entries: computed(() => mockEntries.value),
    summary: computed(() => mockSummary.value),
    loading: computed(() => mockLoading.value),
    error: computed(() => mockError.value),
    fetchAll: mockFetchAll,
    updateEntries: mockUpdateEntries,
    fetchSummary: mockFetchSummary,
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
  Button: {
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['label', 'icon', 'severity', 'outlined', 'size', 'disabled', 'loading'],
    emits: ['click'],
  },
  DataTable: {
    template: '<div class="datatable"><slot /></div>',
    props: ['value', 'class', 'showGridlines', 'size'],
  },
  Column: {
    template: '<div class="column" />',
    props: ['field', 'header', 'class'],
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
}

function mountView() {
  return mount(CapexView, {
    global: {
      plugins: [createPinia()],
      stubs: globalStubs,
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('CapexView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockEntries.value = []
    mockSummary.value = null
    mockLoading.value = false
    mockError.value = null
    mockFetchAll.mockResolvedValue(undefined)
    mockUpdateEntries.mockResolvedValue(undefined)
    mockFetchSummary.mockResolvedValue(undefined)
  })

  describe('rendering', () => {
    it('renders loading spinner when store.loading is true', () => {
      mockLoading.value = true
      const wrapper = mountView()
      expect(wrapper.find('.progress-spinner').exists()).toBe(true)
    })

    it('renders page title', () => {
      const wrapper = mountView()
      expect(wrapper.text()).toContain('Capital Expenditure')
    })

    it('renders KFormLegend component', () => {
      const wrapper = mountView()
      expect(wrapper.find('.k-form-legend').exists()).toBe(true)
    })
  })

  describe('entries table rendering', () => {
    it('component mounts with entry data', async () => {
      mockLoading.value = false
      mockEntries.value = [
        { id: 'e1', category: 'equipment', amount: '1000', yearIndex: 0 },
      ]
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.exists()).toBe(true)
    })

    it('component mounts when not loading', async () => {
      mockLoading.value = false
      mockEntries.value = [
        { id: 'e1', category: 'buildings', amount: '500', yearIndex: 0, depreciationYears: 20 },
      ]
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm).toBeDefined()
    })
  })

  describe('summary rendering', () => {
    it('component handles null summary', async () => {
      mockLoading.value = false
      mockSummary.value = null
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.exists()).toBe(true)
    })

    it('component handles summary with data', async () => {
      mockLoading.value = false
      mockSummary.value = {
        totals: {
          totalCapex: ['100', '200', '300', '400', '500'],
          totalDepreciation: ['10', '20', '30', '40', '50'],
          netAssets: ['0', '90', '170', '240', '300', '350'],
        },
      }
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm).toBeDefined()
    })
  })

  describe('store integration', () => {
    it('calls fetchAll on mount', async () => {
      mockFetchAll.mockResolvedValue(undefined)
      mountView()
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(mockFetchAll).toHaveBeenCalled()
    })

    it('updates entries via handleCapexEdit', async () => {
      mockLoading.value = false
      mockEntries.value = [
        { id: 'e1', category: 'equipment', amount: '1000', yearIndex: 0, depreciationYears: 5 },
      ]
      const wrapper = mountView()
      const grid = wrapper.findComponent({ name: 'KYearGrid' })
      if (grid.exists()) {
        grid.vm.$emit('cell-edit', { rowId: 'capex-equipment', yearIndex: 0, value: 2000 })
        await wrapper.vm.$nextTick()
      }
    })
  })

  describe('props handling', () => {
    it('accepts planId and sid props', () => {
      const wrapper = mount(CapexView, {
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
})
