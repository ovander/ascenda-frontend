<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/features/settings/stores/settingsStore'
import { useUiStore } from '@/stores/ui'
import InputNumber from 'primevue/inputnumber'
import Fieldset from 'primevue/fieldset'
import Message from 'primevue/message'
import KFieldLabel from '@/components/common/KFieldLabel.vue'
import KFormLegend from '@/components/common/KFormLegend.vue'
import { debounce } from '@/utils/format'
import { useDecimal } from '@/composables/useDecimal'

const { t } = useI18n()
const settingsStore = useSettingsStore()
const { getLocale } = useDecimal()
const ui = useUiStore()

const form = ref({ ...settingsStore.openingBalance! })
const saving = ref(false)

const totalAssets = computed(() => {
  return (
    (parseFloat(form.value.noncurrentAssets) || 0) +
    (parseFloat(form.value.inventories) || 0) +
    (parseFloat(form.value.customerReceivables) || 0) +
    (parseFloat(form.value.cashAndSecurities) || 0)
  )
})

const totalExplicitLiabilities = computed(() => {
  return (
    (parseFloat(form.value.shareCapital) || 0) +
    (parseFloat(form.value.retainedEarnings) || 0) +
    (parseFloat(form.value.loansAndDebt) || 0) +
    (parseFloat(form.value.supplierPayables) || 0) +
    (parseFloat(form.value.socialAndTaxDebts) || 0)
  )
})

const otherPayables = computed(() => {
  // May be negative when explicit liabilities already exceed assets (equity-negative opening
  // balance). The negative plug keeps the accounting identity Assets = Liabilities intact.
  return totalAssets.value - totalExplicitLiabilities.value
})

const totalLiabilities = computed(() => totalExplicitLiabilities.value + otherPayables.value)

const isBalanced = computed(() => Math.abs(totalAssets.value - totalLiabilities.value) < 0.01)

const debouncedSave = debounce(async () => {
  saving.value = true
  try {
    await settingsStore.updateOpeningBalance(form.value)
    ui.showToast('success', 'Opening balance saved')
  } catch (err: any) {
    ui.showToast('error', 'Failed to save', err.message)
  } finally {
    saving.value = false
  }
}, 500)

const assetFields = [
  {
    key:     'noncurrentAssets',
    label:   'Non-Current Assets',
    tooltip: 'Fixed assets held for long-term use: property, plant, equipment, and intangible assets (patents, goodwill). Enter the net book value (after depreciation) at the start of the forecast.',
  },
  {
    key:     'inventories',
    label:   'Inventories',
    tooltip: 'Stock of raw materials, work-in-progress, and finished goods on hand at the opening balance date. Valued at cost.',
  },
  {
    key:     'customerReceivables',
    label:   'Customer Receivables',
    tooltip: 'Outstanding invoices issued to customers that have not yet been collected. Represents money owed to the company at the start of the forecast.',
  },
  {
    key:     'cashAndSecurities',
    label:   'Cash & Securities',
    tooltip: t('settings.tooltip.cashAndSecurities'),
  },
]

const liabilityFields = [
  {
    key:     'shareCapital',
    label:   'Share Capital',
    tooltip: 'Equity contributed by shareholders through share subscriptions. Represents the nominal value of issued shares plus any share premium.',
  },
  {
    key:     'retainedEarnings',
    label:   'Retained Earnings',
    tooltip: 'Cumulative undistributed profits from prior years. A negative value means accumulated losses. This rolls forward automatically each year in the model.',
  },
  {
    key:     'loansAndDebt',
    label:   'Loans & Debt',
    tooltip: 'Outstanding principal on bank loans and other financial debt at the opening date. The model will schedule repayments based on the MLT Loan Term set in Configuration.',
  },
  {
    key:     'supplierPayables',
    label:   'Supplier Payables',
    tooltip: 'Trade payables: invoices received from suppliers that have not yet been paid. Represents money the company owes to its suppliers at the start of the forecast.',
  },
  {
    key:     'socialAndTaxDebts',
    label:   'Social & Tax Debts',
    tooltip: 'Outstanding social security contributions and tax liabilities owed to government authorities at the opening balance date (e.g. payroll taxes payable, VAT balance due).',
  },
]
</script>

<template>
  <div class="pt-4">

    <KFormLegend
      :extras="[
        { icon: 'pi-equals', text: 'Assets must equal Liabilities — any gap is filled automatically by Other Payables' },
      ]"
    />

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">

      <!-- ── Assets ─────────────────────────────────────────────────────────── -->
      <Fieldset legend="Assets">
        <div class="space-y-3">
          <div v-for="field in assetFields" :key="field.key">
            <KFieldLabel :label="field.label" :tooltip="field.tooltip" />
            <InputNumber
              v-model="(form as any)[field.key]"
              :maxFractionDigits="2"
              class="w-full"
              inputClass="text-right"
              @blur="debouncedSave"
            />
          </div>
          <div class="border-t pt-3 mt-3">
            <div class="flex justify-between font-bold text-lg">
              <span>Total Assets</span>
              <span>{{ totalAssets.toLocaleString(getLocale(), { minimumFractionDigits: 2 }) }}</span>
            </div>
          </div>
        </div>
      </Fieldset>

      <!-- ── Liabilities ────────────────────────────────────────────────────── -->
      <Fieldset legend="Liabilities">
        <div class="space-y-3">
          <div v-for="field in liabilityFields" :key="field.key">
            <KFieldLabel :label="field.label" :tooltip="field.tooltip" />
            <InputNumber
              v-model="(form as any)[field.key]"
              :maxFractionDigits="2"
              class="w-full"
              inputClass="text-right"
              @blur="debouncedSave"
            />
          </div>
          <div>
            <KFieldLabel
              label="Other Payables (balancing plug)"
              tooltip="Computed automatically as the difference between Total Assets and all other liabilities. Ensures the balance sheet is always in balance. You cannot edit this field directly."
            />
            <div class="bg-green-50 border border-green-200 rounded-sm px-3 py-2 text-right text-sm font-medium">
              {{ otherPayables.toLocaleString(getLocale(), { minimumFractionDigits: 2 }) }}
            </div>
          </div>
          <div class="border-t pt-3 mt-3">
            <div class="flex justify-between font-bold text-lg">
              <span>Total Liabilities</span>
              <span>{{ totalLiabilities.toLocaleString(getLocale(), { minimumFractionDigits: 2 }) }}</span>
            </div>
          </div>
        </div>
      </Fieldset>
    </div>

    <Message :severity="isBalanced ? 'success' : 'error'" class="mt-4 max-w-4xl" :closable="false">
      <template v-if="isBalanced">
        <i class="pi pi-check-circle mr-2"></i> Balance sheet is balanced: Assets = Liabilities
      </template>
      <template v-else>
        <i class="pi pi-exclamation-triangle mr-2"></i>
        Balance sheet is NOT balanced. Difference:
        {{ Math.abs(totalAssets - totalLiabilities).toLocaleString(getLocale(), { minimumFractionDigits: 2 }) }}
      </template>
    </Message>

    <div class="flex items-center gap-2 text-sm text-gray-500 mt-2">
      <i v-if="saving" class="pi pi-spin pi-spinner"></i>
      <span v-if="saving">Saving...</span>
      <span v-else><i class="pi pi-check text-green-500"></i> Auto-saved</span>
    </div>
  </div>
</template>
