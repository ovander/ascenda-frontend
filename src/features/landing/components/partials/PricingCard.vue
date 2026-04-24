<template>
  <div
      class="rounded-2xl p-8 flex flex-col"
      :class="[
      highlight
        ? 'bg-white border-2 border-indigo-500 card-glow-pro'
        : 'bg-slate-50 border border-slate-200 card-glow'
    ]"
  >

    <div v-if="highlight" class="text-center mb-4">
      <span class="bg-indigo-600 text-white text-xs px-3 py-1 rounded-full">
        Most popular
      </span>
    </div>

    <div class="mb-6">
      <div class="text-sm text-slate-500">{{ title }}</div>

      <div class="flex items-end gap-1 mb-3">
        <span class="text-4xl font-bold text-slate-900">{{ price }}</span>
        <span v-if="price !== 'Custom'" class="text-sm text-slate-500">/month</span>
      </div>

      <p class="text-sm text-slate-600">
        <slot name="description" />
      </p>
    </div>

    <ul class="space-y-2 mb-8 flex-1 text-sm">
      <li v-for="(feature, i) in features" :key="i" class="flex gap-2 items-start">
        <span class="text-emerald-400">✔</span>
        {{ feature }}
      </li>
    </ul>

    <button
        class="mt-auto py-3 rounded-xl font-medium"
        :class="highlight
        ? 'bg-indigo-600 text-white'
        : 'border border-indigo-300 text-indigo-600 hover:bg-indigo-50'"
    >
      {{ cta }}
    </button>

  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  price: string
  features?: string[]
  cta?: string
  highlight?: boolean
}>()
</script>

<style scoped>
.card-glow {
  box-shadow: 0 0 0 1px rgba(99,102,241,0.1), 0 4px 20px rgba(0,0,0,0.06);
}
.card-glow-pro {
  box-shadow: 0 0 0 2px #6366f1, 0 8px 40px rgba(99,102,241,0.25);
}
</style>
