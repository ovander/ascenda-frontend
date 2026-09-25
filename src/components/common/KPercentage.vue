<script setup lang="ts">
import InputNumber from 'primevue/inputnumber'

withDefaults(defineProps<{
  modelValue: number | null
  decimals?: number
  disabled?: boolean
  min?: number
  max?: number
}>(), {
  decimals: 1,
  disabled: false,
  min: 0,
  max: 100,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | null): void
}>()
</script>

<template>
  <InputNumber
    :modelValue="modelValue"
    @update:modelValue="(v) => emit('update:modelValue', v)"
    :minFractionDigits="decimals"
    :maxFractionDigits="decimals"
    :min="min"
    :max="max"
    suffix=" %"
    :disabled="disabled"
    class="w-full"
    inputClass="text-right"
  />
</template>
