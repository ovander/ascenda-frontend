<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSettingsStore } from '@/features/settings/stores/settingsStore'
import { useUiStore } from '@/stores/ui'
import { useYearHeaders } from '@/composables/useYearHeaders'
import KPaymentTranches from '@/components/common/KPaymentTranches.vue'
import KFieldLabel from '@/components/common/KFieldLabel.vue'
import KFormLegend from '@/components/common/KFormLegend.vue'
import InputNumber from 'primevue/inputnumber'
import Fieldset from 'primevue/fieldset'
import type { PaymentTranches, WorkingCapitalConfig } from '@/types'
import { debounce } from '@/utils/format'

const settingsStore = useSettingsStore()
const ui = useUiStore()
const { yearHeaders } = useYearHeaders()

// ── Helpers: convert fraction 0–1 ↔ percentage 0–100 ────────────────────────
const fracToPct = (v: string | number | null | undefined): number =>
  Math.round(parseFloat(String(v ?? '0')) * 100)

const pctToFrac = (v: number): string =>
  (v / 100).toFixed(4)

function toCustomerTranches(cfg: WorkingCapitalConfig | null): PaymentTranches {
  if (!cfg) return { days0: '0', days30: '0', days60: '0', days90: '0', days120: '0' }
  return {
    days0:   String(fracToPct(cfg.customerPct0Days)),
    days30:  String(fracToPct(cfg.customerPct30Days)),
    days60:  String(fracToPct(cfg.customerPct60Days)),
    days90:  String(fracToPct(cfg.customerPct90Days)),
    days120: String(Math.max(0,
      100 - fracToPct(cfg.customerPct0Days) - fracToPct(cfg.customerPct30Days)
          - fracToPct(cfg.customerPct60Days) - fracToPct(cfg.customerPct90Days),
    )),
  }
}

function toSupplierTranches(cfg: WorkingCapitalConfig | null): PaymentTranches {
  if (!cfg) return { days0: '0', days30: '0', days60: '0', days90: '0', days120: '0' }
  return {
    days0:   String(fracToPct(cfg.supplierPct0Days)),
    days30:  String(fracToPct(cfg.supplierPct30Days)),
    days60:  String(fracToPct(cfg.supplierPct60Days)),
    days90:  String(fracToPct(cfg.supplierPct90Days)),
    days120: String(Math.max(0,
      100 - fracToPct(cfg.supplierPct0Days) - fracToPct(cfg.supplierPct30Days)
          - fracToPct(cfg.supplierPct60Days) - fracToPct(cfg.supplierPct90Days),
    )),
  }
}

function toInventoryPcts(cfg: WorkingCapitalConfig | null): number[] {
  return [
    fracToPct(cfg?.inventoryPctYear1),
    fracToPct(cfg?.inventoryPctYear2),
    fracToPct(cfg?.inventoryPctYear3),
    fracToPct(cfg?.inventoryPctYear4),
    fracToPct(cfg?.inventoryPctYear5),
  ]
}

const customerTranches = ref<PaymentTranches>(toCustomerTranches(settingsStore.wcConfig))
const supplierTranches = ref<PaymentTranches>(toSupplierTranches(settingsStore.wcConfig))
const inventoryPcts    = ref<number[]>(toInventoryPcts(settingsStore.wcConfig))

let initialising = false

watch(() => settingsStore.wcConfig, (cfg, prev) => {
  if (prev === null && cfg !== null) {
    initialising = true
    customerTranches.value = toCustomerTranches(cfg)
    supplierTranches.value = toSupplierTranches(cfg)
    inventoryPcts.value    = toInventoryPcts(cfg)
    setTimeout(() => { initialising = false }, 300)
  }
})

const saving = ref(false)

const debouncedSave = debounce(async () => {
  saving.value = true
  try {
    const payload = {
      customerPct0Days:  pctToFrac(parseFloat(customerTranches.value.days0)),
      customerPct30Days: pctToFrac(parseFloat(customerTranches.value.days30)),
      customerPct60Days: pctToFrac(parseFloat(customerTranches.value.days60)),
      customerPct90Days: pctToFrac(parseFloat(customerTranches.value.days90)),
      supplierPct0Days:  pctToFrac(parseFloat(supplierTranches.value.days0)),
      supplierPct30Days: pctToFrac(parseFloat(supplierTranches.value.days30)),
      supplierPct60Days: pctToFrac(parseFloat(supplierTranches.value.days60)),
      supplierPct90Days: pctToFrac(parseFloat(supplierTranches.value.days90)),
      inventoryPctYear1: pctToFrac(inventoryPcts.value[0]),
      inventoryPctYear2: pctToFrac(inventoryPcts.value[1]),
      inventoryPctYear3: pctToFrac(inventoryPcts.value[2]),
      inventoryPctYear4: pctToFrac(inventoryPcts.value[3]),
      inventoryPctYear5: pctToFrac(inventoryPcts.value[4]),
    }
    await settingsStore.updateWcConfig(payload)
    ui.showToast('success', 'Working capital config saved')
  } catch (err: any) {
    ui.showToast('error', 'Failed to save', err.message)
  } finally {
    saving.value = false
  }
}, 500)

function updateCustomerTranches(val: PaymentTranches) {
  customerTranches.value = val
  if (!initialising) debouncedSave()
}

function updateSupplierTranches(val: PaymentTranches) {
  supplierTranches.value = val
  if (!initialising) debouncedSave()
}

function updateInventoryPct(idx: number, val: number | null) {
  inventoryPcts.value[idx] = val ?? 0
  if (!initialising) debouncedSave()
}
</script>

<template>
  <div class="space-y-6 pt-4 max-w-4xl">

    <KFormLegend
      description="Working capital parameters control how quickly customers pay and how long you take to pay suppliers. Payment tranches must always sum to 100%."
      :extras="[
        { color: '#dcfce7', text: '120-day tranche is auto-calculated as the residual to reach 100%' },
      ]"
    />

    <!-- Payment Tranches -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Fieldset>
        <template #legend>
          <span class="flex items-center gap-1.5 font-semibold">
            Customer Payment Tranches
            <i
              class="pi pi-info-circle text-gray-400 hover:text-blue-500 cursor-help text-xs"
              v-tooltip.top="'How your customers pay you. Distribute 100% across payment terms. The model uses these weights to compute receivables days outstanding (DSO) and the monthly cash inflow schedule.'"
            />
          </span>
        </template>
        <KPaymentTranches
          :modelValue="customerTranches"
          @update:modelValue="updateCustomerTranches"
          label="Customer payment terms"
        />
      </Fieldset>

      <Fieldset>
        <template #legend>
          <span class="flex items-center gap-1.5 font-semibold">
            Supplier Payment Tranches
            <i
              class="pi pi-info-circle text-gray-400 hover:text-blue-500 cursor-help text-xs"
              v-tooltip.top="'How long you take to pay your suppliers. Distribute 100% across payment terms. The model uses these weights to compute payables days outstanding (DPO) and the monthly cash outflow schedule.'"
            />
          </span>
        </template>
        <KPaymentTranches
          :modelValue="supplierTranches"
          @update:modelValue="updateSupplierTranches"
          label="Supplier payment terms"
        />
      </Fieldset>
    </div>

    <!-- Inventory -->
    <Fieldset>
      <template #legend>
        <span class="flex items-center gap-1.5 font-semibold">
          Inventory as % of Sales at Production Cost
          <i
            class="pi pi-info-circle text-gray-400 hover:text-blue-500 cursor-help text-xs"
            v-tooltip.top="'Target inventory level expressed as a percentage of annual production cost (COGS). A value of 20% means you hold roughly 73 days of production stock (20% × 365 days). Enter per forecast year — adjust as your supply chain matures.'"
          />
        </span>
      </template>
      <div class="grid grid-cols-5 gap-4">
        <div v-for="(header, idx) in yearHeaders" :key="idx">
          <KFieldLabel
            :label="header"
            :tooltip="`Target inventory level for ${header}: enter as a percentage of that year's production cost (e.g. 15 means 15% ≈ 55 days of stock).`"
          />
          <InputNumber
            :modelValue="inventoryPcts[idx]"
            @update:modelValue="(v) => updateInventoryPct(idx, v)"
            suffix=" %"
            :min="0"
            :max="100"
            :maxFractionDigits="2"
            class="w-full"
            inputClass="w-full text-right"
          />
        </div>
      </div>
    </Fieldset>

    <div class="flex items-center gap-2 text-sm text-gray-500">
      <i v-if="saving" class="pi pi-spin pi-spinner"></i>
      <span v-if="saving">Saving...</span>
      <span v-else><i class="pi pi-check text-green-500"></i> Auto-saved</span>
    </div>
  </div>
</template>
