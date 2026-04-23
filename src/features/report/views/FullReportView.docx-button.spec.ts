/**
 * FullReportView — docx download button tests
 *
 * Covers:
 *  - Button is rendered in the toolbar
 *  - Freemium user: clicking opens the upgrade modal (gate returns false)
 *  - Pro user: clicking triggers downloadDocxReport
 *  - Button label language follows settings config
 *  - Button is disabled while generating
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

// ── Controllable refs ─────────────────────────────────────────────────────────
const mockFullReport = ref<any>(null)
const mockLoading    = ref(false)
const mockWarnings   = ref<any[]>([])
const mockActivePlan = ref<any>({ id: 'p1', name: 'Test Plan' })
const mockConfig     = ref<any>({ language: 'fr', currency: 'EUR' })
const mockIsPro      = ref(true)
const mockGate       = vi.fn(() => mockIsPro.value)
const mockDownload   = vi.fn()
const mockGenerating = ref(false)

// ── Mock stores & composables ─────────────────────────────────────────────────
vi.mock('@/features/report/stores/reportStore', () => ({
  useReportStore: () => ({
    get fullReport() { return mockFullReport.value },
    get loading()    { return mockLoading.value },
    get warnings()   { return mockWarnings.value },
    fetchFullReport: vi.fn(),
  }),
}))

vi.mock('@/features/plans/stores/planStore', () => ({
  usePlanStore: () => ({ get activePlan() { return mockActivePlan.value } }),
}))

vi.mock('@/features/settings/stores/settingsStore', () => ({
  useSettingsStore: () => ({ get config() { return mockConfig.value } }),
}))

vi.mock('@/composables/useDecimal', () => ({
  useDecimal: () => ({
    formatUnit: vi.fn((v: number) => String(v)),
    getLocale:  vi.fn(() => 'fr-FR'),
  }),
}))

vi.mock('@/composables/useTierGate', () => ({
  useTierGate: () => ({
    get isPro() { return mockIsPro.value },
    gate: mockGate,
    upgradeVisible:     ref(false),
    upgradeFeatureName: ref(''),
    upgradeTargetTier:  ref('pro'),
  }),
}))

vi.mock('@/features/report/composables/useDocxGenerator', () => ({
  useDocxGenerator: () => ({
    downloadDocxReport: mockDownload,
    get generating() { return mockGenerating.value },
  }),
}))

// PrimeVue stubs
vi.mock('primevue/fieldset',        () => ({ default: { template: '<div><slot /></div>' } }))
vi.mock('primevue/datatable',       () => ({ default: { template: '<div />' } }))
vi.mock('primevue/column',          () => ({ default: { template: '<div />' } }))
vi.mock('primevue/button', () => ({
  default: {
    emits: ['click'],
    props: ['label', 'icon', 'disabled', 'severity'],
    // Declare emits to prevent native DOM click from also firing the parent @click handler
    template: '<button :disabled="disabled" @click.stop="$emit(\'click\')">{{ label }}</button>',
  },
}))
vi.mock('primevue/progressspinner', () => ({ default: { template: '<div />' } }))
vi.mock('primevue/message',         () => ({ default: { template: '<div />' } }))

import FullReportView from './FullReportView.vue'

function mountView() {
  return mount(FullReportView, {
    global: { plugins: [createPinia()] },
  })
}

describe('FullReportView — docx download button', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockFullReport.value = null
    mockLoading.value    = false
    mockIsPro.value      = true
    mockGenerating.value = false
    mockGate.mockImplementation(() => mockIsPro.value)
    mockConfig.value     = { language: 'fr', currency: 'EUR' }
  })

  // ── Visibility ───────────────────────────────────────────────────────────
  it('renders the docx download button', () => {
    const wrapper = mountView()
    const buttons = wrapper.findAll('button')
    const docxBtn = buttons.find((b) => b.text().includes('Télécharger') || b.text().includes('Download'))
    expect(docxBtn).toBeDefined()
  })

  it('shows French label "Télécharger le dossier" when language is "fr"', () => {
    mockConfig.value = { language: 'fr', currency: 'EUR' }
    const wrapper = mountView()
    expect(wrapper.text()).toContain('Télécharger le dossier')
  })

  it('shows English label "Download Report" when language is "en"', () => {
    mockConfig.value = { language: 'en', currency: 'EUR' }
    const wrapper = mountView()
    expect(wrapper.text()).toContain('Download Report')
  })

  // ── Pro user — triggers download ─────────────────────────────────────────
  it('calls downloadDocxReport when Pro user clicks the button', async () => {
    mockIsPro.value = true
    mockGate.mockReturnValue(true)
    const wrapper = mountView()

    const buttons = wrapper.findAll('button')
    const docxBtn = buttons.find((b) => b.text().includes('Télécharger') || b.text().includes('Download'))
    await docxBtn!.trigger('click')

    expect(mockGate).toHaveBeenCalledWith('pro', expect.any(String))
    expect(mockDownload).toHaveBeenCalledTimes(1)
  })

  // ── Freemium user — upgrade modal ────────────────────────────────────────
  it('does NOT call downloadDocxReport when gate returns false (freemium)', async () => {
    mockIsPro.value = false
    mockGate.mockReturnValue(false)   // gate opens upgrade modal and returns false
    const wrapper = mountView()

    const buttons = wrapper.findAll('button')
    const docxBtn = buttons.find((b) => b.text().includes('Télécharger') || b.text().includes('Download'))
    await docxBtn!.trigger('click')

    expect(mockGate).toHaveBeenCalledWith('pro', expect.any(String))
    expect(mockDownload).not.toHaveBeenCalled()
  })

  // ── Disabled during generation ────────────────────────────────────────────
  it('disables the button while generating is true', () => {
    mockGenerating.value = true
    const wrapper = mountView()

    const buttons = wrapper.findAll('button')
    const docxBtn = buttons.find((b) => b.text().includes('…'))
    expect(docxBtn).toBeDefined()
    expect(docxBtn!.attributes('disabled')).toBeDefined()
  })

  it('shows "…" as label while generating', () => {
    mockGenerating.value = true
    const wrapper = mountView()
    expect(wrapper.text()).toContain('…')
  })
})
