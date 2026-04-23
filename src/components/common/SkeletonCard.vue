<script setup lang="ts">
import Skeleton from 'primevue/skeleton'
defineProps<{ lines?: number }>()
</script>

<template>
  <div class="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
    <div class="flex items-center gap-3">
      <Skeleton shape="circle" size="3rem" />
      <div class="flex-1 space-y-2">
        <Skeleton height="1rem" width="60%" />
        <Skeleton height="0.75rem" width="80%" />
      </div>
    </div>
    <Skeleton v-for="i in (lines ?? 2)" :key="i" height="0.75rem" />
  </div>
</template>
