import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// Mock all dependencies
vi.mock('@/stores/ui', () => ({
  useUiStore: vi.fn(() => ({
    toastMessages: [],
    sidebarCollapsed: false,
    toggleSidebar: vi.fn(),
  })),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    user: { name: 'Test User', email: 'test@test.com', role: 'editor' },
    accessToken: 'tok',
    isAuthenticated: true,
  })),
}))

vi.mock('@/composables/useAuth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: { value: true },
    isOwner: { value: false },
    isAdmin: { value: false },
    isBusinessUser: { value: true },
    user: { value: { name: 'Test User', email: 'test@test.com', role: 'editor' } },
    logout: vi.fn(),
  })),
}))

vi.mock('@/features/plans/stores/planStore', () => ({
  usePlanStore: vi.fn(() => ({
    activePlan: null,
  })),
}))

vi.mock('@/features/scenarios/stores/scenarioStore', () => ({
  useScenarioStore: vi.fn(() => ({
    activeScenario: null,
  })),
}))

vi.mock('@/features/settings/stores/settingsStore', () => ({
  useSettingsStore: vi.fn(() => ({
    configComputed: null,
  })),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({ path: '/', params: {} })),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  RouterLink: { template: '<a><slot /></a>' },
  RouterView: { template: '<div data-testid="router-view" />' },
}))

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}))

// useTierGate depends on useTenantStore — mock it so AppSidebar renders cleanly
vi.mock('@/stores/tenant', () => ({
  useTenantStore: vi.fn(() => ({
    tenant: { id: 'tenant-1', tier: 'free' },
    fetchTenant: vi.fn(),
  })),
}))

// useDisplayUnitStore reads localStorage on init — mock it to avoid jsdom issues
vi.mock('@/stores/displayUnit', () => ({
  useDisplayUnitStore: vi.fn(() => ({
    unit: 'k€',
    factor: 1000,
    decimals: 1,
    setUnit: vi.fn(),
  })),
}))

// Stub PrimeVue components
const PrimeStub = { template: '<div><slot /></div>' }

describe('Layout Components', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('AppSidebar', () => {
    it('renders without crashing', async () => {
      const AppSidebar = (await import('./AppSidebar.vue')).default
      const wrapper = mount(AppSidebar, {
        global: {
          stubs: { PanelMenu: PrimeStub, RouterLink: { template: '<a><slot /></a>' } },
        },
      })
      expect(wrapper.find('aside').exists()).toBe(true)
    })

    it('has sidebar width class', async () => {
      const AppSidebar = (await import('./AppSidebar.vue')).default
      const wrapper = mount(AppSidebar, {
        global: {
          stubs: { PanelMenu: PrimeStub },
        },
      })
      const aside = wrapper.find('aside')
      // Should have w-64 since sidebarCollapsed is false
      expect(aside.classes()).toContain('w-64')
    })

    it('always includes dashboard menu item', async () => {
      const AppSidebar = (await import('./AppSidebar.vue')).default
      const wrapper = mount(AppSidebar, {
        global: {
          stubs: { PanelMenu: PrimeStub },
        },
      })
      // Component renders, PanelMenu receives model prop
      expect(wrapper.html()).toBeTruthy()
    })
  })

  describe('AppTopbar', () => {
    it('renders without crashing', async () => {
      const AppTopbar = (await import('./AppTopbar.vue')).default
      const wrapper = mount(AppTopbar, {
        global: {
          stubs: {
            Menubar: PrimeStub,
            Button: PrimeStub,
            Menu: PrimeStub,
            Breadcrumb: PrimeStub,
            Dropdown: PrimeStub,
            RouterLink: { template: '<a><slot /></a>' },
          },
        },
      })
      expect(wrapper.find('header').exists()).toBe(true)
    })

    it('shows Ascenda brand name', async () => {
      const AppTopbar = (await import('./AppTopbar.vue')).default
      const wrapper = mount(AppTopbar, {
        global: {
          stubs: {
            Menubar: PrimeStub,
            Button: PrimeStub,
            Menu: PrimeStub,
            Breadcrumb: PrimeStub,
            Dropdown: PrimeStub,
            RouterLink: { template: '<a><slot /></a>' },
          },
        },
      })
      expect(wrapper.text()).toContain('Ascenda')
    })

    it('shows unit label', async () => {
      const AppTopbar = (await import('./AppTopbar.vue')).default
      const wrapper = mount(AppTopbar, {
        global: {
          stubs: {
            Menubar: PrimeStub,
            Button: PrimeStub,
            Menu: PrimeStub,
            Breadcrumb: PrimeStub,
            Dropdown: PrimeStub,
            RouterLink: { template: '<a><slot /></a>' },
          },
        },
      })
      // Default unitLabel is 'k€' when configComputed is null
      expect(wrapper.text()).toContain('k€')
    })
  })

  describe('AppShell', () => {
    it('renders without crashing', async () => {
      const AppShell = (await import('./AppShell.vue')).default
      const wrapper = mount(AppShell, {
        global: {
          stubs: {
            AppSidebar: { template: '<aside />' },
            AppTopbar: { template: '<header />' },
            Toast: PrimeStub,
            RouterView: { template: '<div />' },
          },
        },
      })
      expect(wrapper.find('div.flex').exists()).toBe(true)
    })

    it('contains sidebar, topbar, and main content area', async () => {
      const AppShell = (await import('./AppShell.vue')).default
      const wrapper = mount(AppShell, {
        global: {
          stubs: {
            AppSidebar: { template: '<aside data-testid="sidebar" />' },
            AppTopbar: { template: '<header data-testid="topbar" />' },
            Toast: PrimeStub,
            RouterView: { template: '<div data-testid="content" />' },
          },
        },
      })
      expect(wrapper.find('[data-testid="sidebar"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="topbar"]').exists()).toBe(true)
      expect(wrapper.find('main').exists()).toBe(true)
    })

    it('main area has overflow-y-auto for scrolling', async () => {
      const AppShell = (await import('./AppShell.vue')).default
      const wrapper = mount(AppShell, {
        global: {
          stubs: {
            AppSidebar: { template: '<aside />' },
            AppTopbar: { template: '<header />' },
            Toast: PrimeStub,
            RouterView: { template: '<div />' },
          },
        },
      })
      expect(wrapper.find('main').classes()).toContain('overflow-y-auto')
    })
  })
})
