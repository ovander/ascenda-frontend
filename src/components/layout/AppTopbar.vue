<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAuth } from '@/composables/useAuth'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import { useSettingsStore } from '@/features/settings/stores/settingsStore'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import { useI18n } from 'vue-i18n'
import { useUiStore } from '@/stores/ui'
import { useTenantStore } from '@/stores/tenant'
import { useDisplayUnitStore } from '@/stores/displayUnit'
import SelectButton from 'primevue/selectbutton'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { logout, isAdmin, isOwner } = useAuth()
const ui = useUiStore()
const tenantStore = useTenantStore()

const tierBadgeClass = computed(() => {
  switch (tenantStore.tenant?.tier) {
    case 'enterprise': return 'bg-violet-100 text-violet-700 border border-violet-200'
    case 'pro':        return 'bg-indigo-100 text-indigo-700 border border-indigo-200'
    default:           return 'bg-gray-100 text-gray-500 border border-gray-200'
  }
})

const tierLabel = computed(() => {
  switch (tenantStore.tenant?.tier) {
    case 'enterprise': return 'Enterprise'
    case 'pro':        return 'Pro'
    default:           return 'Free'
  }
})
const planStore = usePlanStore()
const scenarioStore = useScenarioStore()
const settingsStore = useSettingsStore()

const userMenu = ref()

const roleLabel = computed(() => {
  switch (auth.user?.role) {
    case 'owner': return t('roles.owner')
    case 'admin': return t('roles.admin')
    case 'user':  return t('roles.user')
    default:      return auth.user?.role || ''
  }
})

const roleBadgeClass = computed(() => {
  switch (auth.user?.role) {
    case 'owner': return 'bg-purple-100 text-purple-700'
    case 'admin': return 'bg-blue-100 text-blue-700'
    case 'user':  return 'bg-green-100 text-green-700'
    default:      return 'bg-gray-100 text-gray-600'
  }
})

const userMenuItems = computed(() => [
  // Owner → direct access to org/tenant settings
  ...(isOwner.value ? [{ label: t('nav.tenant'), icon: 'pi pi-building', command: () => router.push('/admin/tenant') }] : []),
  // Admin role → shortcut to admin dashboard
  ...(isAdmin.value && !isOwner.value ? [{ label: t('nav.admin'), icon: 'pi pi-shield', command: () => router.push('/admin/dashboard') }] : []),
  { label: t('auth.logout'), icon: 'pi pi-sign-out', command: () => handleLogout() },
])

// Maps Vue Router route names to their i18n nav keys
const routeModuleMap: Record<string, string> = {
  settings:        'nav.config',
  products:        'nav.products',
  staff:           'nav.staff',
  capex:           'nav.capex',
  opex:            'nav.opex',
  pnl:             'nav.pnl',
  'pnl-cash':      'nav.pnlCash',
  fiplan:          'nav.fiplan',
  bsheet:          'nav.bsheet',
  ratios:          'nav.ratios',
  wcr:             'nav.wcr',
  cash:            'nav.cash',
  budget:          'nav.budget',
  graphs:          'nav.graphs',
  'graphs-monthly':'nav.graphsMonthly',
  report:          'nav.report',
  snapshots:       'nav.snapshots',
  audit:           'nav.auditTrail',
}

const breadcrumbItems = computed(() => {
  const items: Array<{ label: string; to?: string }> = []
  if (planStore.activePlan) {
    // No dedicated /plans/:id route — link back to the plan list
    items.push({ label: planStore.activePlan.name, to: '/' })
  }
  if (scenarioStore.activeScenario) {
    items.push({
      label: scenarioStore.activeScenario.name,
      to: `/plans/${planStore.activePlan?.id}/scenarios/${scenarioStore.activeScenario.id}`,
    })
  }
  // Append current module name (no link — you are here)
  const moduleKey = routeModuleMap[route.name as string]
  if (moduleKey) {
    items.push({ label: t(moduleKey) })
  }
  return items
})

const displayUnitStore = useDisplayUnitStore()
const unitOptions = ['€', 'k€', 'M€']

function toggleUserMenu(event: Event) {
  userMenu.value.toggle(event)
}

async function handleLogout() {
  await logout()
  // After logout, land on the marketing page (not the app login screen)
  window.location.href = '/landing.html'
}
</script>

<template>
  <header class="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm">
    <div class="flex items-center gap-4">
      <Button
        icon="pi pi-bars"
        text
        severity="secondary"
        @click="ui.toggleSidebar()"
      />
      <router-link to="/" class="flex items-center gap-2 text-primary-600 font-bold text-lg no-underline">
        <i class="pi pi-chart-bar text-xl"></i>
        <span>Ascenda</span>
      </router-link>

      <!-- Custom breadcrumb: items with `to` are real links, last item is plain text -->
      <nav v-if="breadcrumbItems.length" class="flex items-center gap-1 text-sm">
        <i class="pi pi-chevron-right text-gray-300 text-xs"></i>
        <template v-for="(item, index) in breadcrumbItems" :key="index">
          <router-link
            v-if="item.to"
            :to="item.to"
            class="text-gray-500 hover:text-primary-600 hover:underline transition-colors cursor-pointer"
          >{{ item.label }}</router-link>
          <span v-else class="text-gray-800 font-medium">{{ item.label }}</span>
          <i
            v-if="index < breadcrumbItems.length - 1"
            class="pi pi-chevron-right text-gray-300 text-xs"
          ></i>
        </template>
      </nav>
    </div>

    <div class="flex items-center gap-3">
      <!-- Unit selector: click a pill to switch between €, k€, M€ -->
      <SelectButton
        v-model="displayUnitStore.unit"
        :options="unitOptions"
        @update:modelValue="displayUnitStore.setUnit($event)"
        :pt="{
          root: { class: 'flex gap-0.5' },
          button: { class: 'text-xs px-2 py-1 rounded border font-medium cursor-pointer' },
        }"
        class="unit-selector"
      />
      <!-- User menu trigger: name + role badge -->
      <button
        class="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 text-sm text-gray-700 transition-colors cursor-pointer border-0 bg-transparent"
        @click="toggleUserMenu"
      >
        <i class="pi pi-user text-gray-500"></i>
        <span class="font-medium">{{ auth.user?.name || auth.user?.email || '' }}</span>
        <span
          v-if="auth.user?.role"
          :class="roleBadgeClass"
          class="px-1.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wide"
        >{{ roleLabel }}</span>
      </button>
      <Menu ref="userMenu" :model="userMenuItems" :popup="true" />
      <!-- Tier badge -->
      <span
        :class="tierBadgeClass"
        class="px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide"
      >{{ tierLabel }}</span>
    </div>
  </header>
</template>
