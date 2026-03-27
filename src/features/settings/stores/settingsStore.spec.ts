import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsStore } from './settingsStore'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'

// Mock the API module
vi.mock('@/composables/useApi', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import api from '@/composables/useApi'
const mockApi = vi.mocked(api)

function setupActiveContext() {
  const planStore = usePlanStore()
  const scenarioStore = useScenarioStore()
  planStore.activePlan = { id: 'plan-1' } as any
  scenarioStore.activeScenario = { id: 'scenario-1' } as any
}

const mockConfigComputed = {
  id: 'config-1',
  scenarioId: 'scenario-1',
  language: 'fr' as const,
  companyName: 'Test Corp',
  forecastStart: '2025-01-01',
  yearHeaders: ['2025', '2026', '2027', '2028', '2029'],
}

describe('Settings Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should have correct initial state', () => {
    const store = useSettingsStore()
    expect(store.config).toBeNull()
    expect(store.configComputed).toBeNull()
    expect(store.openingBalance).toBeNull()
    expect(store.wcConfig).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('should fetch config successfully', async () => {
    setupActiveContext()
    mockApi.get.mockResolvedValue({ data: mockConfigComputed })
    const store = useSettingsStore()

    await store.fetchConfig()

    expect(mockApi.get).toHaveBeenCalledWith('/api/v1/plans/plan-1/scenarios/scenario-1/settings/config')
    expect(store.configComputed).toEqual(mockConfigComputed)
    expect(store.config).toEqual(mockConfigComputed)
    expect(store.loading).toBe(false)
  })

  it('should handle fetch config error', async () => {
    setupActiveContext()
    mockApi.get.mockRejectedValue({ response: { data: { message: 'Config not found' } } })
    const store = useSettingsStore()

    await store.fetchConfig()

    expect(store.error).toBe('Config not found')
    expect(store.loading).toBe(false)
  })

  it('should update config', async () => {
    setupActiveContext()
    const updated = { ...mockConfigComputed, companyName: 'Updated Corp' }
    mockApi.put.mockResolvedValue({ data: updated })
    const store = useSettingsStore()

    const result = await store.updateConfig({ companyName: 'Updated Corp' })

    expect(mockApi.put).toHaveBeenCalledWith(
      '/api/v1/plans/plan-1/scenarios/scenario-1/settings/config',
      { companyName: 'Updated Corp' }
    )
    expect(result.companyName).toBe('Updated Corp')
  })

  it('should fetch opening balance', async () => {
    setupActiveContext()
    const ob = { id: 'ob-1', scenarioId: 'scenario-1' }
    mockApi.get.mockResolvedValue({ data: ob })
    const store = useSettingsStore()

    await store.fetchOpeningBalance()

    expect(mockApi.get).toHaveBeenCalledWith('/api/v1/plans/plan-1/scenarios/scenario-1/settings/opening-balance')
    expect(store.openingBalance).toEqual(ob)
  })

  it('should fetch working capital config', async () => {
    setupActiveContext()
    const wc = { id: 'wc-1', scenarioId: 'scenario-1' }
    mockApi.get.mockResolvedValue({ data: wc })
    const store = useSettingsStore()

    await store.fetchWcConfig()

    expect(mockApi.get).toHaveBeenCalledWith('/api/v1/plans/plan-1/scenarios/scenario-1/settings/wc-config')
    expect(store.wcConfig).toEqual(wc)
  })

  it('should fetch all settings', async () => {
    setupActiveContext()
    mockApi.get.mockResolvedValue({ data: {} })
    const store = useSettingsStore()

    await store.fetchAll()

    expect(mockApi.get).toHaveBeenCalledTimes(4) // config, opening-balance, wc-config, opex-per-hire
  })

  it('should reset state', () => {
    const store = useSettingsStore()
    store.config = mockConfigComputed as any
    store.error = 'some error'

    store.$reset()

    expect(store.config).toBeNull()
    expect(store.configComputed).toBeNull()
    expect(store.openingBalance).toBeNull()
    expect(store.wcConfig).toBeNull()
    expect(store.error).toBeNull()
  })

  it('should set error when basePath throws', async () => {
    // No active plan/scenario set
    const store = useSettingsStore()
    await store.fetchConfig()
    // basePath throws, caught internally, error is set
    expect(store.error).toBeTruthy()
  })
})
