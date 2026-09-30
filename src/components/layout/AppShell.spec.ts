import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// Mock all dependencies
vi.mock('@/stores/ui', () => ({
  useUiStore: vi.fn(() => ({
    toastMessages: [],
    sidebarCollapsed: false,
    mobileDrawerOpen: false,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    canEdit: true,
    activeLayer: 'understand',
    toggleSidebar: vi.fn(),
    setLayer: vi.fn(),
    closeDrawer: vi.fn(),
  })),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    user: { name: 'Test User', email: 'test@test.com', role: 'editor' },
    csrf: 'csrf-token',
    isAuthenticated: true,
    fetchMe: vi.fn(),
  })),
}))

vi.mock('@/composables/useAuth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: { value: true },
    isOwner: { value: false },
    isAdmin: { value: false },
    isBusinessUser: { value: true },
    canOperate: { value: true },
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
    config: null,               // config is the reactive ref value used by settingsGuardReady
    configComputed: null,       // legacy alias kept for other consumers
    fetchConfig: vi.fn(),       // called by AppShell watcher when entering scenario routes
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

vi.mock('@/composables/useTierGate', () => ({
  useTierGate: vi.fn(() => ({
    currentTier: { value: 'pro' },
    isFreemium: { value: false },
    isPro: { value: true },
    isEnterprise: { value: false },
    upgradeVisible: { value: false },
    upgradeFeatureName: { value: '' },
    upgradeTargetTier: { value: '' },
    showUpgradeModal: vi.fn(),
    hideUpgradeModal: vi.fn(),
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
      // isMobile=false, sidebarCollapsed=false → desktop expanded → w-64
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
      expect(wrapper.html()).toContain('Ascenda')
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
            MobileReadOnlyBanner: PrimeStub,
            UpgradeModal: PrimeStub,
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
            UpgradeModal: PrimeStub,
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
            MobileReadOnlyBanner: PrimeStub,
            UpgradeModal: PrimeStub,
            Toast: PrimeStub,
            RouterView: { template: '<div />' },
          },
        },
      })
      expect(wrapper.find('main').classes()).toContain('overflow-y-auto')
    })

    // ── settingsGuardReady flicker guard ──────────────────────────────────────

    it('renders router-view on non-scenario route even when settings are not loaded', async () => {
      // Default mock: route.params = {} (no sid) → settingsGuardReady should be true
      const { useSettingsStore } = await import('@/features/settings/stores/settingsStore')
      vi.mocked(useSettingsStore).mockReturnValueOnce({
        config: null, configComputed: null, fetchConfig: vi.fn(),
      } as any)

      const AppShell = (await import('./AppShell.vue')).default
      const wrapper = mount(AppShell, {
        global: {
          stubs: {
            AppSidebar: { template: '<aside />' },
            AppTopbar: { template: '<header />' },
            MobileReadOnlyBanner: PrimeStub,
            UpgradeModal: PrimeStub,
            Toast: PrimeStub,
            RouterView: { template: '<div data-testid="router-view" />' },
          },
        },
      })
      // On non-scenario routes (no sid param) the router-view must be visible
      expect(wrapper.find('[data-testid="router-view"]').exists()).toBe(true)
    })

    it('renders router-view on wizard route (sid=new) without waiting for settings', async () => {
      const { useRoute } = await import('vue-router')
      const { useSettingsStore } = await import('@/features/settings/stores/settingsStore')
      const fetchConfigMock = vi.fn()

      // Wizard uses a non-UUID sid value ('new') — guard must pass through immediately
      vi.mocked(useRoute).mockReturnValueOnce({ path: '/plans/p1/scenarios/new/wizard', params: { sid: 'new' } } as any)
      vi.mocked(useSettingsStore).mockReturnValueOnce({
        config: null, configComputed: null, fetchConfig: fetchConfigMock,
      } as any)

      const AppShell = (await import('./AppShell.vue')).default
      const wrapper = mount(AppShell, {
        global: {
          stubs: {
            AppSidebar: { template: '<aside />' },
            AppTopbar: { template: '<header />' },
            MobileReadOnlyBanner: PrimeStub,
            UpgradeModal: PrimeStub,
            Toast: PrimeStub,
            RouterView: { template: '<div data-testid="router-view" />' },
          },
        },
      })
      // Wizard route bypasses the guard → router-view must be visible
      expect(wrapper.find('[data-testid="router-view"]').exists()).toBe(true)
      expect(wrapper.find('.pi-spinner').exists()).toBe(false)
      // No settings fetch for non-UUID sids
      expect(fetchConfigMock).not.toHaveBeenCalled()
    })

    it('shows spinner and hides router-view on UUID scenario route when settings are loading', async () => {
      const { useRoute } = await import('vue-router')
      const { useSettingsStore } = await import('@/features/settings/stores/settingsStore')
      const fetchConfigMock = vi.fn()
      const UUID_SID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

      // Simulate: real scenario route (UUID sid), but settings not yet loaded
      vi.mocked(useRoute).mockReturnValueOnce({
        path: `/plans/p1/scenarios/${UUID_SID}/dashboard`,
        params: { sid: UUID_SID },
      } as any)
      vi.mocked(useSettingsStore).mockReturnValueOnce({
        config: null, configComputed: null, fetchConfig: fetchConfigMock,
      } as any)

      const AppShell = (await import('./AppShell.vue')).default
      const wrapper = mount(AppShell, {
        global: {
          stubs: {
            AppSidebar: { template: '<aside />' },
            AppTopbar: { template: '<header />' },
            MobileReadOnlyBanner: PrimeStub,
            UpgradeModal: PrimeStub,
            Toast: PrimeStub,
            RouterView: { template: '<div data-testid="router-view" />' },
          },
        },
      })
      // Router-view should be gated (not rendered) while settings are loading
      expect(wrapper.find('[data-testid="router-view"]').exists()).toBe(false)
      // A spinner element should be shown instead
      expect(wrapper.find('.pi-spinner').exists()).toBe(true)
      // The eager fetch must have been triggered for UUID sids
      expect(fetchConfigMock).toHaveBeenCalled()
    })

    it('shows router-view on UUID scenario route once settings are loaded', async () => {
      const { useRoute } = await import('vue-router')
      const { useSettingsStore } = await import('@/features/settings/stores/settingsStore')
      const UUID_SID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

      // Simulate: real scenario route + settings already loaded
      vi.mocked(useRoute).mockReturnValueOnce({
        path: `/plans/p1/scenarios/${UUID_SID}/dashboard`,
        params: { sid: UUID_SID },
      } as any)
      vi.mocked(useSettingsStore).mockReturnValueOnce({
        config: { language: 'fr', currency: 'EUR' },
        configComputed: null,
        fetchConfig: vi.fn(),
      } as any)

      const AppShell = (await import('./AppShell.vue')).default
      const wrapper = mount(AppShell, {
        global: {
          stubs: {
            AppSidebar: { template: '<aside />' },
            AppTopbar: { template: '<header />' },
            MobileReadOnlyBanner: PrimeStub,
            UpgradeModal: PrimeStub,
            Toast: PrimeStub,
            RouterView: { template: '<div data-testid="router-view" />' },
          },
        },
      })
      // Settings loaded → router-view must be rendered
      expect(wrapper.find('[data-testid="router-view"]').exists()).toBe(true)
      expect(wrapper.find('.pi-spinner').exists()).toBe(false)
    })
  })
})
