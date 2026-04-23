<template>
  <div :class="['mb-4 md:mb-6', props.tight && 'mb-2 md:mb-3']">
    <slot />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ tight?: boolean }>()
</script>
