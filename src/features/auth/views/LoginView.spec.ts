import { describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import LoginView from './LoginView.vue'

// Mock vue-router so route.query.auto is accessible in onMounted
const route = vi.hoisted(() => ({ query: {} as Record<string, string> }))
vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => route),
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
        'auth.signInFailed': 'Sign-in did not complete.',
        'auth.signInCancelled': 'Sign-in was cancelled.',
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
    expect(container.classes()).toContain('bg-linear-to-br')
  })

  it('should render the chart icon', () => {
    const wrapper = createWrapper()
    const icon = wrapper.find('.pi-chart-bar')
    expect(icon.exists()).toBe(true)
  })

  it('should call initiateLogin when button is clicked', async () => {
    const wrapper = createWrapper()
    await wrapper.find('button').trigger('click')
    expect(mockInitiateLogin).toHaveBeenCalledWith('/')
  })

  it('returns to the ?redirect= page after sign-in', async () => {
    route.query = { redirect: '/plans/3' }
    const wrapper = createWrapper()
    await wrapper.find('button').trigger('click')
    expect(mockInitiateLogin).toHaveBeenLastCalledWith('/plans/3')
    route.query = {}
  })

  it('shows why the backend refused a sign-in, and does not retry on its own', () => {
    mockInitiateLogin.mockClear()
    route.query = { error: 'sign_in_failed', auto: '1' }
    let wrapper = createWrapper()
    expect(wrapper.find('[data-test="login-error"]').text()).toBe('Sign-in did not complete.')
    expect(mockInitiateLogin).not.toHaveBeenCalled()

    route.query = { error: 'access_denied' }
    wrapper = createWrapper()
    expect(wrapper.find('[data-test="login-error"]').text()).toBe('Sign-in was cancelled.')
    route.query = {}
  })

  it('starts sign-in straight away from the landing page link (?auto=1)', () => {
    mockInitiateLogin.mockClear()
    route.query = { auto: '1' }
    createWrapper()
    expect(mockInitiateLogin).toHaveBeenCalledWith('/')
    route.query = {}
  })

  it('should render a centered card', () => {
    const wrapper = createWrapper()
    const card = wrapper.find('.bg-white.rounded-xl')
    expect(card.exists()).toBe(true)
    expect(card.classes()).toContain('text-center')
  })
})
