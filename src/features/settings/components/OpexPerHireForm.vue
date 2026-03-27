<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSettingsStore } from '@/features/settings/stores/settingsStore'
import { usePlanAccess } from '@/composables/usePlanAccess'
import type { OpexPerHire } from '@/types'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import KFieldLabel from '@/components/common/KFieldLabel.vue'
import KFormLegend from '@/components/common/KFormLegend.vue'

const settingsStore = useSettingsStore()
const { canEdit } = usePlanAccess()

const form = ref<Partial<OpexPerHire>>({})
const saving = ref(false)
const saved = ref(false)

watch(
  () => settingsStore.opexPerHire,
  (val) => { if (val) form.value = { ...val } },
  { immediate: true }
)

async function save() {
  saving.value = true
  saved.value = false
  try {
    await settingsStore.updateOpexPerHire(form.value)
    saved.value = true
    setTimeout(() => { saved.value = false }, 2000)
  } finally {
    saving.value = false
  }
}

const sections = [
  {
    title: 'Premises & Services',
    fields: [
      {
        key: 'propertyRentals',
        label: 'Property Rentals base (k€/year)',
        fractions: 0, maxFractions: 2,
        tooltip: 'Fixed annual office and facility rental cost for the whole company (not per employee). Entered in thousands of euros per year. This is a base cost added once regardless of headcount.',
      },
      {
        key: 'postageTelecom',
        label: 'Postage & Telecom (k€/person)',
        fractions: 2, maxFractions: 4,
        tooltip: 'Phone, internet, postage, and courier costs allocated per employee per year, in thousands of euros. Multiplied by total headcount each year to compute the total line item.',
      },
      {
        key: 'suppliesPurchases',
        label: 'Supplies & Purchases (k€/person)',
        fractions: 2, maxFractions: 4,
        tooltip: 'Office supplies, consumables, and small purchases allocated per employee per year, in thousands of euros. Multiplied by total headcount to compute the annual total.',
      },
      {
        key: 'studiesDocumentation',
        label: 'Studies & Documentation (k€/person)',
        fractions: 2, maxFractions: 4,
        tooltip: 'Per-employee budget for subscriptions, market studies, technical documentation, and reference materials, in thousands of euros per year.',
      },
      {
        key: 'insuranceCostsPctSales',
        label: 'Insurance Costs (% of sales)',
        fractions: 3, maxFractions: 4,
        tooltip: 'Business insurance (liability, property, D&O, etc.) expressed as a raw decimal fraction of annual sales. Enter as a decimal: e.g. 0.005 = 0.5% of sales. Applied to each year\'s total revenue.',
      },
    ],
  },
  {
    title: 'Travel & Representation',
    fields: [
      {
        key: 'travelTransportation',
        label: 'Travel & Transportation (k€/person)',
        fractions: 2, maxFractions: 4,
        tooltip: 'Average annual travel and transportation budget per employee, in thousands of euros. Includes flights, train tickets, taxis, and mileage reimbursements.',
      },
      {
        key: 'missionRepresentation',
        label: 'Mission & Representation (k€/person)',
        fractions: 2, maxFractions: 4,
        tooltip: 'Per-employee budget for client entertainment, business meals, trade shows, and representation expenses, in thousands of euros per year.',
      },
    ],
  },
  {
    title: 'Royalties',
    fields: [
      {
        key: 'royaltyPaymentsPctSales',
        label: 'Royalty Payments (% of sales)',
        fractions: 3, maxFractions: 4,
        tooltip: 'Royalties or licence fees paid to third parties (IP owners, franchisors, platform providers), expressed as a raw decimal fraction of annual sales. Enter as a decimal: e.g. 0.02 = 2% of sales.',
      },
    ],
  },
  {
    title: 'HR & Admin',
    fields: [
      {
        key: 'recruitTrainingPctPayroll',
        label: 'Recruitment & Training (% of payroll)',
        fractions: 3, maxFractions: 4,
        tooltip: 'Annual recruitment agency fees, job advertising, onboarding, and training costs, expressed as a raw decimal fraction of total gross payroll. Enter as a decimal: e.g. 0.05 = 5% of payroll.',
      },
    ],
  },
]
</script>

<template>
  <div class="space-y-6 max-w-2xl">

    <KFormLegend
      description="These parameters drive the formula-computed OPEX lines in the P&L. Per-capita values are multiplied by headcount each year; percentage values are applied to the relevant base (sales or payroll)."
      :extras="[
        { icon: 'pi-info-circle', text: 'k€/person = thousands of euros per employee per year' },
        { icon: 'pi-info-circle', text: 'Percentage fields here are raw decimals (e.g. 0.005 = 0.5 %)' },
      ]"
    />

    <div v-for="section in sections" :key="section.title">
      <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
        {{ section.title }}
      </h3>
      <div class="grid grid-cols-2 gap-4">
        <div v-for="field in section.fields" :key="field.key" class="flex flex-col gap-1">
          <KFieldLabel :label="field.label" :tooltip="field.tooltip" />
          <InputNumber
            v-model="(form as any)[field.key]"
            :disabled="!canEdit"
            :min-fraction-digits="field.fractions"
            :max-fraction-digits="field.maxFractions"
            mode="decimal"
          />
        </div>
      </div>
    </div>

    <div class="flex items-center gap-3 pt-2" v-if="canEdit">
      <Button
        label="Save Parameters"
        icon="pi pi-check"
        :loading="saving"
        @click="save"
      />
      <span v-if="saved" class="text-sm text-green-600 flex items-center gap-1">
        <i class="pi pi-check-circle"></i> Saved
      </span>
    </div>
  </div>
</template>
