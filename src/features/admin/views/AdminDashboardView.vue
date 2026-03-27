<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useAdminStatsStore } from '@/features/admin/stores/adminStatsStore'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'

const store = useAdminStatsStore()

onMounted(() => store.fetchStats())

// ── KPI card helpers ──────────────────────────────────────────────────────────

interface KpiCard {
  label: string
  value: number | string
  sub?: string
  icon: string
  iconBg: string
  iconColor: string
}

const userCards = computed<KpiCard[]>(() => {
  const u = store.stats?.users
  return [
    {
      label: 'Total Users',
      value: u?.total ?? '—',
      sub: `${u?.active ?? 0} active · ${u?.inactive ?? 0} inactive`,
      icon: 'pi-users',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Owners',
      value: u?.byRole.owner ?? '—',
      sub: 'Organization admin',
      icon: 'pi-crown',
      iconBg: 'bg-red-50',
      iconColor: 'text-red-500',
    },
    {
      label: 'Admins',
      value: u?.byRole.admin ?? '—',
      sub: 'User management only',
      icon: 'pi-shield',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-500',
    },
    {
      label: 'Members',
      value: u?.byRole.user ?? '—',
      sub: 'Plan access via membership',
      icon: 'pi-user',
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
    },
  ]
})

const contentCards = computed<KpiCard[]>(() => {
  const p = store.stats?.plans
  const s = store.stats?.scenarios
  return [
    {
      label: 'Total Plans',
      value: p?.total ?? '—',
      sub: `${p?.byStatus.active ?? 0} active · ${p?.byStatus.draft ?? 0} draft · ${p?.byStatus.archived ?? 0} archived`,
      icon: 'pi-briefcase',
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    },
    {
      label: 'Active Plans',
      value: p?.byStatus.active ?? '—',
      sub: 'Currently running',
      icon: 'pi-play-circle',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Draft Plans',
      value: p?.byStatus.draft ?? '—',
      sub: 'In preparation',
      icon: 'pi-file-edit',
      iconBg: 'bg-sky-50',
      iconColor: 'text-sky-500',
    },
    {
      label: 'Scenarios',
      value: s?.total ?? '—',
      sub: 'Across all plans',
      icon: 'pi-sitemap',
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
  ]
})

// ── Recent activity helpers ───────────────────────────────────────────────────

function activityIcon(type: 'plan' | 'scenario') {
  return type === 'plan' ? 'pi-briefcase' : 'pi-sitemap'
}

function activityColor(action: 'created' | 'updated') {
  return action === 'created' ? 'text-emerald-600 bg-emerald-50' : 'text-blue-600 bg-blue-50'
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
      <p class="text-gray-500 text-sm mt-1">Overview of users, plans, and activity in your organization</p>
    </div>

    <!-- Loading state -->
    <div v-if="store.loading" class="flex justify-center py-20">
      <ProgressSpinner />
    </div>

    <!-- Error state -->
    <div v-else-if="store.error" class="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
      <i class="pi pi-exclamation-circle text-red-400 text-3xl mb-2"></i>
      <p class="text-red-600 font-medium">{{ store.error }}</p>
    </div>

    <template v-else-if="store.stats">
      <!-- ── Users section ────────────────────────────────────────────────── -->
      <h2 class="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Users</h2>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div
          v-for="card in userCards"
          :key="card.label"
          class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
        >
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm text-gray-500">{{ card.label }}</p>
              <p class="text-3xl font-bold text-gray-800 mt-1">{{ card.value }}</p>
            </div>
            <div :class="['w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', card.iconBg]">
              <i :class="['pi text-lg', card.icon, card.iconColor]"></i>
            </div>
          </div>
          <p v-if="card.sub" class="mt-3 text-xs text-gray-400">{{ card.sub }}</p>
        </div>
      </div>

      <!-- ── Content section ─────────────────────────────────────────────── -->
      <h2 class="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Content</h2>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div
          v-for="card in contentCards"
          :key="card.label"
          class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
        >
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm text-gray-500">{{ card.label }}</p>
              <p class="text-3xl font-bold text-gray-800 mt-1">{{ card.value }}</p>
            </div>
            <div :class="['w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', card.iconBg]">
              <i :class="['pi text-lg', card.icon, card.iconColor]"></i>
            </div>
          </div>
          <p v-if="card.sub" class="mt-3 text-xs text-gray-400">{{ card.sub }}</p>
        </div>
      </div>

      <!-- ── Bottom grid: Activity + Top Users ──────────────────────────── -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- Recent Activity -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div class="px-5 py-4 border-b border-gray-100">
            <h3 class="font-semibold text-gray-800">Recent Activity</h3>
            <p class="text-xs text-gray-400 mt-0.5">Last created or updated items</p>
          </div>
          <div class="divide-y divide-gray-50">
            <div
              v-if="!store.stats.recentActivity.length"
              class="px-5 py-8 text-center text-gray-400 text-sm"
            >
              No recent activity
            </div>
            <div
              v-for="(item, i) in store.stats.recentActivity"
              :key="i"
              class="flex items-center gap-3 px-5 py-3"
            >
              <div :class="['w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', activityColor(item.action)]">
                <i :class="['pi text-sm', activityIcon(item.type)]"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 truncate">{{ item.name }}</p>
                <p class="text-xs text-gray-400">
                  {{ item.action === 'created' ? 'Created' : 'Updated' }} by {{ item.actor }}
                </p>
              </div>
              <span class="text-xs text-gray-400 flex-shrink-0">{{ timeAgo(item.at) }}</span>
            </div>
          </div>
        </div>

        <!-- Top Users -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100">
            <h3 class="font-semibold text-gray-800">Top Users by Activity</h3>
            <p class="text-xs text-gray-400 mt-0.5">Plans and scenarios owned per user</p>
          </div>
          <DataTable
            :value="store.stats.topUsers"
            class="p-datatable-sm"
            :pt="{ root: { style: 'border: none' } }"
          >
            <template #empty>
              <div class="text-center py-6 text-gray-400 text-sm">No data available</div>
            </template>

            <Column field="name" header="User">
              <template #body="{ data }">
                <div>
                  <p class="text-sm font-medium text-gray-800">{{ data.name || '—' }}</p>
                  <p class="text-xs text-gray-400">{{ data.email }}</p>
                </div>
              </template>
            </Column>

            <Column field="planCount" header="Plans" style="width: 80px; text-align: center">
              <template #body="{ data }">
                <Tag :value="String(data.planCount)" severity="info" />
              </template>
            </Column>

            <Column field="scenarioCount" header="Scenarios" style="width: 100px; text-align: center">
              <template #body="{ data }">
                <Tag :value="String(data.scenarioCount)" severity="secondary" />
              </template>
            </Column>
          </DataTable>
        </div>

      </div>
    </template>
  </div>
</template>
