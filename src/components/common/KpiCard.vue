<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  unit?: string
  trend?: 'up' | 'down' | 'flat'
  severity?: 'positive' | 'negative' | 'neutral'
  subtitle?: string
}>()
</script>

<template>
  <div class="bg-white border border-gray-200 rounded-xl p-3 flex flex-col gap-1">
    <p class="text-xs text-gray-500 font-medium truncate">{{ label }}</p>
    <div class="flex items-baseline gap-1.5">
      <span
        :class="[
          'text-lg font-bold leading-tight',
          severity === 'positive' ? 'text-green-700' :
          severity === 'negative' ? 'text-red-600' : 'text-gray-900'
        ]"
      >{{ value }}</span>
      <span v-if="unit" class="text-xs text-gray-400">{{ unit }}</span>
      <i
        v-if="trend"
        :class="[
          'text-[11px] ml-auto',
          trend === 'up' ? 'pi pi-arrow-up text-green-500' :
          trend === 'down' ? 'pi pi-arrow-down text-red-500' :
          'pi pi-minus text-gray-400'
        ]"
      ></i>
    </div>
    <p v-if="subtitle" class="text-[10px] text-gray-400 truncate">{{ subtitle }}</p>
  </div>
</template>
