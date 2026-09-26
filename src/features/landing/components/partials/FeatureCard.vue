<template>
  <div class="bg-white rounded-2xl p-7 border border-slate-200 hover:border-indigo-300 transition-colors card-glow group">
    <div class="icon-ring w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:bg-indigo-100 transition-colors">
      <slot name="icon">
        <div class="w-6 h-6 bg-indigo-400 rounded-sm"></div>
      </slot>
    </div>

    <h3 class="font-semibold text-slate-900 text-lg mb-2">
      {{ title }}
    </h3>

    <p class="text-slate-600 text-sm leading-relaxed">
      <slot />
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<style scoped>
.icon-ring {
  background: rgba(99,102,241,0.08);
  border: 1px solid rgba(99,102,241,0.18);
}
.card-glow {
  box-shadow: 0 0 0 1px rgba(99,102,241,0.1), 0 4px 20px rgba(0,0,0,0.06);
}
</style>
