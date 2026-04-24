<template>
  <div class="flex flex-col items-center gap-3 p-5 rounded-2xl border border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors group">

    <div class="w-10 h-10 rounded-xl flex items-center justify-center icon-ring group-hover:bg-indigo-100 transition-colors">
      <slot name="icon">
        <div class="w-5 h-5 bg-indigo-400 rounded"></div>
      </slot>
    </div>

    <div class="text-center">
      <div class="text-sm font-semibold text-slate-800">
        {{ label }}
      </div>
      <div class="text-xs text-slate-500 mt-0.5">
        {{ desc }}
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  desc: string
}>()
</script>

<style scoped>
.icon-ring {
  background: rgba(99,102,241,0.08);
  border: 1px solid rgba(99,102,241,0.18);
}
</style>
