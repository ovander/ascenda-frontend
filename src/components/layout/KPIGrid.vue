<template>
  <div :class="gridClass">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  /** Maximum number of columns at desktop. Default: 4 */
  cols?: 2 | 3 | 4 | 6
}>()

const gridClass = computed(() => {
  const map: Record<number, string> = {
    2: 'grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4',
    3: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4',
    4: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4',
    6: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4',
  }
  return map[props.cols ?? 4]
})
</script>
