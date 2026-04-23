import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SkeletonCard from './SkeletonCard.vue'

// Stub PrimeVue Skeleton
const SkeletonStub = { template: '<div class="skeleton-stub" />' }

describe('SkeletonCard', () => {
  it('renders without errors', () => {
    const w = mount(SkeletonCard, {
      global: { stubs: { Skeleton: SkeletonStub } },
    })
    expect(w.exists()).toBe(true)
  })

  it('renders default 2 content lines', () => {
    const w = mount(SkeletonCard, {
      global: { stubs: { Skeleton: SkeletonStub } },
    })
    // 2 header skeletons (circle + lines) + 2 content lines
    expect(w.findAll('.skeleton-stub').length).toBeGreaterThanOrEqual(2)
  })

  it('renders custom number of lines', () => {
    const w = mount(SkeletonCard, {
      props: { lines: 4 },
      global: { stubs: { Skeleton: SkeletonStub } },
    })
    expect(w.findAll('.skeleton-stub').length).toBeGreaterThanOrEqual(4)
  })
})
