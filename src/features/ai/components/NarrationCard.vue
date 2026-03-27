<script setup lang="ts">
import type { NarrationOutput, NarrationParagraph } from '@/features/ai/types'
import Tag from 'primevue/tag'

defineProps<{
  narration: NarrationOutput
}>()

function paragraphClass(type: NarrationParagraph['type']): string {
  return {
    info: 'border-l-4 border-blue-300 bg-blue-50 text-blue-900',
    warning: 'border-l-4 border-amber-400 bg-amber-50 text-amber-900',
    highlight: 'border-l-4 border-green-400 bg-green-50 text-green-900',
    risk: 'border-l-4 border-red-400 bg-red-50 text-red-900',
  }[type] ?? 'border-l-4 border-gray-300 bg-gray-50 text-gray-800'
}
</script>

<template>
  <div class="space-y-5">
    <!-- Header row -->
    <div class="flex items-start justify-between gap-3">
      <h2 class="text-xl font-bold text-gray-800 leading-tight">{{ narration.title }}</h2>
      <Tag
        v-if="narration.is_ai_generated"
        value="AI"
        severity="info"
        class="shrink-0 text-xs font-semibold"
      />
      <Tag
        v-else
        value="Fallback"
        severity="secondary"
        class="shrink-0 text-xs"
      />
    </div>

    <!-- Executive summary -->
    <p class="text-gray-700 leading-relaxed text-sm">{{ narration.summary }}</p>

    <!-- Key takeaways -->
    <div v-if="narration.key_takeaways?.length" class="bg-gray-50 rounded-xl p-4">
      <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Key Takeaways
      </h3>
      <ul class="space-y-2">
        <li
          v-for="(item, i) in narration.key_takeaways"
          :key="i"
          class="flex items-start gap-2 text-sm text-gray-700"
        >
          <i class="pi pi-check-circle text-primary-500 mt-0.5 shrink-0 text-xs"></i>
          {{ item }}
        </li>
      </ul>
    </div>

    <!-- Paragraphs -->
    <div
      v-for="(para, i) in narration.paragraphs"
      :key="i"
      :class="['rounded-r-lg px-4 py-3 text-sm leading-relaxed', paragraphClass(para.type)]"
    >
      {{ para.content }}
    </div>

    <!-- Structured data (Driver Advisor / Scenario Suggestion) -->
    <div
      v-if="narration.structured_data && Object.keys(narration.structured_data).length"
      class="bg-violet-50 border border-violet-200 rounded-xl p-4"
    >
      <h3 class="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <i class="pi pi-database text-xs"></i>
        Structured Output
      </h3>
      <pre class="text-xs text-violet-800 whitespace-pre-wrap overflow-auto max-h-64">{{
        JSON.stringify(narration.structured_data, null, 2)
      }}</pre>
    </div>
  </div>
</template>
