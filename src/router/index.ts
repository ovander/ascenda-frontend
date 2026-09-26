import { createRouter, createWebHistory, type RouteLocationNormalized, type RouteLocationRaw, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { usePlanMembersStore } from '@/stores/planMembers'
import { useUiStore } from '@/stores/ui'
import { useFeaturePolicyStore } from '@/features/admin/stores/featurePolicyStore'

const AppShell = () => import('@/components/layout/AppShell.vue')

const routes: RouteRecordRaw[] = [
    {
        path: '/landing',
        name: 'landing',
        component: () => import('@/features/landing/views/LandingView.vue'),
        meta: { public: true },
    },
    {
        path: '/login',
        name: 'login',
        component: { template: '<div></div>' },
        beforeEnter: async () => {
            // Use the shared initiateLogin helper so that the PKCE code_verifier
            // and the OAuth `state` nonce are both generated, stored in
            // sessionStorage, AND included in the authorization URL.
            // The previous inline builder omitted both — causing Socrate to
            // reject the request with "state parameter is required".
            const { useAuth } = await import('@/composables/useAuth')
            const { initiateLogin } = useAuth()
            await initiateLogin()
            return false // prevent Vue Router from rendering the blank component
        },
        meta: { public: true },
    },
  {
    path: '/callback',
    name: 'callback',
    component: () => import('@/features/auth/views/CallbackView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: AppShell,
    children: [
      // ── Plans & Scenarios ─────────────────────────────────────────
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/features/plans/views/DashboardView.vue'),
        meta: { layer: 'operate' },
      },
      {
        path: 'plans/new',
        name: 'plan-new',
        component: () => import('@/features/plans/views/PlanWizardView.vue'),
        meta: { requiresEditor: true, layer: 'operate', mobileBlocked: true },
      },
      {
        path: 'plans/:planId',
        name: 'plan-overview',
        component: () => import('@/features/plans/views/PlanOverviewView.vue'),
        props: true,
        meta: { layer: 'operate' },
      },
      // ── OPERATE layer ─────────────────────────────────────────────
      {
        path: 'plans/:planId/scenarios/:sid/wizard',
        name: 'scenario-wizard',
        component: () => import('@/features/scenarios/views/ScenarioWizardView.vue'),
        props: true,
        meta: { requiresEditor: true, layer: 'operate', mobileBlocked: true },
      },
      {
        path: 'plans/:planId/scenarios/:sid/settings',
        name: 'settings',
        component: () => import('@/features/settings/views/SettingsView.vue'),
        props: true,
        meta: { layer: 'operate', mobileBlocked: true },
      },
      {
        path: 'plans/:planId/scenarios/:sid/products',
        name: 'products',
        component: () => import('@/features/products/views/ProductsView.vue'),
        props: true,
        meta: { layer: 'operate', mobileBlocked: true },
      },
      {
        path: 'plans/:planId/scenarios/:sid/staff',
        name: 'staff',
        component: () => import('@/features/staff/views/StaffView.vue'),
        props: true,
        meta: { layer: 'operate', mobileBlocked: true },
      },
      {
        path: 'plans/:planId/scenarios/:sid/capex',
        name: 'capex',
        component: () => import('@/features/capex/views/CapexView.vue'),
        props: true,
        meta: { layer: 'operate', mobileBlocked: true },
      },
      {
        path: 'plans/:planId/scenarios/:sid/opex',
        name: 'opex',
        component: () => import('@/features/opex/views/OpexView.vue'),
        props: true,
        meta: { layer: 'operate', mobileBlocked: true },
      },
      {
        path: 'plans/:planId/scenarios/:sid/revenues',
        name: 'revenues',
        component: () => import('@/features/revenues/views/RevenueView.vue'),
        props: true,
        meta: { layer: 'operate', mobileBlocked: true },
      },
      // ── UNDERSTAND layer ──────────────────────────────────────────
      {
        path: 'plans/:planId/scenarios/:sid',
        name: 'scenario-dashboard',
        component: () => import('@/features/scenarios/views/ScenarioDashboardView.vue'),
        props: true,
        meta: { layer: 'understand' },
      },
      {
        path: 'plans/:planId/scenarios/:sid/pnl',
        name: 'pnl',
        component: () => import('@/features/pnl/views/PnlView.vue'),
        props: true,
        meta: { layer: 'understand' },
      },
      {
        path: 'plans/:planId/scenarios/:sid/fiplan',
        name: 'fiplan',
        component: () => import('@/features/fiplan/views/FiplanView.vue'),
        props: true,
        meta: { layer: 'understand', mobileBlocked: true },
      },
      {
        path: 'plans/:planId/scenarios/:sid/pnl-cash',
        name: 'pnl-cash',
        component: () => import('@/features/pnl-cash/views/PnlCashView.vue'),
        props: true,
        meta: { layer: 'understand' },
      },
      {
        path: 'plans/:planId/scenarios/:sid/bsheet',
        name: 'bsheet',
        component: () => import('@/features/bsheet/views/BSheetView.vue'),
        props: true,
        meta: { layer: 'understand' },
      },
      {
        path: 'plans/:planId/scenarios/:sid/ratios',
        name: 'ratios',
        component: () => import('@/features/ratios/views/RatiosView.vue'),
        props: true,
        meta: { layer: 'understand' },
      },
      {
        path: 'plans/:planId/scenarios/:sid/wcr',
        name: 'wcr',
        component: () => import('@/features/wcr/views/WcrView.vue'),
        props: true,
        meta: { layer: 'understand' },
      },
      {
        path: 'plans/:planId/scenarios/:sid/cash',
        name: 'cash',
        component: () => import('@/features/cash/views/CashView.vue'),
        props: true,
        meta: { layer: 'understand', mobileBlocked: true },
      },
      {
        path: 'plans/:planId/scenarios/:sid/budget',
        name: 'budget',
        component: () => import('@/features/budget/views/BudgetView.vue'),
        props: true,
        meta: { layer: 'understand', mobileBlocked: true },
      },
      {
        path: 'plans/:planId/scenarios/:sid/graphs',
        name: 'graphs',
        component: () => import('@/features/graphs/views/GraphDashboardView.vue'),
        props: true,
        meta: { layer: 'understand' },
      },
      {
        path: 'plans/:planId/scenarios/:sid/graphs/monthly',
        name: 'graphs-monthly',
        component: () => import('@/features/graphs/views/MonthlyGraphView.vue'),
        props: true,
        meta: { layer: 'understand' },
      },
      {
        path: 'plans/:planId/scenarios/:sid/report',
        name: 'report',
        component: () => import('@/features/report/views/FullReportView.vue'),
        props: true,
        meta: { layer: 'understand', mobileBlocked: true },
      },
      {
        path: 'plans/:planId/scenarios/:sid/snapshots',
        name: 'snapshots',
        component: () => import('@/features/snapshots/views/SnapshotsView.vue'),
        props: true,
        meta: { layer: 'understand' },
      },
      // AI Intelligence — single generic view handles all 9 AI feature endpoints.
      {
        path: 'plans/:planId/scenarios/:sid/ai/:feature',
        name: 'ai-narration',
        component: () => import('@/features/ai/views/AINarrationView.vue'),
        props: true,
        meta: { layer: 'understand' },
      },
      // Pro-tier modules
      {
        path: 'plans/:planId/cap-table',
        name: 'cap-table',
        component: () => import('@/features/captable/views/CapTableView.vue'),
        props: true,
        meta: { requiresPro: true, layer: 'understand' },
      },
      {
        path: 'plans/:planId/scenarios/:sid/bep',
        name: 'bep',
        component: () => import('@/features/bep/views/BepView.vue'),
        props: true,
        meta: { requiresPro: true, layer: 'understand' },
      },
      // Audit trail
      {
        path: 'audit',
        name: 'audit',
        component: () => import('@/features/audit/views/AuditView.vue'),
        meta: { layer: 'understand' },
      },
      // ── ADMIN layer ───────────────────────────────────────────────
      {
        path: 'admin/dashboard',
        name: 'admin-dashboard',
        component: () => import('@/features/admin/views/AdminDashboardView.vue'),
        meta: { requiresAdmin: true, layer: 'admin', mobileBlocked: true },
      },
      {
        path: 'admin/users',
        name: 'admin-users',
        component: () => import('@/features/admin/views/AdminUsersView.vue'),
        meta: { requiresAdmin: true, layer: 'admin', mobileBlocked: true },
      },
      {
        path: 'admin/tenants',
        name: 'admin-tenants',
        component: () => import('@/features/admin/views/AdminTenantsView.vue'),
        meta: { requiresAdmin: true, layer: 'admin', mobileBlocked: true },
      },
      {
        path: 'admin/country-configs',
        name: 'admin-country-configs',
        component: () => import('@/features/admin/views/AdminCountryConfigView.vue'),
        meta: { requiresAdmin: true, layer: 'admin', mobileBlocked: true },
      },
      {
        path: 'admin/ai-usage',
        name: 'admin-ai-usage',
        component: () => import('@/features/admin/views/AdminAIUsageView.vue'),
        meta: { requiresAdmin: true, layer: 'admin', mobileBlocked: true },
      },
      {
        path: 'admin/feature-policies',
        name: 'admin-feature-policies',
        component: () => import('@/features/admin/views/FeaturePoliciesView.vue'),
        meta: { requiresAdmin: true, layer: 'admin', mobileBlocked: true },
      },
      {
        path: 'admin/organizations',
        name: 'admin-organizations',
        component: () => import('@/features/admin/views/AdminOrganizationsView.vue'),
        meta: { requiresAdmin: true, layer: 'admin', mobileBlocked: true },
      },
      // Owner routes — tenant owner only
      {
        path: 'admin/tenant',
        name: 'admin-tenant',
        component: () => import('@/features/admin/views/TenantSettingsView.vue'),
        meta: { requiresOwner: true, mobileBlocked: true },
      },
      {
        path: 'team/users',
        name: 'team-users',
        component: () => import('@/features/admin/views/UserManagementView.vue'),
        meta: { requiresOwner: true, mobileBlocked: true },
      },
      {
        path: 'admin/access-matrix',
        name: 'access-matrix',
        component: () => import('@/features/admin/views/AccessMatrixView.vue'),
        meta: { requiresOwner: true, mobileBlocked: true },
      },
    ],
  },
    {
        path: '/:pathMatch(.*)*',
        redirect: '/landing',
    },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

/**
 * Access rules checked before every navigation. Returns true to let the
 * navigation through, or the location to redirect to instead.
 */
export function accessGuard(to: RouteLocationNormalized): true | RouteLocationRaw {
  // 🔥 CRITIQUE — ne jamais interférer avec landing ni callback
  if (to.meta.public) return true

  const auth = useAuthStore()

  if (!auth.isAuthenticated) {
    const redirect = to.fullPath !== '/' ? `?redirect=${encodeURIComponent(to.fullPath)}` : ''
    return `/landing${redirect}`
  }

  // Lazily fetch feature policies once per session (non-blocking).
  // The store is idempotent — subsequent calls are no-ops.
  useFeaturePolicyStore().fetchAll()

  // Platform admin only
  if (to.meta.requiresAdmin && auth.user?.role !== 'admin') {
    return { name: 'dashboard' }
  }

  // Owner only
  if (to.meta.requiresOwner && auth.user?.role !== 'owner') {
    return { name: 'dashboard' }
  }

  // Platform admin cannot access plan/tenant routes
  if (auth.user?.role === 'admin' && !to.meta.requiresAdmin) {
    const adminAllowed = ['admin-dashboard', 'admin-users', 'admin-tenants', 'admin-country-configs', 'admin-ai-usage', 'admin-feature-policies', 'admin-organizations']
    if (!adminAllowed.includes(String(to.name))) {
      return { name: 'admin-dashboard' }
    }
  }

  // Pro-tier gate
  if (to.meta.requiresPro) {
    const tier = useTenantStore().tenant?.tier
    if (tier && tier !== 'pro' && tier !== 'enterprise') {
      return { name: 'dashboard', query: { upgrade: '1' } }
    }
  }

  // Mobile gate: phones are read-only — block data-entry routes (mobileBlocked: true).
  // dashboard and plan-overview are operate-layer but still accessible on mobile.
  if (to.meta.mobileBlocked && useUiStore().isMobile) {
    if (to.params.planId && to.params.sid) {
      return { name: 'scenario-dashboard', params: { planId: to.params.planId, sid: to.params.sid } }
    }
    return { name: 'dashboard' }
  }

  // Reader gate: readers cannot access Operate (data entry) sections
  if (to.meta.layer === 'operate' && auth.user?.role === 'reader') {
    return { name: 'dashboard' }
  }

  // Editor gate
  if (to.meta.requiresEditor) {
    const role = auth.user?.role
    if (role !== 'owner' && role !== 'admin') {
      const planMembersStore = usePlanMembersStore()
      if (planMembersStore.myPlanRole && !planMembersStore.canEdit) {
        return { name: 'dashboard' }
      }
    }
  }

  return true
}

router.beforeEach(accessGuard)

// ── Auto-switch UX layer + close mobile drawer on every navigation ───────────
router.afterEach((to) => {
  const ui = useUiStore()

  // Close mobile drawer whenever the route changes
  if (ui.isMobile) ui.closeDrawer()

  const layer = to.meta.layer as string | undefined
  if (layer === 'operate' || layer === 'understand') {
    ui.setLayer(layer)
  }
})

export default router
