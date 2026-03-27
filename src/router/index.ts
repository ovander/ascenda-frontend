import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { usePlanMembersStore } from '@/stores/planMembers'

const AppShell = () => import('@/components/layout/AppShell.vue')

const routes: RouteRecordRaw[] = [
  {
    // Legacy login route — kept for magic-link callbacks and direct /login hits.
    // New unauthenticated entry-point is the landing page (landing.html).
    path: '/login',
    name: 'login',
    component: () => import('@/features/auth/views/LoginView.vue'),
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
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/features/plans/views/DashboardView.vue'),
      },
      {
        path: 'plans/new',
        name: 'plan-new',
        component: () => import('@/features/plans/views/PlanWizardView.vue'),
        meta: { requiresEditor: true },
      },
      {
        path: 'plans/:planId',
        name: 'plan-overview',
        component: () => import('@/features/plans/views/PlanOverviewView.vue'),
        props: true,
      },
      // Scenario routes
      {
        path: 'plans/:planId/scenarios/:sid',
        name: 'scenario-dashboard',
        component: () => import('@/features/scenarios/views/ScenarioDashboardView.vue'),
        props: true,
      },
      {
        path: 'plans/:planId/scenarios/:sid/wizard',
        name: 'scenario-wizard',
        component: () => import('@/features/scenarios/views/ScenarioWizardView.vue'),
        props: true,
        meta: { requiresEditor: true },
      },
      {
        path: 'plans/:planId/scenarios/:sid/settings',
        name: 'settings',
        component: () => import('@/features/settings/views/SettingsView.vue'),
        props: true,
      },
      {
        path: 'plans/:planId/scenarios/:sid/products',
        name: 'products',
        component: () => import('@/features/products/views/ProductsView.vue'),
        props: true,
      },
      {
        path: 'plans/:planId/scenarios/:sid/staff',
        name: 'staff',
        component: () => import('@/features/staff/views/StaffView.vue'),
        props: true,
      },
      {
        path: 'plans/:planId/scenarios/:sid/capex',
        name: 'capex',
        component: () => import('@/features/capex/views/CapexView.vue'),
        props: true,
      },
      {
        path: 'plans/:planId/scenarios/:sid/opex',
        name: 'opex',
        component: () => import('@/features/opex/views/OpexView.vue'),
        props: true,
      },
      {
        path: 'plans/:planId/scenarios/:sid/revenues',
        name: 'revenues',
        component: () => import('@/features/revenues/views/RevenueView.vue'),
        props: true,
      },
      {
        path: 'plans/:planId/scenarios/:sid/pnl',
        name: 'pnl',
        component: () => import('@/features/pnl/views/PnlView.vue'),
        props: true,
      },
      {
        path: 'plans/:planId/scenarios/:sid/fiplan',
        name: 'fiplan',
        component: () => import('@/features/fiplan/views/FiplanView.vue'),
        props: true,
      },
      {
        path: 'plans/:planId/scenarios/:sid/pnl-cash',
        name: 'pnl-cash',
        component: () => import('@/features/pnl-cash/views/PnlCashView.vue'),
        props: true,
      },
      {
        path: 'plans/:planId/scenarios/:sid/bsheet',
        name: 'bsheet',
        component: () => import('@/features/bsheet/views/BSheetView.vue'),
        props: true,
      },
      {
        path: 'plans/:planId/scenarios/:sid/ratios',
        name: 'ratios',
        component: () => import('@/features/ratios/views/RatiosView.vue'),
        props: true,
      },
      {
        path: 'plans/:planId/scenarios/:sid/wcr',
        name: 'wcr',
        component: () => import('@/features/wcr/views/WcrView.vue'),
        props: true,
      },
      {
        path: 'plans/:planId/scenarios/:sid/cash',
        name: 'cash',
        component: () => import('@/features/cash/views/CashView.vue'),
        props: true,
      },
      {
        path: 'plans/:planId/scenarios/:sid/budget',
        name: 'budget',
        component: () => import('@/features/budget/views/BudgetView.vue'),
        props: true,
      },
      {
        path: 'plans/:planId/scenarios/:sid/graphs',
        name: 'graphs',
        component: () => import('@/features/graphs/views/GraphDashboardView.vue'),
        props: true,
      },
      {
        path: 'plans/:planId/scenarios/:sid/graphs/monthly',
        name: 'graphs-monthly',
        component: () => import('@/features/graphs/views/MonthlyGraphView.vue'),
        props: true,
      },
      {
        path: 'plans/:planId/scenarios/:sid/report',
        name: 'report',
        component: () => import('@/features/report/views/FullReportView.vue'),
        props: true,
      },
      {
        path: 'plans/:planId/scenarios/:sid/snapshots',
        name: 'snapshots',
        component: () => import('@/features/snapshots/views/SnapshotsView.vue'),
        props: true,
      },
      // ── AI Intelligence modules ───────────────────────────────────
      // Single generic view handles all 9 AI feature endpoints.
      // Tier enforcement is done client-side via gate() in the view;
      // the backend enforces it independently via TierGateMiddleware.
      {
        path: 'plans/:planId/scenarios/:sid/ai/:feature',
        name: 'ai-narration',
        component: () => import('@/features/ai/views/AINarrationView.vue'),
        props: true,
      },
      // ── Pro-tier modules ─────────────────────────────────────────
      {
        path: 'plans/:planId/cap-table',
        name: 'cap-table',
        component: () => import('@/features/captable/views/CapTableView.vue'),
        props: true,
        meta: { requiresPro: true },
      },
      {
        path: 'plans/:planId/scenarios/:sid/bep',
        name: 'bep',
        component: () => import('@/features/bep/views/BepView.vue'),
        props: true,
        meta: { requiresPro: true },
      },
      // Audit trail (tenant-wide, all authenticated users)
      {
        path: 'audit',
        name: 'audit',
        component: () => import('@/features/audit/views/AuditView.vue'),
      },
      // Admin routes — platform-wide admin (role=admin) only
      {
        path: 'admin/dashboard',
        name: 'admin-dashboard',
        component: () => import('@/features/admin/views/AdminDashboardView.vue'),
        meta: { requiresAdmin: true },
      },
      {
        path: 'admin/users',
        name: 'admin-users',
        component: () => import('@/features/admin/views/AdminUsersView.vue'),
        meta: { requiresAdmin: true },
      },
      {
        path: 'admin/country-configs',
        name: 'admin-country-configs',
        component: () => import('@/features/admin/views/AdminCountryConfigView.vue'),
        meta: { requiresAdmin: true },
      },
      // Owner routes — tenant owner only
      {
        path: 'admin/tenant',
        name: 'admin-tenant',
        component: () => import('@/features/admin/views/TenantSettingsView.vue'),
        meta: { requiresOwner: true },
      },
      {
        path: 'team/users',
        name: 'team-users',
        component: () => import('@/features/admin/views/UserManagementView.vue'),
        meta: { requiresOwner: true },
      },
      {
        path: 'admin/access-matrix',
        name: 'access-matrix',
        component: () => import('@/features/admin/views/AccessMatrixView.vue'),
        meta: { requiresOwner: true },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()

  if (to.meta.public) {
    return next()
  }

  if (!auth.isAuthenticated) {
    // Redirect unauthenticated visitors to the marketing landing page.
    // Preserve the intended destination so the sign-up / login flow can
    // bounce them back after authentication.
    const redirect = to.fullPath !== '/' ? `?redirect=${encodeURIComponent(to.fullPath)}` : ''
    window.location.href = `/landing.html${redirect}`
    return
  }

  // Platform admin only (role=admin)
  if (to.meta.requiresAdmin) {
    if (auth.user?.role !== 'admin') {
      return next({ name: 'dashboard' })
    }
  }

  // Owner only
  if (to.meta.requiresOwner) {
    if (auth.user?.role !== 'owner') {
      return next({ name: 'dashboard' })
    }
  }

  // Platform admin cannot access business routes (plans, scenarios, etc.)
  // They are locked to admin-only views.
  if (auth.user?.role === 'admin' && !to.meta.requiresAdmin && !to.meta.public) {
    const adminAllowed = ['admin-dashboard', 'admin-users', 'admin-country-configs']
    if (!adminAllowed.includes(to.name as string)) {
      return next({ name: 'admin-dashboard' })
    }
  }

  // Pro-tier gate: block access to Pro/Enterprise-only routes for Standard tenants.
  // The backend enforces this independently via TierGateMiddleware; this guard is
  // a UX improvement that prevents the loading flicker on unauthorised navigation.
  if (to.meta.requiresPro) {
    const tenantStore = useTenantStore()
    const tier = tenantStore.tenant?.tier
    // Only block if we have a tenant loaded and it is clearly not Pro/Enterprise.
    // If tenant is not yet loaded we let through (backend will enforce it).
    if (tier && tier !== 'pro' && tier !== 'enterprise') {
      return next({ name: 'dashboard', query: { upgrade: '1' } })
    }
  }

  // Editor gate: block write-only routes (wizards, etc.) for viewer-only users.
  // Owners always have edit access. Tenant admins always have edit access.
  // For tenant-level users, we rely on the planMembers store which is populated
  // when the plan is loaded. If membership is not yet loaded, let through and
  // rely on backend enforcement + the view's own canEdit check.
  if (to.meta.requiresEditor) {
    const role = auth.user?.role
    if (role !== 'owner' && role !== 'admin') {
      const planMembersStore = usePlanMembersStore()
      // If we have membership data loaded and the user cannot edit, redirect.
      if (planMembersStore.myPlanRole && !planMembersStore.canEdit) {
        return next({ name: 'dashboard' })
      }
    }
  }

  next()
})

export default router
