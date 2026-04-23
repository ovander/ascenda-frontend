import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useScenarioAnalysisStore } from './scenarioAnalysisStore'

vi.mock('@/composables/useApi', () => ({
  useAIApi: vi.fn(),
}))
import { useAIApi } from '@/composables/useApi'

describe('useScenarioAnalysisStore', () => {
  let mockGet: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockGet = vi.fn()
    vi.mocked(useAIApi).mockReturnValue({ get: mockGet } as any)
  })

  it('fetches and caches analysis', async () => {
    const mockData = { viability: { score: 72, label: 'Good' } }
    mockGet.mockResolvedValue({ data: mockData })
    const store = useScenarioAnalysisStore()
    await store.fetchIfNeeded('plan1', 'scenario1')
    expect(mockGet).toHaveBeenCalledTimes(1)
    expect(store.getAnalysis('plan1', 'scenario1')).toEqual(mockData)
  })

  it('returns cached result without re-fetching', async () => {
    const mockData = { viability: { score: 72, label: 'Good' } }
    mockGet.mockResolvedValue({ data: mockData })
    const store = useScenarioAnalysisStore()
    await store.fetchIfNeeded('plan1', 'scenario1')
    await store.fetchIfNeeded('plan1', 'scenario1') // second call
    expect(mockGet).toHaveBeenCalledTimes(1) // still only 1 API call
  })

  it('invalidates cache for a scenario', async () => {
    const mockData = { viability: { score: 72, label: 'Good' } }
    mockGet.mockResolvedValue({ data: mockData })
    const store = useScenarioAnalysisStore()
    await store.fetchIfNeeded('plan1', 'scenario1')
    store.invalidate('scenario1')
    expect(store.getAnalysis('plan1', 'scenario1')).toBeNull()
  })

  it('sets error on API failure', async () => {
    mockGet.mockRejectedValue({ response: { data: { message: 'AI error' } } })
    const store = useScenarioAnalysisStore()
    await store.fetchIfNeeded('plan1', 'scenario1')
    expect(store.getError('plan1', 'scenario1')).toBe('AI error')
    expect(store.getAnalysis('plan1', 'scenario1')).toBeNull()
  })

  it('does not re-fetch while already in flight', async () => {
    let resolveFirst: (v: any) => void
    const firstCall = new Promise(resolve => { resolveFirst = resolve })
    mockGet.mockReturnValueOnce(firstCall)
    const store = useScenarioAnalysisStore()
    // Start two concurrent fetches
    const p1 = store.fetchIfNeeded('plan1', 'scenario1')
    const p2 = store.fetchIfNeeded('plan1', 'scenario1')
    resolveFirst!({ data: { viability: { score: 72 } } })
    await Promise.all([p1, p2])
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('reset clears all state', async () => {
    const mockData = { viability: { score: 72, label: 'Good' } }
    mockGet.mockResolvedValue({ data: mockData })
    const store = useScenarioAnalysisStore()
    await store.fetchIfNeeded('plan1', 'scenario1')
    store.reset()
    expect(store.getAnalysis('plan1', 'scenario1')).toBeNull()
  })
})
