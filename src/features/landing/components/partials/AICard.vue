<template>
  <div
      class="rounded-2xl p-6 border transition-colors group"
      :class="highlight ? 'border-amber-300' : 'border-slate-200 hover:border-violet-300'"
      :style="highlight ? enterpriseStyle : proStyle"
  >

    <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
         :style="highlight ? enterpriseIcon : proIcon">
      <slot name="icon">
        <div class="w-5 h-5 bg-violet-500 rounded"></div>
      </slot>
    </div>

    <h3 class="font-semibold text-slate-900 mb-1.5">
      {{ title }}
      <span v-if="badge"
            class="text-xs ml-2 px-2 py-0.5 rounded-full border"
            :class="badgeClass">
        {{ badge }}
      </span>
    </h3>

    <p class="text-slate-600 text-sm leading-relaxed">
      <slot />
    </p>

  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string
  badge?: string
  highlight?: boolean
}>()

const proStyle = 'background: linear-gradient(135deg,#faf5ff,#f5f3ff)'
const enterpriseStyle = 'background: linear-gradient(135deg,#fffbeb,#fef3c7,#fff)'

const proIcon = 'background: rgba(139,92,246,0.1)'
const enterpriseIcon = 'background: rgba(217,119,6,0.1)'

const badgeClass = props.highlight
    ? 'text-amber-700 bg-amber-50 border-amber-300'
    : 'text-violet-600 bg-violet-50 border-violet-200'
</script>
