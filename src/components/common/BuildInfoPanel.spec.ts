import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'

const { mockApi } = vi.hoisted(() => ({ mockApi: { get: vi.fn() } }))
vi.mock('@/composables/useApi', () => ({ default: mockApi }))

import BuildInfoPanel from './BuildInfoPanel.vue'
import { frontendBuild, resetBuildInfoCache, useBuildInfo } from '@/composables/useBuildInfo'

const stubs = {
  Button: defineComponent({
    props: ['label'],
    emits: ['click'],
    template: '<button @click="$emit(\'click\')">{{ label }}</button>',
  }),
}

const backendVersion = {
  version: 'v2.4.1',
  gitCommit: 'abc1234',
  buildTime: '2026-09-26T08:00:00Z',
  goVersion: 'go1.26.8',
}

function mountPanel() {
  return mount(BuildInfoPanel, { global: { stubs } })
}

beforeEach(() => {
  mockApi.get.mockReset()
  resetBuildInfoCache()
})

describe('frontendBuild', () => {
  it('carries the facts embedded by vite.config.ts', () => {
    expect(frontendBuild.version).toBeTruthy()
    expect(frontendBuild.buildTime).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(frontendBuild.toolchain.map((t) => t.name)).toEqual(['Node.js', 'Vite', 'Vue', 'TypeScript'])
    expect(frontendBuild.toolchain.every((t) => /^\d+\.\d+/.test(t.version))).toBe(true)
  })
})

describe('BuildInfoPanel', () => {
  it('shows the application and the server builds', async () => {
    mockApi.get.mockResolvedValue({ data: backendVersion })
    const w = mountPanel()
    await flushPromises()

    expect(mockApi.get).toHaveBeenCalledWith('/api/v1/version')
    const app = w.find('[data-test="build-frontend"]')
    expect(app.find('[data-test="version"]').text()).toBe(frontendBuild.version)
    expect(app.find('[data-test="toolchain"]').text()).toContain('Vite')

    const server = w.find('[data-test="build-backend"]')
    expect(server.find('[data-test="version"]').text()).toBe('v2.4.1')
    expect(server.find('[data-test="commit"]').text()).toBe('abc1234')
    expect(server.find('[data-test="built"]').text()).toContain('2026')
    expect(server.find('[data-test="toolchain"]').text()).toMatch(/Go\s+1\.26\.8/)
  })

  it('shows dashes for a server build without commit or build time', async () => {
    mockApi.get.mockResolvedValue({ data: { version: 'dev', goVersion: 'go1.25.0' } })
    const w = mountPanel()
    await flushPromises()

    const server = w.find('[data-test="build-backend"]')
    expect(server.find('[data-test="version"]').text()).toBe('dev')
    expect(server.find('[data-test="commit"]').text()).toBe('—')
    expect(server.find('[data-test="built"]').text()).toBe('—')
  })

  it('says when the server does not answer, and retries on request', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('network')).mockResolvedValue({ data: backendVersion })
    const w = mountPanel()
    await flushPromises()

    const server = () => w.find('[data-test="build-backend"]')
    expect(server().find('[data-test="unavailable"]').exists()).toBe(true)

    await server().find('[data-test="unavailable"] button').trigger('click')
    await flushPromises()
    expect(server().find('[data-test="version"]').text()).toBe('v2.4.1')
  })

  it('fetches the server build once for every panel', async () => {
    mockApi.get.mockResolvedValue({ data: backendVersion })
    mountPanel()
    mountPanel()
    await flushPromises()
    await useBuildInfo().loadBackend()
    expect(mockApi.get).toHaveBeenCalledTimes(1)
  })

  it('copies both builds as text', async () => {
    mockApi.get.mockResolvedValue({ data: backendVersion })
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const w = mountPanel()
    await flushPromises()

    await w.find('[data-test="copy"]').trigger('click')
    await flushPromises()
    const text = writeText.mock.calls[0]![0] as string
    expect(text).toContain(`Application: ${frontendBuild.version}`)
    expect(text).toContain('Server: v2.4.1 (abc1234, built 2026-09-26T08:00:00Z; Go 1.26.8)')
    expect(w.find('[data-test="copy"]').text()).toBe('Copied')
  })
})
