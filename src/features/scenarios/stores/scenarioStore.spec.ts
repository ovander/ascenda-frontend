import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useScenarioStore } from './scenarioStore'
import type { Scenario } from '@/types'

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

const mockScenario: Scenario = {
  id: 's1',
  planId: 'p1',
  name: 'Base',
  description: 'Base scenario',
  isBase: true,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
}

const mockScenario2: Scenario = {
  id: 's2',
  planId: 'p1',
  name: 'Optimistic',
  description: 'Best case',
  isBase: false,
  createdAt: '2025-02-01T00:00:00Z',
  updatedAt: '2025-02-01T00:00:00Z',
}

describe('Scenario Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('has correct initial state', () => {
    const store = useScenarioStore()
    expect(store.scenarios).toEqual([])
    expect(store.activeScenario).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('fetchScenarios populates list', async () => {
    mockApi.get.mockResolvedValue({ data: [mockScenario, mockScenario2] })
    const store = useScenarioStore()

    await store.fetchScenarios('p1')

    expect(mockApi.get).toHaveBeenCalledWith('/api/v1/plans/p1/scenarios/')
    expect(store.scenarios).toHaveLength(2)
    expect(store.loading).toBe(false)
  })

  it('fetchScenario sets activeScenario', async () => {
    mockApi.get.mockResolvedValue({ data: mockScenario })
    const store = useScenarioStore()

    const result = await store.fetchScenario('p1', 's1')

    expect(result).toEqual(mockScenario)
    expect(store.activeScenario).toEqual(mockScenario)
  })

  it('createScenario adds to list and returns scenario', async () => {
    mockApi.post.mockResolvedValue({ data: mockScenario2 })
    const store = useScenarioStore()

    const result = await store.createScenario('p1', { name: 'Optimistic', description: 'Best case' })

    expect(result.id).toBe('s2')
    expect(store.scenarios).toHaveLength(1)
    expect(store.scenarios[0].name).toBe('Optimistic')
  })

  it('updateScenario updates in list and active', async () => {
    const updated = { ...mockScenario, name: 'Updated Base' }
    mockApi.get.mockResolvedValue({ data: [mockScenario] })
    mockApi.put.mockResolvedValue({ data: updated })
    const store = useScenarioStore()

    await store.fetchScenarios('p1')
    store.setActive(mockScenario)
    await store.updateScenario('p1', 's1', { name: 'Updated Base' })

    expect(store.scenarios[0].name).toBe('Updated Base')
    expect(store.activeScenario?.name).toBe('Updated Base')
  })

  it('deleteScenario removes from list', async () => {
    mockApi.get.mockResolvedValue({ data: [mockScenario, mockScenario2] })
    mockApi.delete.mockResolvedValue({})
    const store = useScenarioStore()

    await store.fetchScenarios('p1')
    store.setActive(mockScenario)
    await store.deleteScenario('p1', 's1')

    expect(store.scenarios).toHaveLength(1)
    expect(store.scenarios[0].id).toBe('s2')
    expect(store.activeScenario).toBeNull()
  })

  it('deleteScenario does not clear active if different scenario deleted', async () => {
    mockApi.get.mockResolvedValue({ data: [mockScenario, mockScenario2] })
    mockApi.delete.mockResolvedValue({})
    const store = useScenarioStore()

    await store.fetchScenarios('p1')
    store.setActive(mockScenario)
    await store.deleteScenario('p1', 's2')

    expect(store.activeScenario?.id).toBe('s1')
  })

  it('cloneScenario adds clone to list', async () => {
    const clone = { ...mockScenario, id: 's3', name: 'Base (copy)' }
    mockApi.post.mockResolvedValue({ data: clone })
    const store = useScenarioStore()

    const result = await store.cloneScenario('p1', 's1')

    expect(result.id).toBe('s3')
    expect(store.scenarios).toHaveLength(1)
    expect(mockApi.post).toHaveBeenCalledWith('/api/v1/plans/p1/scenarios/s1/clone')
  })

  it('setActive sets the active scenario', () => {
    const store = useScenarioStore()
    store.setActive(mockScenario)
    expect(store.activeScenario).toEqual(mockScenario)
  })

  it('loading is true during fetch', async () => {
    let resolveGet: any
    mockApi.get.mockImplementation(() => new Promise(r => { resolveGet = r }))
    const store = useScenarioStore()

    const promise = store.fetchScenarios('p1')
    expect(store.loading).toBe(true)

    resolveGet({ data: [] })
    await promise
    expect(store.loading).toBe(false)
  })
})
