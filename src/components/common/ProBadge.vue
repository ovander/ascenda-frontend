<script setup lang="ts">
// Small "PRO" badge shown next to locked nav items or feature titles.
defineProps<{ size?: 'sm' | 'xs' }>()
</script>

<template>
  <span
    class="inline-flex items-center rounded-full font-bold uppercase tracking-wide bg-amber-100 text-amber-700 border border-amber-300"
    :class="size === 'xs' ? 'text-[9px] px-1.5 py-0' : 'text-[10px] px-2 py-0.5'"
  >
    PRO
  </span>
</template>
