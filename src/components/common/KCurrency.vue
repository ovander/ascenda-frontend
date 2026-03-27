<script setup lang="ts">
import InputNumber from 'primevue/inputnumber'
import { useDecimal } from '@/composables/useDecimal'
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: number | null
  locale?: string
  decimals?: number
  disabled?: boolean
  suffix?: string
}>(), {
  decimals: 2,
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | null): void
}>()

const { getUnitLabel, getLocale } = useDecimal()
const displaySuffix = computed(() => props.suffix || ` ${getUnitLabel()}`)
const activeLocale = computed(() => props.locale ?? getLocale())
</script>

<template>
  <InputNumber
    :modelValue="modelValue"
    @update:modelValue="(v) => emit('update:modelValue', v)"
    :minFractionDigits="decimals"
    :maxFractionDigits="decimals"
    :locale="activeLocale"
    mode="decimal"
    :suffix="displaySuffix"
    :disabled="disabled"
    class="w-full"
    inputClass="text-right"
  />
</template>
