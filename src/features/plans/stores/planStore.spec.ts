import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePlanStore } from './planStore'
import type { Plan } from '@/types'

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

const mockPlan: Plan = {
  id: '1',
  tenantId: 'tenant-1',
  name: 'Test Plan',
  description: 'A test plan',
  status: 'draft',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
}

const mockPlan2: Plan = {
  id: '2',
  tenantId: 'tenant-1',
  name: 'Plan 2',
  description: 'Another plan',
  status: 'active',
  createdAt: '2025-02-01T00:00:00Z',
  updatedAt: '2025-02-01T00:00:00Z',
}

describe('Plan Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should have correct initial state', () => {
    const store = usePlanStore()
    expect(store.plans).toEqual([])
    expect(store.activePlan).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('should fetch plans successfully', async () => {
    mockApi.get.mockResolvedValue({ data: [mockPlan, mockPlan2] })
    const store = usePlanStore()

    await store.fetchPlans()

    expect(mockApi.get).toHaveBeenCalledWith('/api/v1/plans/')
    expect(store.plans).toHaveLength(2)
    expect(store.plans[0].name).toBe('Test Plan')
    expect(store.loading).toBe(false)
  })

  it('should handle fetch error', async () => {
    mockApi.get.mockRejectedValue({ response: { data: { message: 'Network error' } } })
    const store = usePlanStore()

    await store.fetchPlans()

    expect(store.error).toBe('Network error')
    expect(store.loading).toBe(false)
  })

  it('should fetch a single plan and set active', async () => {
    mockApi.get.mockResolvedValue({ data: mockPlan })
    const store = usePlanStore()

    const result = await store.fetchPlan('1')

    expect(result).toEqual(mockPlan)
    expect(store.activePlan).toEqual(mockPlan)
  })

  it('should create a new plan', async () => {
    const newPlan: Plan = { ...mockPlan, id: '3', name: 'New Plan' }
    mockApi.post.mockResolvedValue({ data: newPlan })
    const store = usePlanStore()

    const result = await store.createPlan({ name: 'New Plan', description: 'A new plan' })

    expect(result.id).toBe('3')
    expect(store.plans).toHaveLength(1)
    expect(store.plans[0].id).toBe('3')
    expect(store.activePlan?.id).toBe('3')
  })

  it('should update a plan', async () => {
    const updated = { ...mockPlan, name: 'Updated' }
    mockApi.get.mockResolvedValue({ data: [mockPlan] })
    mockApi.put.mockResolvedValue({ data: updated })
    const store = usePlanStore()

    await store.fetchPlans()
    store.setActive(mockPlan)
    await store.updatePlan('1', { name: 'Updated' })

    expect(store.plans[0].name).toBe('Updated')
    expect(store.activePlan?.name).toBe('Updated')
  })

  it('should delete a plan', async () => {
    mockApi.get.mockResolvedValue({ data: [mockPlan, mockPlan2] })
    mockApi.delete.mockResolvedValue({})
    const store = usePlanStore()

    await store.fetchPlans()
    store.setActive(mockPlan)
    await store.deletePlan('1')

    expect(store.plans).toHaveLength(1)
    expect(store.plans[0].id).toBe('2')
    expect(store.activePlan).toBeNull()
  })

  it('should set active plan', () => {
    const store = usePlanStore()
    store.setActive(mockPlan)
    expect(store.activePlan).toEqual(mockPlan)
  })

  it('should clear error on new fetch', async () => {
    const store = usePlanStore()

    mockApi.get.mockRejectedValue({ response: { data: { message: 'Error' } } })
    await store.fetchPlans()
    expect(store.error).toBe('Error')

    mockApi.get.mockResolvedValue({ data: [] })
    await store.fetchPlans()
    expect(store.error).toBeNull()
  })
})
