<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useSnapshotStore } from '@/features/snapshots/stores/snapshotStore'
import { usePlanStore } from '@/features/plans/stores/planStore'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { formatDateTime } from '@/utils/format'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import ResponsiveDialog from '@/components/common/ResponsiveDialog.vue'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import ConfirmDialog from 'primevue/confirmdialog'
import Toast from 'primevue/toast'
import ProgressSpinner from 'primevue/progressspinner'

defineProps<{ planId?: string; sid?: string }>()

const snapshotStore = useSnapshotStore()
const planStore = usePlanStore()
const confirm = useConfirm()
const toast = useToast()

const showCreateDialog = ref(false)
const showDiffDialog = ref(false)
const newLabel = ref('')
const newDescription = ref('')
const newReason = ref('')
const selectedSnapshots = ref<any[]>([])
const viewDataSnapshotId = ref<string | null>(null)

onMounted(async () => {
  if (planStore.activePlan) {
    await snapshotStore.fetchSnapshots()
  }
})

async function handleCreateSnapshot() {
  if (!newLabel.value.trim()) {
    toast.add({
      severity: 'warn',
      summary: 'Validation',
      detail: 'Label is required',
      life: 3000,
    })
    return
  }

  try {
    await snapshotStore.createSnapshot({
      label: newLabel.value,
      description: newDescription.value,
      reason: newReason.value,
    })
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Snapshot created successfully',
      life: 3000,
    })
    showCreateDialog.value = false
    newLabel.value = ''
    newDescription.value = ''
    newReason.value = ''
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to create snapshot',
      life: 3000,
    })
  }
}

async function handleViewData(snapshotId: string) {
  viewDataSnapshotId.value = snapshotId
  await snapshotStore.fetchSnapshotData(snapshotId)
}

async function handleRestore(snapshot: any) {
  confirm.require({
    message: `Are you sure you want to restore snapshot "${snapshot.label}"?`,
    header: 'Confirm Restore',
    icon: 'pi pi-exclamation-triangle',
    accept: async () => {
      try {
        await snapshotStore.restoreSnapshot(snapshot.id)
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Snapshot restored successfully',
          life: 3000,
        })
      } catch (err) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to restore snapshot',
          life: 3000,
        })
      }
    },
  })
}

async function handleClone(snapshot: any) {
  const label = `${snapshot.label} (copy)`
  try {
    await snapshotStore.cloneSnapshot(snapshot.id, { newLabel: label })
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Snapshot cloned successfully',
      life: 3000,
    })
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to clone snapshot',
      life: 3000,
    })
  }
}

async function handleDelete(snapshot: any) {
  confirm.require({
    message: `Are you sure you want to delete snapshot "${snapshot.label}"? This action cannot be undone.`,
    header: 'Confirm Delete',
    icon: 'pi pi-exclamation-triangle',
    accept: async () => {
      try {
        await snapshotStore.deleteSnapshot(snapshot.id)
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Snapshot deleted successfully',
          life: 3000,
        })
      } catch (err) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete snapshot',
          life: 3000,
        })
      }
    },
  })
}

async function handleDiff() {
  if (selectedSnapshots.value.length !== 2) {
    toast.add({
      severity: 'warn',
      summary: 'Validation',
      detail: 'Select exactly 2 snapshots to compare',
      life: 3000,
    })
    return
  }

  try {
    await snapshotStore.diffSnapshots(selectedSnapshots.value[0].id, selectedSnapshots.value[1].id)
    showDiffDialog.value = true
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to compare snapshots',
      life: 3000,
    })
  }
}

/**
 * Build a compact, AI-chat-compatible payload from a raw snapshot.
 *
 * Goals:
 *  - Remove all metadata (UUIDs, timestamps, scenarioId, flags)
 *  - Eliminate empty arrays and null values
 *  - Restructure flat record-lists into semantically rich objects:
 *      · Products → nested assumptions and sales volumes by year
 *      · Staff    → grouped by category with headcount + salary side-by-side
 *      · Capex    → grouped by asset category, years as { y1, y2, … } map
 *      · Opex     → grouped by lineId, years as { y1, y2, … } map
 *  - Drop chart/visualisation sub-trees from any computed output sections
 *
 * Result is typically 60-70 % smaller than the raw payload and directly
 * readable by an AI without requiring structural inference.
 */

const META_KEYS_SET = new Set([
  'id', 'createdAt', 'updatedAt', 'scenarioId', 'productId',
  'snapshotId', 'isOverridden', 'isManualOverride',
])

function omitMeta(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj
  return Object.fromEntries(
    Object.entries(obj).filter(([k]) => !META_KEYS_SET.has(k))
  )
}

/** Convert a flat array of { yearIndex, ...rest } into { y1: rest, y2: rest, … } */
function byYear(rows: any[], _valueKey: string): Record<string, any> {
  const out: Record<string, any> = {}
  rows.forEach((r) => {
    const { yearIndex, ...rest } = omitMeta(r)
    out[`y${yearIndex}`] = Object.keys(rest).length === 1 ? Object.values(rest)[0] : rest
  })
  return out
}

function buildAIPayload(raw: any): any {
  if (!raw) return raw
  const result: Record<string, any> = {}

  // ── Config ───────────────────────────────────────────────────────────────
  if (raw.config) result.config = omitMeta(raw.config)

  // ── Products (with nested assumptions & sales volumes) ───────────────────
  if (raw.products?.length) {
    result.products = raw.products.map((p: any) => {
      const entry: any = {
        name:       p.name,
        type:       p.productType,
        driverType: p.driverType,
      }
      if (p.driverParams) entry.driverParams = p.driverParams

      // Nest per-year assumptions — strip metadata, coefficients, and zero-value fields
      const assumptions = (raw.productAssumptions ?? []).filter((a: any) => a.productId === p.id)
      if (assumptions.length) {
        entry.assumptions = Object.fromEntries(
          assumptions.map((a: any) => {
            const { yearIndex, productId, id, createdAt, updatedAt, isOverridden, costCoefficient, priceCoefficient, ...fields } = a
            const compact = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== 0))
            return [`y${yearIndex}`, compact]
          })
        )
      }

      // Nest sales volumes (grouped by yearIndex → zone/channel breakdown)
      const volumes = (raw.productSalesVolumes ?? []).filter((v: any) => v.productId === p.id)
      if (volumes.length) {
        const volByYear: Record<string, any> = {}
        volumes.forEach((v: any) => {
          const key = `y${v.yearIndex}`
          if (!volByYear[key]) volByYear[key] = {}
          const label = `${v.zone}_${v.channel}`
          volByYear[key][label] = v.unitsSold
        })
        entry.salesVolumes = volByYear
      }

      return entry
    })
  }

  // ── Staff ─────────────────────────────────────────────────────────────────
  const hcList: any[] = raw.staffHeadcounts ?? []
  const salList: any[] = raw.staffSalaries ?? []
  const categories = [...new Set([...hcList.map((r: any) => r.category), ...salList.map((r: any) => r.category)])]
  if (categories.length) {
    result.staff = Object.fromEntries(
      categories.map((cat) => {
        const entry: any = {}
        const hc = hcList.filter((r: any) => r.category === cat)
        // Direct scalar mapping — avoids byYear() leaving `category` in rest
        if (hc.length) entry.fte = Object.fromEntries(hc.map((r: any) => [`y${r.yearIndex}`, r.fte]))
        const sal = salList.filter((r: any) => r.category === cat)
        if (sal.length) {
          entry.monthlyGross    = Object.fromEntries(sal.map((r: any) => [`y${r.yearIndex}`, r.monthlyGrossSalary]))
          const hasIncrease = sal.some((r: any) => r.annualIncreasePct !== 0)
          if (hasIncrease) entry.annualIncreasePct = Object.fromEntries(sal.map((r: any) => [`y${r.yearIndex}`, r.annualIncreasePct]))
        }
        return [cat, entry]
      })
    )
  }
  if (raw.staffIncentives?.length) {
    result.staffIncentives = byYear(raw.staffIncentives, 'incentivePct')
  }

  // ── Capex ─────────────────────────────────────────────────────────────────
  if (raw.capexEntries?.length) {
    const byCat: Record<string, any> = {}
    raw.capexEntries.forEach((e: any) => {
      if (!byCat[e.category]) byCat[e.category] = { depYears: e.depreciationYears, amounts: {} }
      if (e.amount !== 0) byCat[e.category].amounts[`y${e.yearIndex}`] = e.amount
    })
    // Drop categories with all-zero amounts
    result.capex = Object.fromEntries(
      Object.entries(byCat).filter(([, v]: any) => Object.keys(v.amounts).length > 0)
    )
  }

  // ── Opex ──────────────────────────────────────────────────────────────────
  if (raw.opexEntries?.length) {
    const byLine: Record<string, any> = {}
    raw.opexEntries.forEach((e: any) => {
      if (!byLine[e.lineId]) byLine[e.lineId] = {}
      byLine[e.lineId][`y${e.yearIndex}`] = e.amount
    })
    result.opex = byLine
  }

  // ── Opening balance ───────────────────────────────────────────────────────
  if (raw.openingBalance) {
    const ob = omitMeta(raw.openingBalance)
    // Only include if any value is non-zero
    const hasData = Object.values(ob).some((v) => v !== 0)
    if (hasData) result.openingBalance = ob
  }

  // ── Manual entries (pnl, wcr, fiplan, pnlCash, budget) ───────────────────
  for (const key of ['pnlEntries', 'wcrEntries', 'fiplanEntries', 'pnlCashEntries'] as const) {
    if ((raw as any)[key]?.length) result[key] = (raw as any)[key]
  }
  if (raw.budgetOverrides != null && Object.keys(raw.budgetOverrides ?? {}).length) {
    result.budgetOverrides = raw.budgetOverrides
  }

  // ── Computed output sections (if present) ────────────────────────────────
  for (const sec of ['pnl', 'pnlCash', 'bsheet', 'ratios', 'wcr', 'revenue', 'cash', 'fiplan'] as const) {
    if ((raw as any)[sec]) {
      const copy = { ...(raw as any)[sec] }
      delete copy.chartData
      delete copy.charts
      result[sec] = copy
    }
  }

  // ── Warnings ──────────────────────────────────────────────────────────────
  if (raw.warnings?.length) result.warnings = raw.warnings

  return result
}

const downloadingId = ref<string | null>(null)

// ── Diff result helpers ────────────────────────────────────────────────────────

/**
 * Flatten the diff result into a list of { path, before, after } rows so the
 * template can render a simple before/after table without recursive slot logic.
 */
const diffRows = computed(() => {
  const diff = snapshotStore.diffResult
  if (!diff?.changes) return []
  const rows: { path: string; before: any; after: any }[] = []

  function walk(obj: any, prefix = '') {
    if (!obj || typeof obj !== 'object') return
    for (const [key, val] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key
      if (val && typeof val === 'object' && ('before' in val || 'after' in val)) {
        rows.push({ path: fullKey, before: (val as any).before, after: (val as any).after })
      } else if (val && typeof val === 'object') {
        walk(val, fullKey)
      }
    }
  }
  walk(diff.changes)
  return rows
})

function diffLabel(snapshotId: string) {
  const s = snapshotStore.snapshots.find((x) => x.id === snapshotId)
  return s ? `#${s.version} ${s.label}` : snapshotId
}

async function handleDownloadAI(snapshot: any) {
  downloadingId.value = snapshot.id
  try {
    const data = await snapshotStore.fetchSnapshotData(snapshot.id)
    const payload = buildAIPayload(data)
    const json = JSON.stringify(payload, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `snapshot-v${snapshot.version}-${snapshot.label.replace(/\s+/g, '_')}.ai.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.add({
      severity: 'success',
      summary: 'Downloaded',
      detail: `Snapshot v${snapshot.version} exported for AI chat`,
      life: 3000,
    })
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to download snapshot JSON',
      life: 3000,
    })
  } finally {
    downloadingId.value = null
  }
}
</script>

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-2">
      <h1 class="text-2xl font-bold text-gray-800">Snapshots</h1>
      <div class="flex gap-2">
        <Button
          label="Compare"
          icon="pi pi-check"
          @click="handleDiff"
          :disabled="selectedSnapshots.length !== 2"
          severity="info"
        />
        <Button
          label="Create Snapshot"
          icon="pi pi-plus"
          @click="showCreateDialog = true"
        />
      </div>
    </div>

    <!-- Module description banner -->
    <div class="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6 text-sm text-blue-800">
      <i class="pi pi-info-circle mt-0.5 text-blue-500 shrink-0" />
      <div>
        <span class="font-semibold">What are snapshots?</span>
        Snapshots are immutable, timestamped copies of your scenario's computed financial plan.
        Use them to preserve a known-good state before experimenting with assumptions, track the evolution of your forecasts over time,
        or compare two versions side-by-side to see exactly what changed.
        Select exactly 2 snapshots to enable the <strong>Compare</strong> button.
      </div>
    </div>

    <Toast />
    <ConfirmDialog />

    <div v-if="snapshotStore.loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <DataTable
      v-else
      :value="snapshotStore.snapshots"
      v-model:selection="selectedSnapshots"
      selectionMode="multiple"
      paginator
      :rows="10"
      class="p-datatable-sm"
    >
      <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>
      <Column field="version" header="Version" style="width: 10%">
        <template #body="{ data }">
          <div class="flex flex-col items-start gap-1">
            <span class="font-mono text-sm font-semibold">#{{ data.version }}</span>
            <Button
              icon="pi pi-download"
              label="AI JSON"
              size="small"
              severity="secondary"
              text
              :loading="downloadingId === data.id"
              @click="handleDownloadAI(data)"
              v-tooltip.right="'Download AI-compatible JSON (chart data stripped)'"
              class="p-0 text-xs h-6"
            />
          </div>
        </template>
      </Column>
      <Column field="label" header="Label" style="width: 20%">
        <template #body="{ data }">
          <span class="font-semibold">{{ data.label }}</span>
        </template>
      </Column>
      <Column field="description" header="Description" style="width: 30%">
        <template #body="{ data }">
          <span class="text-sm text-gray-600">{{ data.description || '-' }}</span>
        </template>
      </Column>
      <Column field="createdBy" header="By" style="width: 15%">
        <template #body="{ data }">
          <span class="text-sm">{{ data.createdBy }}</span>
        </template>
      </Column>
      <Column field="createdAt" header="Date" style="width: 20%">
        <template #body="{ data }">
          <span class="text-sm">{{ formatDateTime(data.createdAt) }}</span>
        </template>
      </Column>
      <Column header="Actions" style="width: 15%" class="text-center">
        <template #body="{ data }">
          <div class="flex gap-2 justify-center flex-wrap">
            <Button
              icon="pi pi-eye"
              class="p-button-sm p-button-text"
              @click="handleViewData(data.id)"
              v-tooltip.top="'View data'"
            />
            <Button
              icon="pi pi-replay"
              class="p-button-sm p-button-text p-button-warning"
              @click="handleRestore(data)"
              v-tooltip.top="'Restore'"
            />
            <Button
              icon="pi pi-copy"
              class="p-button-sm p-button-text p-button-info"
              @click="handleClone(data)"
              v-tooltip.top="'Clone'"
            />
            <Button
              icon="pi pi-trash"
              class="p-button-sm p-button-text p-button-danger"
              @click="handleDelete(data)"
              v-tooltip.top="'Delete'"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Diff Dialog -->
    <ResponsiveDialog
      v-model:visible="showDiffDialog"
      header="Snapshot Comparison"
      size="lg"
      :modal="true"
      :dismissableMask="true"
    >
      <div v-if="snapshotStore.diffResult" class="space-y-4">
        <div class="text-sm text-gray-500 mb-3">
          Comparing
          <span class="font-semibold text-gray-700">{{ diffLabel(snapshotStore.diffResult.snapshot1Id) }}</span>
          →
          <span class="font-semibold text-gray-700">{{ diffLabel(snapshotStore.diffResult.snapshot2Id) }}</span>
        </div>

        <div v-if="diffRows.length === 0" class="text-center text-gray-500 py-8">
          <i class="pi pi-check-circle text-green-500 text-3xl mb-2 block" />
          No differences found — both snapshots are identical.
        </div>

        <div v-else>
          <p class="text-sm text-gray-600 mb-3">
            {{ diffRows.length }} changed value{{ diffRows.length !== 1 ? 's' : '' }}
          </p>
          <div class="overflow-auto max-h-96 border rounded">
            <table class="w-full text-sm border-collapse">
              <thead class="bg-gray-50 sticky top-0">
                <tr>
                  <th class="text-left px-3 py-2 border-b font-medium text-gray-700 w-2/5">Field</th>
                  <th class="text-right px-3 py-2 border-b font-medium text-red-700 w-[30%]">Before</th>
                  <th class="text-right px-3 py-2 border-b font-medium text-green-700 w-[30%]">After</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in diffRows"
                  :key="row.path"
                  class="hover:bg-gray-50 border-b last:border-b-0"
                >
                  <td class="px-3 py-1.5 font-mono text-xs text-gray-600 truncate max-w-xs" :title="row.path">
                    {{ row.path }}
                  </td>
                  <td class="px-3 py-1.5 text-right text-red-600 tabular-nums">{{ row.before ?? '—' }}</td>
                  <td class="px-3 py-1.5 text-right text-green-700 tabular-nums font-medium">{{ row.after ?? '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <template #footer>
        <Button label="Close" icon="pi pi-times" @click="showDiffDialog = false" severity="secondary" />
      </template>
    </ResponsiveDialog>

    <!-- Create Snapshot Dialog -->
    <ResponsiveDialog v-model:visible="showCreateDialog" header="Create Snapshot" size="md" :modal="true">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Label</label>
          <InputText v-model="newLabel" class="w-full" placeholder="e.g., Q1 Forecast" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <Textarea v-model="newDescription" class="w-full" rows="2" placeholder="Brief description..." />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Reason</label>
          <InputText v-model="newReason" class="w-full" placeholder="e.g., Updated assumptions" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" icon="pi pi-times" @click="showCreateDialog = false" class="p-button-text" />
        <Button label="Create" icon="pi pi-check" @click="handleCreateSnapshot" />
      </template>
    </ResponsiveDialog>
  </div>
</template>
