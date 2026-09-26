<script setup lang="ts">
import { computed } from 'vue'
import InputNumber from 'primevue/inputnumber'
import Message from 'primevue/message'
import type { PaymentTranches } from '@/types'

const props = defineProps<{
  modelValue: PaymentTranches
  label: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: PaymentTranches): void
}>()

const tiers = [
  { key: 'days0' as const, label: '0 days (cash)' },
  { key: 'days30' as const, label: '30 days' },
  { key: 'days60' as const, label: '60 days' },
  { key: 'days90' as const, label: '90 days' },
  { key: 'days120' as const, label: '120 days' },
]

const sum = computed(() => {
  const vals = [
    parseFloat(props.modelValue.days0) || 0,
    parseFloat(props.modelValue.days30) || 0,
    parseFloat(props.modelValue.days60) || 0,
    parseFloat(props.modelValue.days90) || 0,
  ]
  return vals.reduce((a, b) => a + b, 0)
})

const autoDay120 = computed(() => Math.max(0, 100 - sum.value))

const isValid = computed(() => {
  return Math.abs(sum.value + autoDay120.value - 100) < 0.01
})

function updateTier(key: keyof PaymentTranches, value: number | null) {
  const updated = { ...props.modelValue, [key]: String(value ?? 0) }
  updated.days120 = String(Math.max(0, 100 - (
    (parseFloat(updated.days0) || 0) +
    (parseFloat(updated.days30) || 0) +
    (parseFloat(updated.days60) || 0) +
    (parseFloat(updated.days90) || 0)
  )))
  emit('update:modelValue', updated)
}
</script>

<template>
  <div>
    <h4 class="font-semibold text-gray-700 mb-3">{{ label }}</h4>
    <div class="space-y-2">
      <div v-for="tier in tiers" :key="tier.key" class="flex items-center gap-3">
        <label class="w-32 text-sm text-gray-600">{{ tier.label }}</label>
        <InputNumber
          v-if="tier.key !== 'days120'"
          :modelValue="parseFloat(modelValue[tier.key]) || 0"
          @update:modelValue="(v) => updateTier(tier.key, v)"
          suffix=" %"
          :min="0"
          :max="100"
          :maxFractionDigits="1"
          class="w-32"
          inputClass="w-full text-right"
        />
        <div v-else class="w-32 text-right text-sm font-medium bg-green-50 px-3 py-2 rounded-sm border border-green-200">
          {{ autoDay120.toFixed(1) }} %
        </div>
      </div>
    </div>
    <Message v-if="!isValid" severity="error" class="mt-2" :closable="false">
      Tranches must sum to 100%
    </Message>
    <Message v-else severity="success" class="mt-2" :closable="false">
      Total: 100%
    </Message>
  </div>
</template>
