<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUiStore } from '@/stores/ui'
import { useRouter } from 'vue-router'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useScenarioStore } from '@/features/scenarios/stores/scenarioStore'
import { useSettingsStore } from '@/features/settings/stores/settingsStore'
import { useRatiosStore } from '@/features/ratios/stores/ratiosStore'
import { useFiplanStore } from '@/features/fiplan/stores/fiplanStore'
import PageContainer from '@/components/layout/PageContainer.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import KSection from '@/components/layout/KSection.vue'
import KPIGrid from '@/components/layout/KPIGrid.vue'
import Button from 'primevue/button'
import { usePlanAccess } from '@/composables/usePlanAccess'
import { usePlanMembersStore } from '@/stores/planMembers'
import { useDecimal } from '@/composables/useDecimal'
import { useApi } from '@/composables/useApi'
import { useScenarioAnalysis } from '@/features/scenarios/composables/useScenarioAnalysis'
import { useScenarioAnalysisStore } from '@/features/scenarios/stores/scenarioAnalysisStore'
import ScenarioIntelligenceSection from '@/features/scenarios/components/ScenarioIntelligenceSection.vue'

const props = defineProps<{ planId: string; sid: string }>()
const { t, locale } = useI18n()
const router = useRouter()
const planStore = usePlanStore()
const scenarioStore = useScenarioStore()
const settingsStore = useSettingsStore()
const ratiosStore = useRatiosStore()
const fiplanStore = useFiplanStore()
const analysisStore = useScenarioAnalysisStore()
usePlanAccess()
const planMembers = usePlanMembersStore()
const { formatUnit } = useDecimal()
const scenarioAnalysis = useScenarioAnalysis()

onMounted(async () => {
  if (!planStore.activePlan) await planStore.fetchPlan(props.planId)
  if (!scenarioStore.activeScenario) await scenarioStore.fetchScenario(props.planId, props.sid)
  await Promise.allSettled([
    settingsStore.fetchConfig(),
    planMembers.fetchMembers(props.planId),
    ratiosStore.fetchReport(),
    fiplanStore.fetchReport(),
    // v2: non-blocking — Promise.allSettled absorbs failures silently.
    scenarioAnalysis.fetch(props.planId, props.sid),
  ])
  // Pre-warm the store for child components
  if (planStore.activePlan?.id && scenarioStore.activeScenario?.id) {
    analysisStore.fetchIfNeeded(planStore.activePlan.id, scenarioStore.activeScenario.id)
  }
})

const basePath = computed(() => `/plans/${props.planId}/scenarios/${props.sid}`)

// ── KPI helpers ──────────────────────────────────────────────────────────────

function kpiNum(section: Record<string, (string | number)[]> | undefined, key: string, idx: number): number {
  return Number(section?.[key]?.[idx] ?? 0)
}

function fmtCurrency(val: number): string {
  if (val === 0) return '—'
  return formatUnit(val, 0)
}

function fmtPct(val: number): string {
  if (val === 0) return '—'
  return val.toFixed(1) + '\u00A0%'
}

const kpiCards = computed(() => {
  void locale.value  // subscribe to locale changes so labels re-evaluate on switch
  const r = ratiosStore.report
  const loading = ratiosStore.loading

  const revenueY1   = kpiNum(r?.sales, 'sales', 0)
  // Average annual growth rate across years 1–4 (index 1..4 = Y2..Y5 growth vs prior year)
  const growthRates = r?.sales?.['growthRate'] ?? []
  const validGrowth = growthRates.slice(1).map(Number).filter((v) => isFinite(v))
  const avgGrowth   = validGrowth.length ? validGrowth.reduce((a, b) => a + b, 0) / validGrowth.length : 0
  const ebitdaY1    = kpiNum(r?.profitability, 'ebitda', 0)
  const netProfitY1 = kpiNum(r?.profitability, 'netProfit', 0)
  const cashEOY     = kpiNum(r?.profitability, 'cashAtEoy', 4) // end of Y5
  const npv         = Number(r?.valuation?.npv ?? 0)
  const irr         = Number(r?.valuation?.irr ?? 0)

  const dash = loading ? '…' : '—'

  return [
    { label: t('dashboard.kpi.revenueY1'),   value: revenueY1   ? fmtCurrency(revenueY1)   : dash, icon: 'pi pi-dollar',       color: 'bg-blue-50 text-blue-700' },
    { label: t('dashboard.kpi.avgGrowth'),   value: avgGrowth   ? fmtPct(avgGrowth)         : dash, icon: 'pi pi-arrow-up',     color: 'bg-green-50 text-green-700' },
    { label: t('dashboard.kpi.ebitdaY1'),    value: ebitdaY1    ? fmtCurrency(ebitdaY1)    : dash, icon: 'pi pi-chart-bar',    color: 'bg-purple-50 text-purple-700' },
    { label: t('dashboard.kpi.netProfitY1'), value: netProfitY1 ? fmtCurrency(netProfitY1) : dash, icon: 'pi pi-check-circle', color: 'bg-indigo-50 text-indigo-700' },
    { label: t('dashboard.kpi.cashEOY5'),    value: cashEOY     ? fmtCurrency(cashEOY)     : dash, icon: 'pi pi-wallet',       color: 'bg-teal-50 text-teal-700' },
    { label: t('dashboard.kpi.npv'),         value: npv         ? fmtCurrency(npv)         : dash, icon: 'pi pi-star',         color: 'bg-amber-50 text-amber-700' },
    { label: t('dashboard.kpi.irr'),         value: irr         ? fmtPct(irr)              : dash, icon: 'pi pi-percentage',   color: 'bg-rose-50 text-rose-700' },
    { label: t('dashboard.kpi.payback'),     value: dash,                                           icon: 'pi pi-clock',        color: 'bg-cyan-50 text-cyan-700' },
  ]
})

// ── Fiplan cash status ────────────────────────────────────────────────────────

const fiplanCashStatus = computed<{ hasNegative: boolean; negativeYears: number[] } | null>(() => {
  const w = fiplanStore.report?.warning
  if (!w || w.length === 0) return null
  const negativeYears = w.map((flag, i) => flag ? i + 1 : null).filter((y): y is number => y !== null)
  return { hasNegative: negativeYears.length > 0, negativeYears }
})

// ── Dev-only audit download ───────────────────────────────────────────────────
const isDev = import.meta.env.DEV
const uiStore = useUiStore()
const api = useApi()
const auditDownloading = ref(false)

async function downloadAuditTrail() {
  auditDownloading.value = true
  try {
    const url = `/api/v1/plans/${props.planId}/scenarios/${props.sid}/audit/download`
    const response = await api.get(url, { responseType: 'blob' })
    const blob = new Blob([response.data], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    const disposition: string = response.headers['content-disposition'] ?? ''
    const match = disposition.match(/filename="?([^"]+)"?/)
    link.download = match ? match[1] : `audit-scenario-${props.sid.slice(0, 8)}.json`
    link.click()
    URL.revokeObjectURL(link.href)
  } catch (e) {
    console.error('Audit download failed', e)
  } finally {
    auditDownloading.value = false
  }
}

// ALL_MODULES is a computed so t() re-evaluates when the locale changes.
const ALL_MODULES = computed(() => [
  { name: t('modules.settings.name'), icon: 'pi pi-cog',         path: '/settings',  desc: t('modules.settings.desc'), mobileBlocked: true },
  { name: t('modules.products.name'), icon: 'pi pi-box',         path: '/products',  desc: t('modules.products.desc'), mobileBlocked: true },
  { name: t('modules.revenues.name'), icon: 'pi pi-chart-bar',   path: '/revenues',  desc: t('modules.revenues.desc'), mobileBlocked: true },
  { name: t('modules.staff.name'),    icon: 'pi pi-users',        path: '/staff',     desc: t('modules.staff.desc'),    mobileBlocked: true },
  { name: t('modules.capex.name'),    icon: 'pi pi-building',     path: '/capex',     desc: t('modules.capex.desc'),    mobileBlocked: true },
  { name: t('modules.opex.name'),     icon: 'pi pi-shopping-cart',path: '/opex',      desc: t('modules.opex.desc'),     mobileBlocked: true },
  { name: t('modules.pnl.name'),      icon: 'pi pi-chart-bar',    path: '/pnl',       desc: t('modules.pnl.desc') },
  { name: t('modules.fiplan.name'),   icon: 'pi pi-money-bill',   path: '/fiplan',    desc: t('modules.fiplan.desc'),   mobileBlocked: true },
  { name: t('modules.pnlCash.name'),  icon: 'pi pi-chart-line',   path: '/pnl-cash',  desc: t('modules.pnlCash.desc') },
  { name: t('modules.bsheet.name'),   icon: 'pi pi-server',       path: '/bsheet',    desc: t('modules.bsheet.desc') },
  { name: t('modules.ratios.name'),   icon: 'pi pi-percentage',   path: '/ratios',    desc: t('modules.ratios.desc') },
  { name: t('modules.wcr.name'),      icon: 'pi pi-sync',         path: '/wcr',       desc: t('modules.wcr.desc') },
  { name: t('modules.cash.name'),     icon: 'pi pi-wallet',       path: '/cash',      desc: t('modules.cash.desc'),     mobileBlocked: true },
  { name: t('modules.budget.name'),   icon: 'pi pi-calendar',     path: '/budget',    desc: t('modules.budget.desc'),   mobileBlocked: true },
  { name: t('modules.graphs.name'),   icon: 'pi pi-chart-pie',    path: '/graphs',    desc: t('modules.graphs.desc') },
  { name: t('modules.report.name'),   icon: 'pi pi-file',         path: '/report',    desc: t('modules.report.desc'),   mobileBlocked: true },
  { name: t('modules.snapshots.name'),icon: 'pi pi-history',      path: '/snapshots', desc: t('modules.snapshots.desc'),mobileBlocked: true },
])

const modules = computed(() =>
  uiStore.isMobile ? ALL_MODULES.value.filter(m => !m.mobileBlocked) : ALL_MODULES.value
)
</script>

<template>
  <PageContainer>
    <PageHeader>
      <template #title>
        {{ scenarioStore.activeScenario?.name || 'Scenario' }}
      </template>
      <template #subtitle>
        {{ planStore.activePlan?.name }} — {{ scenarioStore.activeScenario?.description }}
      </template>
      <template #actions>
        <div class="flex items-center gap-2">
          <Button
            v-if="isDev"
            :label="auditDownloading ? 'Downloading…' : 'DEV⚡ Audit Trail'"
            icon="pi pi-download"
            severity="warn"
            outlined
            size="small"
            :loading="auditDownloading"
            @click="downloadAuditTrail"
          />
          <Button
            v-if="!uiStore.isMobile"
            :label="t('scenario.wizard')"
            icon="pi pi-compass"
            severity="secondary"
            outlined
            @click="router.push(`${basePath}/wizard`)"
          />
        </div>
      </template>
    </PageHeader>

    <!-- KPI Cards -->
    <KSection>
      <KPIGrid :cols="4">
        <div v-for="kpi in kpiCards" :key="kpi.label" :class="['rounded-lg p-4 border', kpi.color]">
          <div class="flex items-center gap-2 mb-1">
            <i :class="kpi.icon"></i>
            <span class="text-xs font-medium opacity-75">{{ kpi.label }}</span>
          </div>
          <div class="text-2xl font-bold">{{ kpi.value }}</div>
        </div>
      </KPIGrid>
    </KSection>

    <!-- Scenario Intelligence (v2) -->
    <ScenarioIntelligenceSection
      :analysis="scenarioAnalysis.analysis.value"
      :loading="scenarioAnalysis.loading.value"
      :base-path="basePath"
      @refresh="scenarioAnalysis.fetch(props.planId, props.sid)"
    />

    <!-- Module Cards -->
    <KSection>
      <h2 class="text-lg font-semibold text-gray-700 mb-4">{{ t('dashboard.modules') }}</h2>
      <KPIGrid :cols="4">
        <div
          v-for="mod in modules"
          :key="mod.path"
          class="bg-white rounded-lg border border-gray-200 p-3 md:p-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
          @click="router.push(`${basePath}${mod.path}`)"
        >
          <div class="flex items-center gap-3 mb-2">
            <i :class="[mod.icon, 'text-xl text-blue-600']"></i>
            <span class="font-semibold text-gray-800">{{ mod.name }}</span>
          </div>
          <p class="text-xs text-gray-500">{{ mod.desc }}</p>
          <template v-if="mod.path === '/fiplan' && fiplanCashStatus">
            <div class="mt-2">
              <span
                v-if="fiplanCashStatus.hasNegative"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200"
                :title="`Cumulative cash is negative in ${fiplanCashStatus.negativeYears.map(y => 'Y' + y).join(', ')}`"
              >
                <i class="pi pi-flag-fill" style="font-size: 0.65rem" />
                {{ fiplanCashStatus.negativeYears.map(y => 'Y' + y).join(', ') }}
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200"
                title="Cumulative cash is positive in all five years"
              >
                <i class="pi pi-check-circle" style="font-size: 0.65rem" />
                {{ t('dashboard.cashPositive') }}
              </span>
            </div>
          </template>
        </div>
      </KPIGrid>
    </KSection>
  </PageContainer>
</template>
