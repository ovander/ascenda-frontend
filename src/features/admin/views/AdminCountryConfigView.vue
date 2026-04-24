<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAdminCountryConfigStore } from '@/features/admin/stores/adminCountryConfigStore'
import type { CountryRateConfig } from '@/features/admin/stores/adminCountryConfigStore'
import type { CreateCountryRateConfigRequest } from '@/features/admin/stores/adminCountryConfigStore'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'

const store = useAdminCountryConfigStore()
const toast = useToast()

onMounted(() => store.fetchAll())

// ── Create dialog ─────────────────────────────────────────────────────────────
const createDialogVisible = ref(false)

const createForm = ref<CreateCountryRateConfigRequest>({
  countryCode: '',
  countryName: '',
  corporateTaxRate: 0,
  vatRate: 0,
  employerTaxRate: 0,
  mltInterestRate: 0,
  language: '',
  currencySymbol: '',
})

function openCreate() {
  createForm.value = {
    countryCode: '',
    countryName: '',
    corporateTaxRate: 0,
    vatRate: 0,
    employerTaxRate: 0,
    mltInterestRate: 0,
    language: '',
    currencySymbol: '',
  }
  createDialogVisible.value = true
}

async function saveCreate() {
  const created = await store.create(createForm.value)
  if (created) {
    createDialogVisible.value = false
    toast.add({ severity: 'success', summary: 'Created', detail: `${created.countryName} (${created.countryCode}) added`, life: 3000 })
  } else if (store.error) {
    toast.add({ severity: 'error', summary: 'Error', detail: store.error, life: 4000 })
  }
}

// ── Edit dialog ──────────────────────────────────────────────────────────────
const dialogVisible = ref(false)
const editingConfig = ref<CountryRateConfig | null>(null)

const form = ref({
  corporateTaxRate: 0,
  vatRate: 0,
  employerTaxRate: 0,
  mltInterestRate: 0,
})

function openEdit(cfg: CountryRateConfig) {
  editingConfig.value = cfg
  form.value = {
    corporateTaxRate: Number(cfg.corporateTaxRate),
    vatRate: Number(cfg.vatRate),
    employerTaxRate: Number(cfg.employerTaxRate),
    mltInterestRate: Number(cfg.mltInterestRate),
  }
  dialogVisible.value = true
}

async function saveEdit() {
  if (!editingConfig.value) return
  const updated = await store.update(editingConfig.value.countryCode, {
    corporateTaxRate: form.value.corporateTaxRate,
    vatRate: form.value.vatRate,
    employerTaxRate: form.value.employerTaxRate,
    mltInterestRate: form.value.mltInterestRate,
  })
  if (updated) {
    dialogVisible.value = false
    toast.add({ severity: 'success', summary: 'Saved', detail: `${editingConfig.value.countryName} rates updated`, life: 3000 })
  } else if (store.error) {
    toast.add({ severity: 'error', summary: 'Error', detail: store.error, life: 4000 })
  }
}

async function resetConfig(cfg: CountryRateConfig) {
  const updated = await store.resetToDefault(cfg.countryCode)
  if (updated) {
    toast.add({ severity: 'info', summary: 'Reset', detail: `${cfg.countryName} restored to built-in defaults`, life: 3000 })
  } else if (store.error) {
    toast.add({ severity: 'error', summary: 'Error', detail: store.error, life: 4000 })
  }
}

// ── Formatters ───────────────────────────────────────────────────────────────
function fmtPct(v: number): string {
  return (Number(v) * 100).toFixed(2) + ' %'
}

const sortedConfigs = computed(() =>
  [...store.configs].sort((a, b) => a.countryCode.localeCompare(b.countryCode))
)
</script>

<template>
  <div>
    <Toast />

    <div class="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Country Rate Parameters</h1>
        <p class="text-gray-500 text-sm mt-1">
          Statutory financial rates used to seed new plan configurations.
          Changes apply to newly created plans; existing plans retain their saved values.
        </p>
      </div>
      <Button
        label="New Country"
        icon="pi pi-plus"
        size="small"
        @click="openCreate"
      />
    </div>

    <Message severity="info" :closable="false" class="mb-5">
      These are platform-wide defaults. Individual plans can override them in their own Settings.
    </Message>

    <div v-if="store.loading" class="flex justify-center py-20">
      <i class="pi pi-spin pi-spinner text-3xl text-gray-400"></i>
    </div>

    <Message v-else-if="store.error" severity="error" class="mb-4">{{ store.error }}</Message>

    <DataTable
      v-else
      :value="sortedConfigs"
      stripedRows
      tableStyle="table-layout: fixed; min-width: 700px"
      class="p-datatable-sm rounded-xl border border-gray-200 overflow-hidden"
    >
      <!-- Country -->
      <Column style="width: 220px">
        <template #header>Country</template>
        <template #body="{ data }">
          <div class="flex items-center gap-2">
            <Tag :value="data.countryCode" severity="secondary" class="font-mono text-xs" />
            <span class="font-medium text-gray-800">{{ data.countryName }}</span>
            <span class="text-gray-400 text-xs">{{ data.currencySymbol }}</span>
          </div>
        </template>
      </Column>

      <!-- Corporate tax -->
      <Column style="width: 110px">
        <template #header><span style="flex:1;text-align:right">Corp. Tax</span></template>
        <template #body="{ data }">
          <div class="text-right"><span class="font-mono text-sm">{{ fmtPct(data.corporateTaxRate) }}</span></div>
        </template>
      </Column>

      <!-- VAT -->
      <Column style="width: 90px">
        <template #header><span style="flex:1;text-align:right">VAT</span></template>
        <template #body="{ data }">
          <div class="text-right"><span class="font-mono text-sm">{{ fmtPct(data.vatRate) }}</span></div>
        </template>
      </Column>

      <!-- Employer charges -->
      <Column style="width: 150px">
        <template #header><span style="flex:1;text-align:right">Employer Charges</span></template>
        <template #body="{ data }">
          <div class="text-right"><span class="font-mono text-sm">{{ fmtPct(data.employerTaxRate) }}</span></div>
        </template>
      </Column>

      <!-- MLT interest rate -->
      <Column style="width: 110px">
        <template #header><span style="flex:1;text-align:right">MLT Interest</span></template>
        <template #body="{ data }">
          <div class="text-right"><span class="font-mono text-sm">{{ fmtPct(data.mltInterestRate) }}</span></div>
        </template>
      </Column>

      <!-- Updated at -->
      <Column style="width: 130px">
        <template #header>Last updated</template>
        <template #body="{ data }">
          <span class="text-xs text-gray-400">{{ new Date(data.updatedAt).toLocaleDateString('fr-FR') }}</span>
        </template>
      </Column>

      <!-- Actions -->
      <Column style="width: 90px">
        <template #header></template>
        <template #body="{ data }">
          <div class="flex gap-1 justify-end">
            <Button
              icon="pi pi-pencil"
              text rounded size="small"
              title="Edit rates"
              @click="openEdit(data)"
            />
            <Button
              icon="pi pi-refresh"
              text rounded size="small"
              severity="secondary"
              title="Reset to built-in defaults"
              :loading="store.saving"
              @click="resetConfig(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Create dialog -->
    <Dialog
      v-model:visible="createDialogVisible"
      header="Add New Country"
      :modal="true"
      :closable="true"
      class="w-full max-w-lg"
    >
      <div class="space-y-4 pt-2">
        <p class="text-xs text-gray-500">
          Enter rates as decimals — e.g. 0.25 for 25 %.
        </p>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Country Code <span class="text-red-500">*</span></label>
            <input
              v-model="createForm.countryCode"
              maxlength="2"
              placeholder="e.g. JP"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm uppercase font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Country Name <span class="text-red-500">*</span></label>
            <input
              v-model="createForm.countryName"
              placeholder="e.g. Japan"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Currency Symbol</label>
            <input
              v-model="createForm.currencySymbol"
              placeholder="e.g. ¥"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Language</label>
            <input
              v-model="createForm.language"
              placeholder="e.g. ja"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Corporate Tax Rate
              <span class="text-gray-400 font-normal">({{ fmtPct(createForm.corporateTaxRate) }})</span>
            </label>
            <InputNumber
              v-model="createForm.corporateTaxRate"
              class="w-full"
              :min="0" :max="1" :step="0.001"
              :minFractionDigits="4" :maxFractionDigits="4"
              mode="decimal"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              VAT Rate
              <span class="text-gray-400 font-normal">({{ fmtPct(createForm.vatRate) }})</span>
            </label>
            <InputNumber
              v-model="createForm.vatRate"
              class="w-full"
              :min="0" :max="1" :step="0.001"
              :minFractionDigits="4" :maxFractionDigits="4"
              mode="decimal"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Employer Charge Rate
              <span class="text-gray-400 font-normal">({{ fmtPct(createForm.employerTaxRate) }})</span>
            </label>
            <InputNumber
              v-model="createForm.employerTaxRate"
              class="w-full"
              :min="0" :max="2" :step="0.001"
              :minFractionDigits="4" :maxFractionDigits="4"
              mode="decimal"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              MLT Interest Rate
              <span class="text-gray-400 font-normal">({{ fmtPct(createForm.mltInterestRate) }})</span>
            </label>
            <InputNumber
              v-model="createForm.mltInterestRate"
              class="w-full"
              :min="0" :max="1" :step="0.001"
              :minFractionDigits="4" :maxFractionDigits="4"
              mode="decimal"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <Button label="Cancel" severity="secondary" text @click="createDialogVisible = false" :disabled="store.saving" />
          <Button
            label="Create"
            icon="pi pi-plus"
            :loading="store.saving"
            :disabled="store.saving || !createForm.countryCode || !createForm.countryName"
            @click="saveCreate"
          />
        </div>
      </template>
    </Dialog>

    <!-- Edit dialog -->
    <Dialog
      v-model:visible="dialogVisible"
      :header="`Edit rates — ${editingConfig?.countryName} (${editingConfig?.countryCode})`"
      :modal="true"
      :closable="true"
      class="w-full max-w-md"
    >
      <div v-if="editingConfig" class="space-y-5 pt-2">
        <p class="text-xs text-gray-500">
          Enter rates as decimals — e.g. 0.25 for 25 %.
          Changes apply to all new plans created for this country from now on.
        </p>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Corporate Tax Rate
            <span class="text-gray-400 font-normal">({{ fmtPct(form.corporateTaxRate) }})</span>
          </label>
          <InputNumber
            v-model="form.corporateTaxRate"
            class="w-full"
            :min="0" :max="1" :step="0.001"
            :minFractionDigits="4" :maxFractionDigits="4"
            mode="decimal"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            VAT Rate
            <span class="text-gray-400 font-normal">({{ fmtPct(form.vatRate) }})</span>
          </label>
          <InputNumber
            v-model="form.vatRate"
            class="w-full"
            :min="0" :max="1" :step="0.001"
            :minFractionDigits="4" :maxFractionDigits="4"
            mode="decimal"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Employer Charge Rate
            <span class="text-gray-400 font-normal">({{ fmtPct(form.employerTaxRate) }})</span>
          </label>
          <InputNumber
            v-model="form.employerTaxRate"
            class="w-full"
            :min="0" :max="2" :step="0.001"
            :minFractionDigits="4" :maxFractionDigits="4"
            mode="decimal"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            MLT Interest Rate
            <span class="text-gray-400 font-normal">({{ fmtPct(form.mltInterestRate) }})</span>
          </label>
          <InputNumber
            v-model="form.mltInterestRate"
            class="w-full"
            :min="0" :max="1" :step="0.001"
            :minFractionDigits="4" :maxFractionDigits="4"
            mode="decimal"
          />
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
            @click="saveEdit"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

