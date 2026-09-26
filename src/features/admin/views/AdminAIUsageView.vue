<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useAdminAiUsageStore } from '@/features/admin/stores/adminAiUsageStore'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'

const store = useAdminAiUsageStore()

// ── Date range ────────────────────────────────────────────────────────────────
// Default: last 30 days. User can pick 7 / 30 / 90.
const windowDays = ref<7 | 30 | 90>(30)

function loadWindow(days: 7 | 30 | 90) {
  windowDays.value = days
  const end   = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  store.fetchStats(start.toISOString(), end.toISOString())
}

onMounted(() => loadWindow(30))

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatCost(cents: number): string {
  return '$' + (cents / 100).toFixed(2)
}

function successRate(total: number, success: number): string {
  if (total === 0) return '—'
  return ((success / total) * 100).toFixed(1) + '%'
}

function successSeverity(total: number, success: number): string {
  if (total === 0) return 'secondary'
  const rate = (success / total) * 100
  if (rate >= 95) return 'success'
  if (rate >= 80) return 'warn'
  return 'danger'
}

// ── Feature label map ─────────────────────────────────────────────────────────
const featureLabels: Record<string, string> = {
  AI_PLAN_NARRATION:        'Plan Narration',
  AI_VARIANCE_ANALYSIS:     'Variance Analysis',
  AI_SCENARIO_COMPARISON:   'Scenario Comparison',
  AI_ANOMALY_DETECTION:     'Anomaly Detection',
  AI_CASH_RUNWAY:           'Cash Runway',
  AI_UNIT_ECONOMICS:        'Unit Economics',
  AI_ASSUMPTION_REVIEW:     'Assumption Review',
  AI_BENCHMARK_COMMENTARY:  'Benchmark Commentary',
  AI_PORTFOLIO_MIX:         'Portfolio Mix',
  AI_DRIVER_ADVISOR:        'Driver Advisor',
  AI_SCENARIO_SUGGESTION:   'Scenario Suggestion',
  AI_SENSITIVITY_NARRATIVE: 'Sensitivity Narrative',
  AI_INVESTOR_MEMO:         'Investor Memo',
}

function featureLabel(key: string): string {
  return featureLabels[key] ?? key
}

// ── Totals for the window ─────────────────────────────────────────────────────
const totalCallsWindow   = computed(() => store.stats?.byFeature.reduce((s, r) => s + r.totalCalls, 0) ?? 0)
const totalTokensWindow  = computed(() => store.stats?.byFeature.reduce((s, r) => s + r.totalTokens, 0) ?? 0)
const totalCostWindow    = computed(() => store.stats?.byFeature.reduce((s, r) => s + r.estimatedCostCents, 0) ?? 0)
const successCallsWindow = computed(() => store.stats?.byFeature.reduce((s, r) => s + r.successfulCalls, 0) ?? 0)
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto space-y-6">

    <!-- ── Header ─────────────────────────────────────────────────────────── -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">AI Usage Dashboard</h1>
        <p class="text-sm text-gray-500 mt-0.5">Platform-wide AI feature consumption across all tenants</p>
      </div>

      <!-- Window selector -->
      <div class="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        <button
          v-for="d in [7, 30, 90] as const"
          :key="d"
          :class="[
            'px-3 py-1.5 text-sm font-medium rounded-md transition-all',
            windowDays === d
              ? 'bg-white shadow-sm text-indigo-700'
              : 'text-gray-500 hover:text-gray-700',
          ]"
          @click="loadWindow(d)"
        >
          {{ d }}d
        </button>
      </div>
    </div>

    <!-- ── Loading ────────────────────────────────────────────────────────── -->
    <div v-if="store.loading" class="flex items-center justify-center h-48">
      <ProgressSpinner style="width:40px;height:40px" />
    </div>

    <template v-else-if="store.stats">

      <!-- ── KPI row 1: live counts ────────────────────────────────────────── -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">

        <!-- Calls Today -->
        <div class="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
          <div class="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
            <i class="pi pi-calendar text-indigo-600 text-lg"></i>
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-900">{{ store.stats.callsToday.toLocaleString() }}</div>
            <div class="text-xs text-gray-500 font-medium">Calls Today</div>
          </div>
        </div>

        <!-- Calls This Week -->
        <div class="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
          <div class="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
            <i class="pi pi-chart-bar text-sky-600 text-lg"></i>
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-900">{{ store.stats.callsWeek.toLocaleString() }}</div>
            <div class="text-xs text-gray-500 font-medium">Calls This Week</div>
          </div>
        </div>

        <!-- Calls This Month -->
        <div class="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
          <div class="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
            <i class="pi pi-sparkles text-violet-600 text-lg"></i>
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-900">{{ store.stats.callsMonth.toLocaleString() }}</div>
            <div class="text-xs text-gray-500 font-medium">Calls This Month</div>
          </div>
        </div>

        <!-- Success rate (window) -->
        <div class="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
          <div class="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <i class="pi pi-check-circle text-emerald-600 text-lg"></i>
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-900">
              {{ successRate(totalCallsWindow, successCallsWindow) }}
            </div>
            <div class="text-xs text-gray-500 font-medium">Success Rate ({{ windowDays }}d)</div>
          </div>
        </div>
      </div>

      <!-- ── KPI row 2: window totals ──────────────────────────────────────── -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">

        <!-- Total calls in window -->
        <div class="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
          <div class="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <i class="pi pi-list text-amber-600 text-lg"></i>
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-900">{{ totalCallsWindow.toLocaleString() }}</div>
            <div class="text-xs text-gray-500 font-medium">Total Calls ({{ windowDays }}d)</div>
          </div>
        </div>

        <!-- Total tokens -->
        <div class="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
          <div class="w-10 h-10 rounded-lg bg-fuchsia-50 flex items-center justify-center shrink-0">
            <i class="pi pi-bolt text-fuchsia-600 text-lg"></i>
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-900">{{ totalTokensWindow.toLocaleString() }}</div>
            <div class="text-xs text-gray-500 font-medium">Tokens Used ({{ windowDays }}d)</div>
          </div>
        </div>

        <!-- Estimated cost -->
        <div class="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
          <div class="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
            <i class="pi pi-dollar text-rose-600 text-lg"></i>
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-900">{{ formatCost(totalCostWindow) }}</div>
            <div class="text-xs text-gray-500 font-medium">Est. Cost ({{ windowDays }}d)</div>
          </div>
        </div>
      </div>

      <!-- ── Feature breakdown ─────────────────────────────────────────────── -->
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100">
          <h2 class="text-base font-semibold text-gray-900">Breakdown by Feature</h2>
          <p class="text-xs text-gray-400 mt-0.5">Last {{ windowDays }} days across all tenants</p>
        </div>

        <DataTable
          :value="store.stats.byFeature"
          :rows="20"
          size="small"
          class="text-sm"
          sort-field="totalCalls"
          :sort-order="-1"
        >
          <Column field="feature" header="Feature" sortable>
            <template #body="{ data }">
              <span class="font-medium text-gray-800">{{ featureLabel(data.feature) }}</span>
            </template>
          </Column>

          <Column field="totalCalls" header="Total Calls" sortable class="text-right">
            <template #body="{ data }">
              <span class="font-semibold">{{ data.totalCalls.toLocaleString() }}</span>
            </template>
          </Column>

          <Column header="Success Rate" class="text-center">
            <template #body="{ data }">
              <Tag
                :value="successRate(data.totalCalls, data.successfulCalls)"
                :severity="successSeverity(data.totalCalls, data.successfulCalls)"
              />
            </template>
          </Column>

          <Column field="totalTokens" header="Tokens" sortable class="text-right">
            <template #body="{ data }">
              {{ data.totalTokens.toLocaleString() }}
            </template>
          </Column>

          <Column header="Est. Cost" class="text-right">
            <template #body="{ data }">
              <span class="text-gray-600">{{ formatCost(data.estimatedCostCents) }}</span>
            </template>
          </Column>
        </DataTable>
      </div>

      <!-- ── Tenant breakdown ──────────────────────────────────────────────── -->
      <div v-if="store.stats.byTenant.length" class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100">
          <h2 class="text-base font-semibold text-gray-900">Breakdown by Tenant</h2>
          <p class="text-xs text-gray-400 mt-0.5">Top 50 tenants by AI consumption — last {{ windowDays }} days</p>
        </div>

        <DataTable
          :value="store.stats.byTenant"
          :rows="20"
          :paginator="store.stats.byTenant.length > 20"
          size="small"
          class="text-sm"
          sort-field="totalCalls"
          :sort-order="-1"
        >
          <Column field="tenantId" header="Tenant ID" sortable>
            <template #body="{ data }">
              <span class="font-mono text-xs text-gray-600">{{ data.tenantId }}</span>
            </template>
          </Column>

          <Column field="totalCalls" header="Total Calls" sortable class="text-right">
            <template #body="{ data }">
              <span class="font-semibold">{{ data.totalCalls.toLocaleString() }}</span>
            </template>
          </Column>

          <Column header="Success Rate" class="text-center">
            <template #body="{ data }">
              <Tag
                :value="successRate(data.totalCalls, data.successfulCalls)"
                :severity="successSeverity(data.totalCalls, data.successfulCalls)"
              />
            </template>
          </Column>

          <Column field="totalTokens" header="Tokens" sortable class="text-right">
            <template #body="{ data }">
              {{ data.totalTokens.toLocaleString() }}
            </template>
          </Column>

          <Column header="Est. Cost" class="text-right">
            <template #body="{ data }">
              <span class="text-gray-600">{{ formatCost(data.estimatedCostCents) }}</span>
            </template>
          </Column>
        </DataTable>
      </div>

      <!-- Empty state for tenant table -->
      <div
        v-else
        class="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400"
      >
        <i class="pi pi-chart-bar text-4xl mb-3 block"></i>
        <p class="text-sm">No AI calls recorded in the selected window.</p>
      </div>

    </template>

    <!-- ── Error state ─────────────────────────────────────────────────────── -->
    <div
      v-else-if="store.error"
      class="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-600"
    >
      <i class="pi pi-exclamation-triangle text-3xl mb-2 block"></i>
      <p class="text-sm font-medium">{{ store.error }}</p>
      <button
        class="mt-3 text-sm underline hover:no-underline"
        @click="loadWindow(windowDays)"
      >
        Retry
      </button>
    </div>

  </div>
</template>
