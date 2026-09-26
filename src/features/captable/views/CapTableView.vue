<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCapTableStore } from '@/features/captable/stores/capTableStore'
import { useScenarioCapTableStore } from '@/features/captable/stores/scenarioCapTableStore'
import { useSettingsStore } from '@/features/settings/stores/settingsStore'
import { useTierGate } from '@/composables/useTierGate'
import { usePlanAccess } from '@/composables/usePlanAccess'
import type { ShareholderType, Shareholder, CapTableRound } from '@/types'
import UpgradeModal from '@/components/common/UpgradeModal.vue'
import PageContainer from '@/components/layout/PageContainer.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import KSection from '@/components/layout/KSection.vue'
import DataContainer from '@/components/layout/DataContainer.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import ShowOn from '@/components/common/ShowOn.vue'

defineProps<{ planId?: string }>()

const store = useCapTableStore()
const scenarioCapTableStore = useScenarioCapTableStore()
const settingsStore = useSettingsStore()
const { isPro, gate } = useTierGate()
const { canEdit } = usePlanAccess()
const toast = useToast()

// ── Country profile ─────────────────────────────────────────────
const countryProfile = computed(() => scenarioCapTableStore.countryProfile)
const countryProfileLoading = computed(() => scenarioCapTableStore.countryProfileLoading)
const showCountryProfile = ref(false)

// ── Dialog state ────────────────────────────────────────────────
const dialogVisible = ref(false)
const editingId = ref<string | null>(null)

const form = ref({
  name: '',
  type: 'founder' as ShareholderType,
  shares: 0,
  ownershipPct: '',
  investedAmount: '0',
  notes: '',
})

const typeOptions: { label: string; value: ShareholderType }[] = [
  { label: 'Founder', value: 'founder' },
  { label: 'Investor', value: 'investor' },
  { label: 'Employee', value: 'employee' },
  { label: 'Other', value: 'other' },
]

function typeLabel(type: ShareholderType): string {
  return typeOptions.find(o => o.value === type)?.label ?? type
}

function typeSeverity(type: ShareholderType): string {
  const map: Record<ShareholderType, string> = {
    founder: 'info',
    investor: 'success',
    employee: 'warning',
    other: 'secondary',
  }
  return map[type] ?? 'secondary'
}

// ── Computed ────────────────────────────────────────────────────
const shareholders = computed(() => store.summary?.shareholders ?? [])

const totalShares = computed(() => store.summary?.totalShares ?? 0)
const totalInvested = computed(() => {
  const v = parseFloat(store.summary?.totalInvested ?? '0')
  return isNaN(v) ? 0 : v
})

const donutData = computed(() => {
  const s = shareholders.value
  return {
    labels: s.map(sh => sh.name),
    values: s.map(sh => parseFloat(sh.ownershipPct) || 0),
  }
})

// ── Rounds ──────────────────────────────────────────────────────
const rounds = computed(() => scenarioCapTableStore.rounds)
const roundsLoading = computed(() => scenarioCapTableStore.loading)
const syncLoading = computed(() => scenarioCapTableStore.syncLoading)
const syncError = computed(() => scenarioCapTableStore.syncError)

const YEAR_LABELS = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5']

function fmtAmountK(amountK: string): string {
  const n = parseFloat(amountK)
  if (isNaN(n)) return '—'
  return (n * 1000).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €'
}

function roundFiplanLabel(round: CapTableRound): string {
  if (!round.fiplanSynced || round.fiscalYearIndex == null) return ''
  return YEAR_LABELS[round.fiscalYearIndex] ?? `Year ${round.fiscalYearIndex + 1}`
}

async function applyToOpeningBalance(round: CapTableRound) {
  const updated = await scenarioCapTableStore.syncRoundToOpeningBalance(round.id)
  if (updated) {
    toast.add({
      severity: 'success',
      summary: 'Opening balance updated',
      detail: `${round.label}: ${fmtAmountK(round.amountRaisedK)} applied to share capital`,
      life: 3500,
    })
  } else if (scenarioCapTableStore.syncError) {
    toast.add({ severity: 'error', summary: 'Sync failed', detail: scenarioCapTableStore.syncError, life: 4500 })
  }
}

async function removeFromOpeningBalance(round: CapTableRound) {
  const updated = await scenarioCapTableStore.unsyncRoundFromOpeningBalance(round.id)
  if (updated) {
    toast.add({
      severity: 'info',
      summary: 'Opening balance updated',
      detail: `${round.label} unlinked from opening balance`,
      life: 3000,
    })
  } else if (scenarioCapTableStore.syncError) {
    toast.add({ severity: 'error', summary: 'Unlink failed', detail: scenarioCapTableStore.syncError, life: 4500 })
  }
}

// ── Lifecycle ───────────────────────────────────────────────────
onMounted(async () => {
  if (!gate('pro', 'Cap Table')) return
  await store.fetchSummary()
  // Rounds & country profile in parallel — both non-blocking for shareholders display
  const countryCode = settingsStore.config?.country
  await Promise.all([
    scenarioCapTableStore.fetchRounds(),
    countryCode ? scenarioCapTableStore.fetchCountryProfile(countryCode) : Promise.resolve(),
  ])
})

// ── CRUD helpers ────────────────────────────────────────────────
function openCreate() {
  if (!gate('pro', 'Cap Table')) return
  editingId.value = null
  form.value = { name: '', type: 'founder', shares: 0, ownershipPct: '', investedAmount: '0', notes: '' }
  dialogVisible.value = true
}

function openEdit(row: Shareholder) {
  editingId.value = row.id
  form.value = {
    name: row.name,
    type: row.type,
    shares: row.shares,
    ownershipPct: row.ownershipPct,
    investedAmount: row.investedAmount,
    notes: row.notes ?? '',
  }
  dialogVisible.value = true
}

async function saveDialog() {
  if (!form.value.name.trim()) {
    toast.add({ severity: 'warn', summary: 'Validation', detail: 'Name is required', life: 3000 })
    return
  }
  let ok = false
  if (editingId.value) {
    ok = await store.updateShareholder(editingId.value, {
      name: form.value.name,
      type: form.value.type,
      shares: form.value.shares,
      ownershipPct: form.value.ownershipPct,
      investedAmount: form.value.investedAmount,
      notes: form.value.notes,
    })
  } else {
    const created = await store.createShareholder({
      name: form.value.name,
      type: form.value.type,
      shares: form.value.shares,
      ownershipPct: form.value.ownershipPct,
      investedAmount: form.value.investedAmount,
      notes: form.value.notes || undefined,
    })
    ok = !!created
  }
  if (ok) {
    dialogVisible.value = false
    toast.add({ severity: 'success', summary: 'Saved', detail: 'Shareholder saved', life: 2500 })
  } else if (store.error) {
    toast.add({ severity: 'error', summary: 'Error', detail: store.error, life: 4000 })
  }
}

async function removeShareholder(id: string) {
  const ok = await store.deleteShareholder(id)
  if (ok) {
    toast.add({ severity: 'success', summary: 'Removed', detail: 'Shareholder removed', life: 2500 })
  }
}

function fmtCurrency(val: string) {
  const n = parseFloat(val)
  return isNaN(n) ? '—' : n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €'
}

function fmtPct(val: string) {
  const n = parseFloat(val)
  return isNaN(n) ? '—' : n.toFixed(2) + ' %'
}
</script>

<template>
  <PageContainer>
    <Toast />
    <UpgradeModal />

    <PageHeader>
      <template #title>
        <h1 class="text-lg sm:text-xl md:text-2xl flex items-center gap-3">
          <i class="pi pi-chart-pie text-primary-500"></i>
          Cap Table
        </h1>
      </template>
      <template #subtitle>
        <p class="text-sm text-gray-500">Manage shareholders and equity ownership for this plan</p>
      </template>
      <template #actions>
        <Button
          v-if="canEdit && isPro"
          label="Add Shareholder"
          icon="pi pi-plus"
          @click="openCreate"
        />
      </template>
    </PageHeader>

    <!-- Pro gate: show upgrade banner when not pro -->
    <KSection v-if="!isPro" class="flex flex-col items-center justify-center py-24 gap-4">
      <div class="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
        <i class="pi pi-lock text-2xl text-amber-500"></i>
      </div>
      <h2 class="text-xl font-semibold text-gray-700">Pro Feature</h2>
      <p class="text-gray-500 text-center max-w-sm">
        Cap Table management is available on the <strong>Pro</strong> plan.<br>
        Upgrade to track founders, investors and employee equity.
      </p>
    </KSection>

    <template v-else>
      <!-- Loading -->
      <KSection v-if="store.loading" class="text-center py-16 text-gray-400">
        <i class="pi pi-spin pi-spinner text-3xl"></i>
      </KSection>

      <!-- Error -->
      <KSection v-else-if="store.error">
        <Message severity="error" class="mb-4">{{ store.error }}</Message>
      </KSection>

      <template v-else>
        <!-- Summary cards -->
        <KSection>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-white rounded-xl border border-gray-200 p-4">
            <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Shareholders</p>
            <p class="text-3xl font-bold text-gray-800">{{ shareholders.length }}</p>
          </div>
          <div class="bg-white rounded-xl border border-gray-200 p-4">
            <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Shares</p>
            <p class="text-3xl font-bold text-gray-800">{{ totalShares.toLocaleString('fr-FR') }}</p>
          </div>
          <div class="bg-white rounded-xl border border-gray-200 p-4">
            <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Invested</p>
            <p class="text-3xl font-bold text-gray-800">{{ fmtCurrency(String(totalInvested)) }}</p>
          </div>
        </div>
        </KSection>

        <!-- Empty state -->
        <KSection v-if="shareholders.length === 0" class="text-center py-16 text-gray-400">
          <i class="pi pi-users text-5xl mb-4 block"></i>
          <p class="text-lg font-medium">No shareholders yet</p>
          <p class="text-sm mt-1 mb-4">Add founders, investors or employees to build your cap table</p>
          <Button v-if="canEdit" label="Add first shareholder" icon="pi pi-plus" @click="openCreate" />
        </KSection>

        <!-- Mobile: read-only shareholder cards -->
        <ShowOn only="mobile">
          <KSection v-if="shareholders.length > 0">
            <div class="space-y-3" data-testid="captable-mobile-cards">
              <div
                v-for="sh in shareholders"
                :key="sh.id"
                class="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3"
              >
                <div class="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                  <i class="pi pi-user text-primary-600" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-semibold text-gray-800 text-sm">{{ sh.name }}</span>
                    <Tag :value="typeLabel(sh.type)" :severity="typeSeverity(sh.type)" class="text-xs" />
                  </div>
                  <div class="flex gap-3 mt-1 text-xs text-gray-500">
                    <span>{{ fmtPct(sh.ownershipPct) }}</span>
                    <span class="text-gray-300">·</span>
                    <span>{{ sh.shares.toLocaleString('fr-FR') }} shares</span>
                  </div>
                </div>
              </div>
            </div>
            <p class="text-xs text-center text-gray-400 mt-3">Edit shareholders on tablet or desktop</p>
          </KSection>
        </ShowOn>

        <!-- Tablet + Desktop: full DataTable with CRUD -->
        <ShowOn from="tablet">
        <!-- Table -->
        <KSection v-if="shareholders.length > 0">
        <DataContainer min-width="700px">
        <DataTable
          :value="shareholders"
          stripedRows
          class="p-datatable-sm rounded-xl overflow-hidden border border-gray-200"
        >
          <Column field="name" header="Name" sortable>
            <template #body="{ data }">
              <span class="font-semibold text-gray-800">{{ data.name }}</span>
            </template>
          </Column>
          <Column field="type" header="Type" sortable>
            <template #body="{ data }">
              <Tag :value="typeLabel(data.type)" :severity="typeSeverity(data.type)" />
            </template>
          </Column>
          <Column field="shares" header="Shares" sortable>
            <template #body="{ data }">
              {{ data.shares.toLocaleString('fr-FR') }}
            </template>
          </Column>
          <Column field="ownershipPct" header="Ownership" sortable>
            <template #body="{ data }">
              <div class="flex items-center gap-2">
                <div class="flex-1 bg-gray-100 rounded-full h-1.5 max-w-[80px]">
                  <div
                    class="h-1.5 rounded-full bg-primary-500"
                    :style="{ width: Math.min(parseFloat(data.ownershipPct) || 0, 100) + '%' }"
                  />
                </div>
                <span class="text-sm font-medium">{{ fmtPct(data.ownershipPct) }}</span>
              </div>
            </template>
          </Column>
          <Column field="investedAmount" header="Invested (€)" sortable>
            <template #body="{ data }">
              {{ fmtCurrency(data.investedAmount) }}
            </template>
          </Column>
          <Column v-if="canEdit" header="" style="width:90px">
            <template #body="{ data }">
              <div class="flex gap-1">
                <Button icon="pi pi-pencil" text rounded size="small" @click="openEdit(data)" />
                <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="removeShareholder(data.id)" />
              </div>
            </template>
          </Column>
        </DataTable>
        </DataContainer>
        </KSection>

        <!-- Ownership donut (CSS-only bar chart as lightweight alternative) -->
        <KSection v-if="shareholders.length > 0" class="bg-white rounded-xl border border-gray-200 p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">Ownership Breakdown</h3>
          <div class="space-y-2">
            <div v-for="(label, i) in donutData.labels" :key="i" class="flex items-center gap-3">
              <span class="text-sm text-gray-700 w-32 truncate">{{ label }}</span>
              <div class="flex-1 bg-gray-100 rounded-full h-2">
                <div
                  class="h-2 rounded-full"
                  :style="{
                    width: donutData.values[i].toFixed(1) + '%',
                    backgroundColor: `hsl(${(i * 60) % 360}, 65%, 55%)`
                  }"
                />
              </div>
              <span class="text-sm font-medium text-gray-600 w-14 text-right">
                {{ donutData.values[i].toFixed(1) }}%
              </span>
            </div>
          </div>
        </KSection>
        </ShowOn><!-- end ShowOn from="tablet" -->
      </template>
    </template>

    <!-- ── Rounds panel ──────────────────────────────────────────────── -->
    <KSection v-if="isPro" class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div class="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i class="pi pi-money-bill text-primary-500"></i>
          <span class="text-sm font-semibold text-gray-700">Funding Rounds</span>
        </div>
        <span v-if="roundsLoading" class="text-xs text-gray-400">
          <i class="pi pi-spin pi-spinner"></i>
        </span>
      </div>

      <!-- Rounds sync error -->
      <Message v-if="syncError" severity="error" class="m-4">{{ syncError }}</Message>

      <!-- No rounds yet -->
      <div v-if="!roundsLoading && rounds.length === 0" class="px-5 py-8 text-center text-gray-400 text-sm">
        No funding rounds configured for this scenario.
      </div>

      <!-- Rounds table -->
      <div v-else class="divide-y divide-gray-100">
        <div
          v-for="round in rounds"
          :key="round.id"
          class="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3"
        >
          <!-- Round info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-semibold text-gray-800 text-sm">{{ round.label }}</span>
              <Tag
                :value="`Phase ${round.phaseNumber}`"
                severity="secondary"
                class="text-xs"
              />
              <Tag
                v-if="round.fiplanSynced"
                :value="`FiPlan ${roundFiplanLabel(round)}`"
                severity="success"
                class="text-xs"
              />
              <Tag
                v-if="round.openingBalanceSynced"
                value="Opening Balance"
                severity="info"
                class="text-xs"
              />
            </div>
            <div class="flex items-center gap-4 mt-1 text-xs text-gray-500">
              <span>{{ fmtAmountK(round.amountRaisedK) }}</span>
              <span v-if="round.eventDate">{{ round.eventDate }}</span>
            </div>

            <!-- Divergence warnings -->
            <div
              v-if="round.isSyncAmountDivergent"
              class="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600"
            >
              <i class="pi pi-exclamation-triangle"></i>
              FiPlan amount differs from current round amount — re-sync to update
            </div>
            <div
              v-if="round.isOpeningBalanceDivergent"
              class="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600"
            >
              <i class="pi pi-exclamation-triangle"></i>
              Opening balance amount differs from current round amount — re-apply to update
            </div>
          </div>

          <!-- Actions -->
          <div v-if="canEdit" class="flex items-center gap-2 shrink-0">
            <!-- Opening Balance sync -->
            <Button
              v-if="!round.openingBalanceSynced"
              label="Apply to opening balance"
              icon="pi pi-home"
              size="small"
              severity="info"
              outlined
              :loading="syncLoading"
              :disabled="syncLoading || round.fiplanSynced"
              :title="round.fiplanSynced ? 'Cannot apply to opening balance: round is already synced to FiPlan' : 'Apply this founding capital to opening balance (share capital)'"
              @click="applyToOpeningBalance(round)"
            />
            <Button
              v-else
              label="Unlink opening balance"
              icon="pi pi-home"
              size="small"
              severity="secondary"
              outlined
              :loading="syncLoading"
              :disabled="syncLoading"
              title="Remove link between this round and the opening balance"
              @click="removeFromOpeningBalance(round)"
            />
          </div>
        </div>
      </div>
    </KSection>

    <!-- Country Profile panel -->
    <div
      v-if="isPro && (countryProfile || countryProfileLoading)"
      class="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden"
    >
      <div
        class="flex items-center justify-between px-5 py-3 cursor-pointer select-none border-b border-gray-100 hover:bg-gray-50 transition-colors"
        @click="showCountryProfile = !showCountryProfile"
      >
        <div class="flex items-center gap-2">
          <i class="pi pi-globe text-primary-500"></i>
          <span class="text-sm font-semibold text-gray-700">
            Local Equity Framework
            <span v-if="settingsStore.config?.country" class="ml-1 text-gray-400 font-normal">
              ({{ settingsStore.config.country.toUpperCase() }})
            </span>
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span v-if="countryProfileLoading" class="text-xs text-gray-400">
            <i class="pi pi-spin pi-spinner"></i>
          </span>
          <i
            :class="showCountryProfile ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
            class="text-gray-400 text-xs"
          ></i>
        </div>
      </div>
      <div v-if="showCountryProfile && countryProfile" class="p-5">
        <!-- Legal forms -->
        <div v-if="countryProfile.legalForms?.length" class="mb-4">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Common Legal Forms</p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="form in countryProfile.legalForms"
              :key="form.code"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-xs text-blue-700"
              :title="form.description"
            >
              <span class="font-semibold">{{ form.code }}</span>
              <span class="text-blue-500">{{ form.name }}</span>
            </span>
          </div>
        </div>

        <!-- Equity instruments -->
        <div v-if="countryProfile.instruments?.length" class="mb-4">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Available Equity Instruments</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div
              v-for="inst in countryProfile.instruments"
              :key="inst.code"
              class="flex items-start gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100"
            >
              <i class="pi pi-tag text-primary-400 mt-0.5 text-xs"></i>
              <div>
                <p class="text-xs font-semibold text-gray-700">{{ inst.name }}</p>
                <p v-if="inst.description" class="text-xs text-gray-500 mt-0.5">{{ inst.description }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Local terminology -->
        <div v-if="countryProfile.bookEquityTerm || countryProfile.shareCapitalTerm || countryProfile.retainedEarningsTerm">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Local Terminology</p>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div v-if="countryProfile.bookEquityTerm" class="p-2 rounded-lg bg-amber-50 border border-amber-100">
              <p class="text-xs text-amber-600 font-medium">Book Equity</p>
              <p class="text-xs text-gray-700 mt-0.5">{{ countryProfile.bookEquityTerm }}</p>
            </div>
            <div v-if="countryProfile.shareCapitalTerm" class="p-2 rounded-lg bg-amber-50 border border-amber-100">
              <p class="text-xs text-amber-600 font-medium">Share Capital</p>
              <p class="text-xs text-gray-700 mt-0.5">{{ countryProfile.shareCapitalTerm }}</p>
            </div>
            <div v-if="countryProfile.retainedEarningsTerm" class="p-2 rounded-lg bg-amber-50 border border-amber-100">
              <p class="text-xs text-amber-600 font-medium">Retained Earnings</p>
              <p class="text-xs text-gray-700 mt-0.5">{{ countryProfile.retainedEarningsTerm }}</p>
            </div>
          </div>
        </div>

        <!-- Defaults -->
        <div v-if="countryProfile.defaults" class="mt-4 pt-4 border-t border-gray-100">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Regulatory Defaults</p>
          <div class="flex flex-wrap gap-3">
            <div v-if="countryProfile.defaults.nominalValue != null" class="text-xs text-gray-600">
              Nominal share value: <span class="font-semibold">{{ countryProfile.defaults.nominalValue }} €</span>
            </div>
            <div v-if="countryProfile.defaults.minShareCapital != null" class="text-xs text-gray-600">
              Min. share capital: <span class="font-semibold">{{ countryProfile.defaults.minShareCapital.toLocaleString('fr-FR') }} €</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add / Edit Dialog -->
    <Dialog
      v-model:visible="dialogVisible"
      :header="editingId ? 'Edit Shareholder' : 'Add Shareholder'"
      :modal="true"
      :closable="true"
      class="w-full max-w-lg"
    >
      <div class="space-y-4 pt-2">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <InputText v-model="form.name" class="w-full" placeholder="e.g. Alice Martin" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <Select
            v-model="form.type"
            :options="typeOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Number of Shares</label>
            <InputNumber v-model="form.shares" class="w-full" :min="0" :useGrouping="true" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Ownership %</label>
            <InputText
              v-model="form.ownershipPct"
              class="w-full"
              placeholder="e.g. 34.5"
            />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Amount Invested (€)</label>
          <InputText
            v-model="form.investedAmount"
            class="w-full"
            placeholder="0"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <Textarea v-model="form.notes" class="w-full" rows="2" placeholder="Optional notes" />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button label="Cancel" severity="secondary" text @click="dialogVisible = false" :disabled="store.saving" />
          <Button
            label="Save"
            icon="pi pi-check"
            :loading="store.saving"
            :disabled="store.saving"
            @click="saveDialog"
          />
        </div>
      </template>
    </Dialog>
  </PageContainer>
</template>
