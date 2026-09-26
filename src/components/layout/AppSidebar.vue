<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUiStore } from '@/stores/ui'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import { useAuth } from '@/composables/useAuth'
import { useTierGate } from '@/composables/useTierGate'
import PanelMenu from 'primevue/panelmenu'

const { t } = useI18n()
const router = useRouter()
const ui     = useUiStore()
const planStore     = usePlanStore()
const scenarioStore = useScenarioStore()
const { isBusinessUser, isOwner, canOperate, user } = useAuth()
const { isFreemium, isPro, isEnterprise, showUpgradeModal } = useTierGate()

/** Navigate to new-plan wizard only when the user hasn't hit their tier limit. */
function goToNewPlan() {
  const count = planStore.plans.length
  if (isFreemium.value && count >= 1) {
    showUpgradeModal('Additional Business Plans', 'pro')
    return
  }
  if (!isEnterprise.value && !isFreemium.value && count >= 3) {
    showUpgradeModal('Additional Business Plans', 'enterprise')
    return
  }
  router.push('/plans/new')
}

// ── Scenario context ──────────────────────────────────────────────────────────
const scenarioBase = computed(() => {
  if (!planStore.activePlan || !scenarioStore.activeScenario) return null
  return `/plans/${planStore.activePlan.id}/scenarios/${scenarioStore.activeScenario.id}`
})

// Plan status badge
const planStatusSeverity: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-500',
  active:   'bg-emerald-100 text-emerald-700',
  archived: 'bg-amber-100 text-amber-700',
}

// ── OPERATE menu ──────────────────────────────────────────────────────────────
const operateItems = computed(() => {
  const items: any[] = [
    {
      label: t('nav.plans'),
      icon: 'pi pi-briefcase',
      items: [
        { label: t('nav.plans'),   icon: 'pi pi-list', command: () => router.push('/') },
        { label: t('nav.newPlan'), icon: 'pi pi-plus', command: () => goToNewPlan() },
      ],
    },
  ]

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
        label: t('nav.dataInput'),
        icon: 'pi pi-pencil',
        items: [
          { label: t('nav.products'), command: () => router.push(`${base}/products`) },
          { label: t('nav.revenues'), command: () => router.push(`${base}/revenues`) },
          { label: t('nav.staff'),    command: () => router.push(`${base}/staff`) },
          { label: t('nav.capex'),    command: () => router.push(`${base}/capex`) },
          { label: t('nav.opex'),     command: () => router.push(`${base}/opex`) },
        ],
      },
    )
  }

  return items
})

// ── UNDERSTAND menu ───────────────────────────────────────────────────────────
const understandItems = computed(() => {
  if (!scenarioBase.value || !isBusinessUser.value) {
    return [
      {
        label: t('nav.plans'),
        icon: 'pi pi-briefcase',
        items: [
          { label: t('nav.plans'), icon: 'pi pi-list', command: () => router.push('/') },
        ],
      },
    ]
  }

  const base = scenarioBase.value
  return [
    {
      label: t('nav.financialStatements'),
      icon: 'pi pi-chart-bar',
      items: [
        { label: t('nav.pnl'),      command: () => router.push(`${base}/pnl`) },
        { label: t('nav.pnlCash'),  command: () => router.push(`${base}/pnl-cash`) },
        { label: t('nav.fiplan'),   command: () => router.push(`${base}/fiplan`) },
      ],
    },
    {
      label: t('nav.analysis'),
      icon: 'pi pi-chart-line',
      items: [
        { label: t('nav.bsheet'), command: () => router.push(`${base}/bsheet`) },
        { label: t('nav.ratios'), command: () => router.push(`${base}/ratios`) },
        { label: t('nav.wcr'),    command: () => router.push(`${base}/wcr`) },
      ],
    },
    {
      label: t('nav.cashBudget'),
      icon: 'pi pi-wallet',
      items: [
        { label: t('nav.cash'),   command: () => router.push(`${base}/cash`) },
        { label: t('nav.budget'), command: () => router.push(`${base}/budget`) },
      ],
    },
    {
      label: t('nav.dashboards'),
      icon: 'pi pi-th-large',
      items: [
        { label: t('nav.graphs'),        command: () => router.push(`${base}/graphs`) },
        { label: t('nav.graphsMonthly'), command: () => router.push(`${base}/graphs/monthly`) },
        { label: t('nav.report'),        command: () => router.push(`${base}/report`) },
        { label: t('nav.auditTrail'), icon: 'pi pi-list', command: () => router.push('/audit') },
      ],
    },
    {
      label: t('nav.aiInsights'),
      icon: 'pi pi-sparkles',
      items: [
        { label: t('nav.aiNarrate'), command: () => router.push(`${base}/ai/narrate`) },
        {
          label: isPro.value ? t('nav.aiUnitEconomics')        : t('nav.aiUnitEconomics') + ' 🔒',
          command: () => isPro.value ? router.push(`${base}/ai/unit-economics`)       : showUpgradeModal('Unit Economics', 'pro'),
        },
        {
          label: isPro.value ? t('nav.aiAssumptionReview')     : t('nav.aiAssumptionReview') + ' 🔒',
          command: () => isPro.value ? router.push(`${base}/ai/assumption-review`)    : showUpgradeModal('Assumption Review', 'pro'),
        },
        {
          label: isPro.value ? t('nav.aiBenchmarkCommentary')  : t('nav.aiBenchmarkCommentary') + ' 🔒',
          command: () => isPro.value ? router.push(`${base}/ai/benchmark-commentary`) : showUpgradeModal('Benchmark Commentary', 'pro'),
        },
        {
          label: isPro.value ? t('nav.aiPortfolioMix')         : t('nav.aiPortfolioMix') + ' 🔒',
          command: () => isPro.value ? router.push(`${base}/ai/portfolio-mix`)        : showUpgradeModal('Portfolio Mix', 'pro'),
        },
        {
          label: isPro.value ? t('nav.aiDriverAdvisor')        : t('nav.aiDriverAdvisor') + ' 🔒',
          command: () => isPro.value ? router.push(`${base}/ai/driver-advisor`)       : showUpgradeModal('Driver Advisor', 'pro'),
        },
        {
          label: isPro.value ? t('nav.aiScenarioSuggestion')   : t('nav.aiScenarioSuggestion') + ' 🔒',
          command: () => isPro.value ? router.push(`${base}/ai/scenario-suggestion`)  : showUpgradeModal('Scenario Suggestion', 'pro'),
        },
        {
          label: isPro.value ? t('nav.aiSensitivityNarrative') : t('nav.aiSensitivityNarrative') + ' 🔒',
          command: () => isPro.value ? router.push(`${base}/ai/sensitivity-narrative`): showUpgradeModal('Sensitivity Narrative', 'pro'),
        },
        {
          label: isEnterprise.value ? t('nav.aiInvestorMemo')  : t('nav.aiInvestorMemo') + ' 🔒',
          command: () => isEnterprise.value ? router.push(`${base}/ai/investor-memo`) : showUpgradeModal('Investor Memo', 'enterprise'),
        },
      ],
    },
    {
      label: t('nav.advanced'),
      icon: 'pi pi-star',
      items: [
        {
          label: isPro.value ? t('nav.breakEven') : t('nav.breakEven') + ' 🔒',
          icon: 'pi pi-calculator',
          command: () => isPro.value
            ? router.push(`${base}/bep`)
            : showUpgradeModal('Break-Even Analysis', 'pro'),
        },
        {
          label: isPro.value ? t('nav.capTable') : t('nav.capTable') + ' 🔒',
          icon: 'pi pi-chart-pie',
          command: () => isPro.value
            ? router.push(`/plans/${planStore.activePlan?.id}/cap-table`)
            : showUpgradeModal('Cap Table', 'pro'),
        },
      ],
    },
    {
      label: t('nav.versionHistory'),
      icon: 'pi pi-history',
      items: [
        { label: t('nav.snapshots'), command: () => router.push(`${base}/snapshots`) },
      ],
    },
  ]
})

// ── ADMIN menu ────────────────────────────────────────────────────────────────
const adminItems = computed(() => [
  {
    label: t('nav.admin'),
    icon: 'pi pi-shield',
    items: [
      { label: t('nav.adminDashboard'),  icon: 'pi pi-chart-pie', command: () => router.push('/admin/dashboard') },
      { label: t('nav.users'),           icon: 'pi pi-users',     command: () => router.push('/admin/users') },
      { label: t('nav.tenants'),         icon: 'pi pi-building',  command: () => router.push('/admin/tenants') },
      { label: t('nav.organizations'),   icon: 'pi pi-sitemap',   command: () => router.push('/admin/organizations') },
      { label: t('nav.countryConfigs'),  icon: 'pi pi-globe',     command: () => router.push('/admin/country-configs') },
      { label: t('nav.aiUsage'),         icon: 'pi pi-sparkles',  command: () => router.push('/admin/ai-usage') },
      { label: t('nav.featurePolicies'), icon: 'pi pi-sliders-h', command: () => router.push('/admin/feature-policies') },
    ],
  },
])

// ── Owner team menu (appended to business layers) ─────────────────────────────
const teamItems = computed(() => {
  if (!isOwner.value) return []
  return [
    {
      label: t('nav.myTeam'),
      icon: 'pi pi-users',
      items: [
        { label: t('nav.users'),  icon: 'pi pi-user',     command: () => router.push('/team/users') },
        { label: t('nav.tenant'), icon: 'pi pi-building', command: () => router.push('/admin/tenant') },
      ],
    },
  ]
})

// ── Active menu ───────────────────────────────────────────────────────────────
const activeItems = computed(() => {
  if (user.value?.role === 'admin') return adminItems.value
  // Readers can only see the Analyse layer — ignore any active layer state
  const layer = canOperate.value ? ui.activeLayer : 'understand'
  const base = layer === 'operate' ? operateItems.value : understandItems.value
  return [...base, ...teamItems.value]
})
</script>

<template>
  <aside
    class="bg-white border-r border-gray-200 overflow-y-auto shrink-0 flex flex-col h-full transition-all duration-300"
    :class="ui.isMobile ? ['w-72', 'max-w-[calc(100vw-56px)]'] : (ui.sidebarCollapsed ? 'w-16' : 'w-64')"
  >
    <!-- Mobile header: logo + close button -->
    <div v-if="ui.isMobile" class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
      <img src="/logo.png" alt="Ascenda" style="height:24px;width:auto;" />
      <button
        class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        @click="ui.closeDrawer()"
        aria-label="Close menu"
      >
        <i class="pi pi-times text-sm"></i>
      </button>
    </div>
    <div class="p-3 flex flex-col gap-3 flex-1" v-show="!ui.sidebarCollapsed">

      <!-- ── Scenario context button ──────────────────────────────────── -->
      <div v-if="scenarioBase && isBusinessUser">
        <button
          @click="router.push(scenarioBase)"
          class="w-full flex items-start gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 transition-colors text-left"
          v-tooltip.right="'Back to scenario overview'"
        >
          <i class="pi pi-arrow-left text-xs shrink-0 mt-0.5"></i>
          <div class="flex-1 min-w-0">
            <span class="truncate block">{{ scenarioStore.activeScenario?.name }}</span>
            <span
              v-if="planStore.activePlan?.status"
              :class="[
                'inline-block text-xs font-medium px-1.5 py-0.5 rounded-sm mt-0.5',
                planStatusSeverity[planStore.activePlan.status] ?? 'bg-gray-100 text-gray-500'
              ]"
            >
              {{ t(`enums.planStatus.${planStore.activePlan.status}`, planStore.activePlan.status) }}
            </span>
          </div>
        </button>
      </div>

      <!-- ── Layer switcher (business users only) ─────────────────────── -->
      <div v-if="isBusinessUser && user?.role !== 'admin'" class="flex rounded-lg bg-gray-100 p-1 gap-1">
        <!-- OPERATE tab: only visible to editors and owners -->
        <button
          v-if="canOperate"
          :class="[
            'flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-1.5 rounded-md transition-all',
            ui.activeLayer === 'operate'
              ? 'bg-white shadow-sm text-indigo-700'
              : 'text-gray-400 hover:text-gray-600',
          ]"
          @click="ui.setLayer('operate')"
        >
          <i class="pi pi-cog text-xs"></i>
          {{ t('ui.layerOperate') }}
        </button>
        <!-- ANALYSE tab: always visible to business users -->
        <button
          :class="[
            'flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-1.5 rounded-md transition-all',
            (!canOperate || ui.activeLayer === 'understand')
              ? 'bg-white shadow-sm text-violet-700'
              : 'text-gray-400 hover:text-gray-600',
          ]"
          @click="ui.setLayer('understand')"
        >
          <i class="pi pi-chart-bar text-xs"></i>
          {{ t('ui.layerAnalyse') }}
        </button>
      </div>

      <!-- ── Active nav ────────────────────────────────────────────────── -->
      <PanelMenu :model="activeItems" class="w-full" />

    </div>
  </aside>
</template>
