<script setup lang="ts">
import KpiCard from './KpiCard.vue'

export interface KpiItem {
  id: string
  label: string
  value: string | number
  unit?: string
  trend?: 'up' | 'down' | 'flat'
  severity?: 'positive' | 'negative' | 'neutral'
  subtitle?: string
}

defineProps<{ items: KpiItem[] }>()
</script>

<template>
  <div class="grid grid-cols-2 gap-3">
    <KpiCard
      v-for="item in items"
      :key="item.id"
      v-bind="item"
    />
  </div>
</template>
