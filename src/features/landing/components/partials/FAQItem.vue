<template>
  <details class="bg-white border border-slate-200 rounded-xl group shadow-xs">
    <summary class="flex justify-between items-center px-6 py-5 cursor-pointer list-none text-slate-800 font-medium">
      {{ question }}

      <svg
          class="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 9l-7 7-7-7"/>
      </svg>
    </summary>

    <p class="px-6 pb-5 text-sm text-slate-600 leading-relaxed">
      <slot />
    </p>
  </details>
</template>

<script setup lang="ts">
defineProps<{
  question: string
}>()
</script>
