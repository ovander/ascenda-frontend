<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useApi } from '@/composables/useApi'
import { useDecimal } from '@/composables/useDecimal'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Card from 'primevue/card'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import ShowOn from '@/components/common/ShowOn.vue'

const api = useApi()
const { getLocale } = useDecimal()

interface AuditEntry {
  id: string
  userId: string
  entityType: string
  entityId: string
  action: string
  changes: any
  createdAt: string
}

const entries = ref<AuditEntry[]>([])
const loading = ref(false)
const page = ref(0)
const pageSize = 50
const totalRecords = ref(0)
const filterEntity = ref<string | null>(null)
const filterAction = ref<string | null>(null)
const globalSearch = ref('')

const entityTypeOptions = [
  { label: 'All types',            value: null },
  // Plan structure
  { label: 'Plan',                 value: 'plan' },
  { label: 'Scenario',             value: 'scenario' },
  { label: 'Snapshot',             value: 'snapshot' },
  // Settings
  { label: 'Settings',             value: 'settings' },
  { label: 'Opening Balance',      value: 'opening_balance' },
  { label: 'Working Capital',      value: 'wc_config' },
  { label: 'Opex per Hire',        value: 'opex_per_hire' },
  { label: 'Capex per Hire',       value: 'capex_per_hire' },
  // Revenue
  { label: 'Product',              value: 'product' },
  { label: 'Product Assumptions',  value: 'product_assumptions' },
  { label: 'Product Volumes',      value: 'product_volumes' },
  { label: 'Product Driver Params',value: 'product_driver_params' },
  { label: 'Product Workforce',    value: 'product_workforce' },
  // Costs
  { label: 'Staff',                value: 'staff' },
  { label: 'Staff Incentives',     value: 'staff_incentives' },
  { label: 'Capex',                value: 'capex' },
  { label: 'Opex',                 value: 'opex' },
  // Financial statements
  { label: 'Financing Plan',       value: 'fiplan' },
  { label: 'P&L',                  value: 'pnl' },
  { label: 'Balance Sheet',        value: 'balance_sheet' },
  { label: 'WCR',                  value: 'wcr' },
  { label: 'Cash Flow',            value: 'cash' },
  { label: 'Budget',               value: 'budget' },
  // Admin
  { label: 'User',                 value: 'user' },
  // System
  { label: 'Audit Export',         value: 'audit_export' },
]

const actionOptions = [
  { label: 'All actions', value: null },
  { label: 'Create',  value: 'create' },
  { label: 'Update',  value: 'update' },
  { label: 'Delete',  value: 'delete' },
  { label: 'Restore', value: 'restore' },
  { label: 'Export',  value: 'export' },
]

async function fetchAudit() {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: String(page.value),
      limit: String(pageSize),
    })
    const response = await api.get(`/api/v1/audit?${params}`)
    const data = response.data ?? response
    entries.value = data.data ?? []
    totalRecords.value = data.total ?? 0
  } catch (e) {
    entries.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchAudit())

function onPage(event: any) {
  page.value = event.page
  fetchAudit()
}

// Client-side filter on top of paginated results
const filtered = computed(() => {
  return entries.value.filter(e => {
    if (filterEntity.value && e.entityType !== filterEntity.value) return false
    if (filterAction.value && e.action !== filterAction.value) return false
    if (globalSearch.value) {
      const q = globalSearch.value.toLowerCase()
      if (!e.entityType.includes(q) && !e.entityId.toLowerCase().includes(q) && !e.userId.toLowerCase().includes(q)) return false
    }
    return true
  })
})

function actionSeverity(action: string) {
  switch (action) {
    case 'create':  return 'success'
    case 'update':  return 'info'
    case 'delete':  return 'danger'
    case 'restore': return 'warn'
    default:        return 'secondary'
  }
}

function entityIcon(entityType: string) {
  const icons: Record<string, string> = {
    // Plan structure
    plan:                  'pi-briefcase',
    scenario:              'pi-code-branch',
    snapshot:              'pi-camera',
    // Settings
    settings:              'pi-cog',
    opening_balance:       'pi-database',
    wc_config:             'pi-arrows-h',
    opex_per_hire:         'pi-calculator',
    capex_per_hire:        'pi-calculator',
    // Revenue
    product:               'pi-box',
    product_assumptions:   'pi-tag',
    product_volumes:       'pi-chart-bar',
    product_driver_params: 'pi-sliders-h',
    product_workforce:     'pi-id-card',
    // Costs
    staff:                 'pi-users',
    staff_incentives:      'pi-star',
    capex:                 'pi-building',
    opex:                  'pi-wallet',
    // Financial statements
    fiplan:                'pi-money-bill',
    pnl:                   'pi-chart-line',
    balance_sheet:         'pi-book',
    wcr:                   'pi-refresh',
    cash:                  'pi-credit-card',
    budget:                'pi-calendar',
    // Admin
    user:                  'pi-user',
    // System
    audit_export:          'pi-download',
  }
  return `pi ${icons[entityType] ?? 'pi-circle'}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(getLocale(), {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function shortId(id: string) {
  return id.slice(0, 8) + '…'
}

function changesPreview(changes: any): string {
  if (!changes) return '—'
  try {
    const obj = typeof changes === 'string' ? JSON.parse(changes) : changes
    const keys = Object.keys(obj)
    if (keys.length === 0) return '—'
    return keys.slice(0, 3).join(', ') + (keys.length > 3 ? ` +${keys.length - 3}` : '')
  } catch {
    return '—'
  }
}

// ── Per-row download ──────────────────────────────────────────────────────────

const downloadingEntryId = ref<string | null>(null)

async function downloadEntry(entry: AuditEntry) {
  downloadingEntryId.value = entry.id
  try {
    const { data } = await api.get(`/api/v1/audit/${entry.id}/detail`)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href     = url
    link.download = `audit-entry-${entry.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('Failed to fetch audit entry detail', e)
  } finally {
    downloadingEntryId.value = null
  }
}

// ── Download ──────────────────────────────────────────────────────────────────

const downloading = ref(false)

async function downloadAudit() {
  downloading.value = true
  try {
    // Backend caps limit at 200 — page through all results
    const BATCH = 200
    let collected: AuditEntry[] = []
    let p = 0
    while (true) {
      const params = new URLSearchParams({ page: String(p), limit: String(BATCH) })
      const response = await api.get(`/api/v1/audit?${params}`)
      const data     = response.data ?? response
      const items: AuditEntry[] = data.data ?? []
      collected = collected.concat(items)
      // Stop when the page is shorter than the batch — we've reached the last page
      if (items.length < BATCH) break
      p++
    }

    // Mirror the same client-side filter applied to the table
    const filtered = collected.filter(e => {
      if (filterEntity.value && e.entityType !== filterEntity.value) return false
      if (filterAction.value && e.action !== filterAction.value) return false
      if (globalSearch.value) {
        const q = globalSearch.value.toLowerCase()
        if (
          !e.entityType.includes(q) &&
          !e.entityId.toLowerCase().includes(q) &&
          !e.userId.toLowerCase().includes(q)
        ) return false
      }
      return true
    })

    const payload = {
      exported:  new Date().toISOString(),
      total:     filtered.length,
      filters: {
        entityType: filterEntity.value ?? null,
        action:     filterAction.value ?? null,
        search:     globalSearch.value || null,
      },
      entries: filtered,
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href     = url
    link.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    // Record the export as an audit entry so it appears in the trail itself
    await api.post('/api/v1/audit/export', {
      totalExported: filtered.length,
      filters: {
        entityType: filterEntity.value ?? null,
        action:     filterAction.value ?? null,
        search:     globalSearch.value || null,
      },
    })

    // Refresh the table so the new export entry is immediately visible
    await fetchAudit()
  } catch (e) {
    console.error('Audit download failed', e)
  } finally {
    downloading.value = false
  }
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <i class="pi pi-history text-primary-600" />
          Audit Trail
        </h1>
        <p class="text-gray-500 mt-1">
          Full activity log of all data changes in your workspace
        </p>
      </div>
      <Button
        label="Download"
        icon="pi pi-download"
        severity="secondary"
        outlined
        :loading="downloading"
        :title="filterEntity || filterAction || globalSearch ? 'Download filtered entries as JSON' : 'Download full audit trail as JSON'"
        @click="downloadAudit"
      />
    </div>

    <!-- Info banner -->
    <div class="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6 text-sm text-blue-800">
      <i class="pi pi-info-circle mt-0.5 text-blue-500 shrink-0" />
      <div>
        <span class="font-semibold">What is the audit trail?</span>
        Every create, update and delete action performed on your plans, scenarios, products, staff, financials and snapshots is automatically recorded here with its timestamp and author. Records are tenant-scoped and immutable.
      </div>
    </div>

    <!-- ── Mobile feed ────────────────────────────────────────────── -->
    <ShowOn only="mobile">
      <!-- Single search field -->
      <div class="mb-4">
        <InputText
          v-model="globalSearch"
          placeholder="Search audit entries…"
          class="w-full"
        />
      </div>

      <!-- Timeline feed -->
      <div v-if="loading" class="text-center py-12 text-gray-400">
        <i class="pi pi-spin pi-spinner text-2xl" />
        <p class="mt-2 text-sm">Loading audit trail…</p>
      </div>

      <div v-else-if="filtered.length === 0" class="text-center py-12 text-gray-400">
        <i class="pi pi-history text-4xl mb-2 block" />
        <p class="text-sm">No audit entries found.</p>
      </div>

      <div v-else class="space-y-2" data-testid="audit-mobile-feed">
        <div
          v-for="entry in filtered.slice(0, 30)"
          :key="entry.id"
          class="flex items-start gap-3 bg-white border border-gray-100 rounded-lg px-3 py-2.5 shadow-sm"
        >
          <div class="mt-0.5 flex-shrink-0">
            <div class="w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 border border-gray-200">
              <i :class="entityIcon(entry.entityType)" class="text-gray-500 text-xs" />
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <Tag
                :value="entry.action.charAt(0).toUpperCase() + entry.action.slice(1)"
                :severity="actionSeverity(entry.action)"
                class="text-xs"
              />
              <span class="text-sm font-medium text-gray-700 capitalize">{{ entry.entityType }}</span>
            </div>
            <p class="text-xs text-gray-400 mt-0.5">{{ formatDate(entry.createdAt) }}</p>
            <p v-if="changesPreview(entry.changes) !== '—'" class="text-xs text-gray-500 mt-0.5 italic">
              {{ changesPreview(entry.changes) }}
            </p>
          </div>
        </div>
        <p v-if="filtered.length > 30" class="text-xs text-center text-gray-400 py-2">
          Showing first 30 of {{ filtered.length }} entries — use desktop for full table
        </p>
      </div>
    </ShowOn>

    <!-- ── Tablet + Desktop: full table ───────────────────────────── -->
    <ShowOn from="tablet">
    <Card>
      <template #content>
        <!-- Toolbar -->
        <div class="flex flex-wrap gap-3 mb-4">
          <InputText
            v-model="globalSearch"
            placeholder="Search by entity type, ID, user…"
            class="w-60"
          />
          <Select
            v-model="filterEntity"
            :options="entityTypeOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Entity type"
            class="w-44"
          />
          <Select
            v-model="filterAction"
            :options="actionOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Action"
            class="w-36"
          />
          <button
            v-if="filterEntity || filterAction || globalSearch"
            class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2"
            @click="filterEntity = null; filterAction = null; globalSearch = ''"
          >
            <i class="pi pi-times text-xs" /> Clear filters
          </button>
        </div>

        <!-- Table -->
        <DataTable
          :value="filtered"
          :loading="loading"
          stripedRows
          :paginator="totalRecords > pageSize"
          :rows="pageSize"
          :totalRecords="totalRecords"
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
          lazy
          @page="onPage"
          class="p-datatable-sm"
          dataKey="id"
        >
          <template #empty>
            <div class="text-center py-10 text-gray-500">
              <i class="pi pi-history text-4xl mb-2 text-gray-300" />
              <p class="mt-1">No audit entries found.</p>
              <p class="text-xs mt-1">Activity will appear here as soon as data is created or modified.</p>
            </div>
          </template>

          <!-- Timestamp -->
          <Column field="createdAt" header="Date / Time" sortable style="width: 160px; white-space: nowrap">
            <template #body="{ data }">
              <span class="text-xs text-gray-600">{{ formatDate(data.createdAt) }}</span>
            </template>
          </Column>

          <!-- Entity type -->
          <Column field="entityType" header="Entity" style="width: 130px">
            <template #body="{ data }">
              <div class="flex items-center gap-2">
                <i :class="entityIcon(data.entityType)" class="text-gray-400 text-sm" />
                <span class="capitalize text-sm font-medium text-gray-700">{{ data.entityType }}</span>
              </div>
            </template>
          </Column>

          <!-- Entity ID -->
          <Column field="entityId" header="Entity ID" style="width: 110px">
            <template #body="{ data }">
              <span
                class="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600"
                v-tooltip.top="data.entityId"
              >
                {{ shortId(data.entityId) }}
              </span>
            </template>
          </Column>

          <!-- Action -->
          <Column field="action" header="Action" sortable style="width: 100px">
            <template #body="{ data }">
              <Tag
                :value="data.action.charAt(0).toUpperCase() + data.action.slice(1)"
                :severity="actionSeverity(data.action)"
                class="text-xs"
              />
            </template>
          </Column>

          <!-- Changed fields preview -->
          <Column field="changes" header="Changed Fields">
            <template #body="{ data }">
              <span class="text-xs text-gray-500 italic">{{ changesPreview(data.changes) }}</span>
            </template>
          </Column>

          <!-- User -->
          <Column field="userId" header="User ID" style="width: 110px">
            <template #body="{ data }">
              <span
                class="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600"
                v-tooltip.top="data.userId"
              >
                {{ shortId(data.userId) }}
              </span>
            </template>
          </Column>

          <!-- Per-row download -->
          <Column header="" style="width: 48px; text-align: center">
            <template #body="{ data }">
              <Button
                :icon="downloadingEntryId === data.id ? 'pi pi-spin pi-spinner' : 'pi pi-download'"
                severity="secondary"
                text
                rounded
                size="small"
                :disabled="downloadingEntryId === data.id"
                v-tooltip.top="'Download full snapshot'"
                @click="downloadEntry(data)"
              />
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
    </ShowOn><!-- end ShowOn from="tablet" -->
  </div>
</template>
