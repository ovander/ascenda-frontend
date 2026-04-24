<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAuth } from '@/composables/useAuth'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import { useI18n } from 'vue-i18n'
import { useUiStore } from '@/stores/ui'
import { useDisplayUnitStore, type DisplayUnit } from '@/stores/displayUnit'
import { useTierGate } from '@/composables/useTierGate'
import SelectButton from 'primevue/selectbutton'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { logout, isAdmin, isOwner } = useAuth()
const ui = useUiStore()

const { currentTier } = useTierGate()

const tierLabel = computed(() => {
  switch (currentTier.value) {
    case 'pro':        return t('enums.tier.pro')
    case 'enterprise': return t('enums.tier.enterprise')
    default:           return t('enums.tier.free')
  }
})

const tierBadgeClass = computed(() => {
  switch (currentTier.value) {
    case 'pro':        return 'bg-indigo-100 text-indigo-700 border border-indigo-200'
    case 'enterprise': return 'bg-purple-100 text-purple-700 border border-purple-200'
    default:           return 'bg-gray-100 text-gray-500 border border-gray-200'
  }
})
const planStore = usePlanStore()
const scenarioStore = useScenarioStore()

const userMenu = ref()

const roleLabel = computed(() => {
  switch (auth.user?.role) {
    case 'owner':  return t('roles.owner')
    case 'admin':  return t('roles.admin')
    case 'editor': return t('roles.editor')
    case 'reader': return t('roles.reader')
    default:       return auth.user?.role || ''
  }
})

const roleBadgeClass = computed(() => {
  switch (auth.user?.role) {
    case 'owner':  return 'bg-purple-100 text-purple-700'
    case 'admin':  return 'bg-blue-100 text-blue-700'
    case 'editor': return 'bg-green-100 text-green-700'
    case 'reader': return 'bg-yellow-100 text-yellow-700'
    default:       return 'bg-gray-100 text-gray-600'
  }
})

const userMenuItems = computed(() => [
  // Unit selector items — only on mobile where SelectButton is hidden
  ...(ui.isMobile ? unitOptions.map(u => ({
    label: u,
    icon: u === displayUnitStore.unit ? 'pi pi-check' : '',
    command: () => displayUnitStore.setUnit(u as DisplayUnit),
  })) : []),
  { separator: true, visible: ui.isMobile },
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
  <header class="bg-white border-b border-gray-200 px-3 md:px-4 py-2 flex items-center justify-between shadow-sm flex-shrink-0">

    <!-- Left: hamburger + logo (mobile) / hamburger + breadcrumb (tablet+) -->
    <div class="flex items-center gap-2 md:gap-4 min-w-0">
      <!-- Hamburger always visible; on desktop it collapses the sidebar inline -->
      <Button
        icon="pi pi-bars"
        text
        severity="secondary"
        @click="ui.toggleSidebar()"
        class="flex-shrink-0"
      />

      <!-- Logo: visible on mobile (sidebar is hidden) and desktop -->
      <router-link to="/" class="flex items-center no-underline flex-shrink-0 md:hidden lg:flex">
        <img src="/logo.png" alt="Ascenda" style="height:24px;width:auto;" />
      </router-link>

      <!-- Breadcrumb: hidden on mobile, visible on tablet+ -->
      <nav
        v-if="breadcrumbItems.length"
        class="hidden md:flex items-center gap-1 text-sm min-w-0"
      >
        <i class="pi pi-chevron-right text-gray-300 text-xs flex-shrink-0"></i>
        <template v-for="(item, index) in breadcrumbItems" :key="index">
          <router-link
            v-if="item.to"
            :to="item.to"
            class="text-gray-500 hover:text-primary-600 hover:underline transition-colors cursor-pointer truncate max-w-[140px]"
          >{{ item.label }}</router-link>
          <span v-else class="text-gray-800 font-medium truncate max-w-[160px]">{{ item.label }}</span>
          <i
            v-if="index < breadcrumbItems.length - 1"
            class="pi pi-chevron-right text-gray-300 text-xs flex-shrink-0"
          ></i>
        </template>
      </nav>
    </div>

    <!-- Right: unit selector + user menu -->
    <div class="flex items-center gap-2 md:gap-3 flex-shrink-0">

      <!-- Unit selector: hidden on mobile (too cramped), visible on tablet+ -->
      <SelectButton
        v-if="auth.user?.role !== 'admin'"
        v-model="displayUnitStore.unit"
        :options="unitOptions"
        @update:modelValue="displayUnitStore.setUnit($event)"
        :pt="{
          root: { class: 'flex gap-0.5' },
          button: { class: 'text-xs px-2 py-1 rounded border font-medium cursor-pointer' },
        }"
        class="unit-selector hidden sm:flex"
      />

      <!-- User menu trigger -->
      <button
        class="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-lg hover:bg-gray-100 text-sm text-gray-700 transition-colors cursor-pointer border-0 bg-transparent"
        @click="toggleUserMenu"
      >
        <i class="pi pi-user text-gray-500"></i>
        <!-- Name hidden on very small screens to save space -->
        <span class="font-medium hidden sm:inline">{{ auth.user?.name || auth.user?.email || '' }}</span>
        <span
          v-if="auth.user?.role"
          :class="roleBadgeClass"
          class="px-1.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wide"
        >{{ roleLabel }}</span>
      </button>
      <Menu ref="userMenu" :model="userMenuItems" :popup="true" />

      <!-- Tier badge: visible from tablet up (too cramped on phones) -->
      <span
        v-if="auth.user?.role !== 'admin'"
        :class="tierBadgeClass"
        class="px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide hidden sm:inline"
      >{{ tierLabel }}</span>
    </div>
  </header>
</template>
