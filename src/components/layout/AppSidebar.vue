<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUiStore } from '@/stores/ui'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import { useAuth } from '@/composables/useAuth'
import { useTierGate } from '@/composables/useTierGate'
import PanelMenu from 'primevue/panelmenu'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const ui = useUiStore()
const planStore = usePlanStore()
const scenarioStore = useScenarioStore()
const { isBusinessUser, isOwner, user } = useAuth()
const { isPro, isEnterprise, showUpgradeModal } = useTierGate()

const scenarioBase = computed(() => {
  if (!planStore.activePlan || !scenarioStore.activeScenario) return null
  return `/plans/${planStore.activePlan.id}/scenarios/${scenarioStore.activeScenario.id}`
})

const menuItems = computed(() => {
  const items: any[] = [
    {
      label: t('nav.dashboard'),
      icon: 'pi pi-home',
      command: () => router.push('/'),
    },
  ]

  // Plans menu only for business users (owner + user), not admin
  if (isBusinessUser.value) {
    items.push({
      label: t('nav.plans'),
      icon: 'pi pi-briefcase',
      items: [
        { label: t('nav.plans'), icon: 'pi pi-list', command: () => router.push('/') },
        { label: t('nav.newPlan'), icon: 'pi pi-plus', command: () => router.push('/plans/new') },
      ],
    })
  }

  if (scenarioBase.value && isBusinessUser.value) {
    const base = scenarioBase.value
    items.push(
      {
        label: t('nav.settings'),
        icon: 'pi pi-cog',
        items: [
          { label: t('nav.config'), command: () => router.push(`${base}/settings`) },
        ],
      },
      {
        label: 'Data Input',
        icon: 'pi pi-pencil',
        items: [
          { label: t('nav.products'), command: () => router.push(`${base}/products`) },
          { label: t('nav.revenues'), command: () => router.push(`${base}/revenues`) },
          { label: t('nav.staff'), command: () => router.push(`${base}/staff`) },
          { label: t('nav.capex'), command: () => router.push(`${base}/capex`) },
          { label: t('nav.opex'), command: () => router.push(`${base}/opex`) },
        ],
      },
      {
        label: 'Financial Statements',
        icon: 'pi pi-chart-bar',
        items: [
          { label: t('nav.pnl'), command: () => router.push(`${base}/pnl`) },
          { label: t('nav.pnlCash'), command: () => router.push(`${base}/pnl-cash`) },
          { label: t('nav.fiplan'), command: () => router.push(`${base}/fiplan`) },
        ],
      },
      {
        label: 'Analysis',
        icon: 'pi pi-chart-line',
        items: [
          { label: t('nav.bsheet'), command: () => router.push(`${base}/bsheet`) },
          { label: t('nav.ratios'), command: () => router.push(`${base}/ratios`) },
          { label: t('nav.wcr'), command: () => router.push(`${base}/wcr`) },
        ],
      },
      {
        label: 'Cash & Budget',
        icon: 'pi pi-wallet',
        items: [
          { label: t('nav.cash'), command: () => router.push(`${base}/cash`) },
          { label: t('nav.budget'), command: () => router.push(`${base}/budget`) },
        ],
      },
      {
        label: 'Dashboards',
        icon: 'pi pi-th-large',
        items: [
          { label: t('nav.graphs'), command: () => router.push(`${base}/graphs`) },
          { label: t('nav.graphsMonthly'), command: () => router.push(`${base}/graphs/monthly`) },
          { label: t('nav.report'), command: () => router.push(`${base}/report`) },
        ],
      },
      {
        label: 'Tools',
        icon: 'pi pi-history',
        items: [
          { label: t('nav.snapshots'), command: () => router.push(`${base}/snapshots`) },
          { label: t('nav.auditTrail'), icon: 'pi pi-list', command: () => router.push('/audit') },
        ],
      },
      {
        label: 'Extra Analysis',
        icon: 'pi pi-star',
        items: [
          // ── Existing Pro tools ────────────────────────────────
          {
            label: isPro.value ? 'Break-Even' : 'Break-Even 🔒',
            icon: 'pi pi-calculator',
            command: () => isPro.value
              ? router.push(`${base}/bep`)
              : showUpgradeModal('Break-Even Analysis', 'pro'),
          },
          {
            label: isPro.value ? 'Cap Table' : 'Cap Table 🔒',
            icon: 'pi pi-chart-pie',
            command: () => isPro.value
              ? router.push(`/plans/${planStore.activePlan?.id}/cap-table`)
              : showUpgradeModal('Cap Table', 'pro'),
          },
          // ── AI Intelligence (standard) ────────────────────────
          {
            label: 'AI Narration',
            icon: 'pi pi-sparkles',
            command: () => router.push(`${base}/ai/narrate`),
          },
          // ── AI Intelligence (Pro) ─────────────────────────────
          {
            label: isPro.value ? 'Unit Economics' : 'Unit Economics 🔒',
            icon: 'pi pi-calculator',
            command: () => isPro.value
              ? router.push(`${base}/ai/unit-economics`)
              : showUpgradeModal('Unit Economics', 'pro'),
          },
          {
            label: isPro.value ? 'Assumption Review' : 'Assumption Review 🔒',
            icon: 'pi pi-flag',
            command: () => isPro.value
              ? router.push(`${base}/ai/assumption-review`)
              : showUpgradeModal('Assumption Review', 'pro'),
          },
          {
            label: isPro.value ? 'Benchmark Commentary' : 'Benchmark Commentary 🔒',
            icon: 'pi pi-chart-bar',
            command: () => isPro.value
              ? router.push(`${base}/ai/benchmark-commentary`)
              : showUpgradeModal('Benchmark Commentary', 'pro'),
          },
          {
            label: isPro.value ? 'Portfolio Mix' : 'Portfolio Mix 🔒',
            icon: 'pi pi-chart-pie',
            command: () => isPro.value
              ? router.push(`${base}/ai/portfolio-mix`)
              : showUpgradeModal('Portfolio Mix', 'pro'),
          },
          {
            label: isPro.value ? 'Driver Advisor' : 'Driver Advisor 🔒',
            icon: 'pi pi-compass',
            command: () => isPro.value
              ? router.push(`${base}/ai/driver-advisor`)
              : showUpgradeModal('Driver Advisor', 'pro'),
          },
          {
            label: isPro.value ? 'Scenario Suggestion' : 'Scenario Suggestion 🔒',
            icon: 'pi pi-code-branch',
            command: () => isPro.value
              ? router.push(`${base}/ai/scenario-suggestion`)
              : showUpgradeModal('Scenario Suggestion', 'pro'),
          },
          {
            label: isPro.value ? 'Sensitivity Narrative' : 'Sensitivity Narrative 🔒',
            icon: 'pi pi-sliders-h',
            command: () => isPro.value
              ? router.push(`${base}/ai/sensitivity-narrative`)
              : showUpgradeModal('Sensitivity Narrative', 'pro'),
          },
          // ── AI Intelligence (Enterprise) ──────────────────────
          {
            label: isEnterprise.value ? 'Investor Memo' : 'Investor Memo 🔒',
            icon: 'pi pi-file',
            command: () => isEnterprise.value
              ? router.push(`${base}/ai/investor-memo`)
              : showUpgradeModal('Investor Memo', 'enterprise'),
          },
        ],
      }
    )
  }

  // Mon équipe: owner manages their workspace users and org settings
  if (isOwner.value) {
    items.push({
      label: t('nav.myTeam'),
      icon: 'pi pi-users',
      items: [
        { label: t('nav.users'), icon: 'pi pi-user', command: () => router.push('/team/users') },
        { label: t('nav.tenant'), icon: 'pi pi-building', command: () => router.push('/admin/tenant') },
      ],
    })
  }

  // Administration section: only for platform 'admin' role (KerPlan operator).
  if (user.value?.role === 'admin') {
    items.push({
      label: t('nav.admin'),
      icon: 'pi pi-shield',
      items: [
        { label: t('nav.adminDashboard'), icon: 'pi pi-chart-pie', command: () => router.push('/admin/dashboard') },
        { label: t('nav.users'), icon: 'pi pi-users', command: () => router.push('/admin/users') },
        { label: t('nav.countryConfigs'), icon: 'pi pi-globe', command: () => router.push('/admin/country-configs') },
      ],
    })
  }

  return items
})
</script>

<template>
  <aside
    class="bg-white border-r border-gray-200 transition-all duration-300 overflow-y-auto flex-shrink-0"
    :class="ui.sidebarCollapsed ? 'w-16' : 'w-64'"
  >
    <div class="p-3" v-show="!ui.sidebarCollapsed">
      <!-- Scenario context: back-to-overview button shown when inside any module -->
      <div v-if="scenarioBase" class="mb-3">
        <button
          @click="router.push(scenarioBase)"
          class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 transition-colors text-left"
          v-tooltip.right="'Back to scenario overview'"
        >
          <i class="pi pi-arrow-left text-xs flex-shrink-0"></i>
          <span class="truncate flex-1">{{ scenarioStore.activeScenario?.name }}</span>
        </button>
      </div>
      <PanelMenu :model="menuItems" class="w-full" />
    </div>
  </aside>
</template>
