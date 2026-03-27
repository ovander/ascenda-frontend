import { describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import LoginView from './LoginView.vue'

// Mock vue-router so route.query.auto is accessible in onMounted
vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({ query: {} })),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}))

// Mock dependencies
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'auth.loginTitle': 'Welcome to Ascenda',
        'auth.loginSubtitle': 'Business Planning Made Simple',
        'auth.loginButton': 'Sign in with Socrate',
      }
      return translations[key] || key
    },
  }),
}))

const mockInitiateLogin = vi.fn()
vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    initiateLogin: mockInitiateLogin,
  }),
}))

describe('LoginView', () => {
  function createWrapper() {
    return shallowMount(LoginView, {
      global: {
        stubs: {
          Button: {
            template: '<button @click="$emit(\'click\')"><slot />{{ $attrs.label }}</button>',
            props: ['label', 'icon', 'size'],
          },
        },
      },
    })
  }

  it('should render the login title', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('Welcome to Ascenda')
  })

  it('should render the login subtitle', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('Business Planning Made Simple')
  })

  it('should render the footer text', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('Multi-Tenant SaaS Business Plan Application')
  })

  it('should have a gradient background container', () => {
    const wrapper = createWrapper()
    const container = wrapper.find('.min-h-screen')
    expect(container.exists()).toBe(true)
    expect(container.classes()).toContain('bg-gradient-to-br')
  })

  it('should render the chart icon', () => {
    const wrapper = createWrapper()
    const icon = wrapper.find('.pi-chart-bar')
    expect(icon.exists()).toBe(true)
  })

  it('should call initiateLogin when button is clicked', async () => {
    const wrapper = createWrapper()
    await wrapper.find('button').trigger('click')
    expect(mockInitiateLogin).toHaveBeenCalled()
  })

  it('should render a centered card', () => {
    const wrapper = createWrapper()
    const card = wrapper.find('.bg-white.rounded-xl')
    expect(card.exists()).toBe(true)
    expect(card.classes()).toContain('text-center')
  })
})
