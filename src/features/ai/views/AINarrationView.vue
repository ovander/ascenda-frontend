<script setup lang="ts">
/**
 * AINarrationView — generic view for every AI narration endpoint.
 *
 * Route props:
 *   planId  — active plan UUID (from URL)
 *   sid     — active scenario UUID (from URL)
 *   feature — one of the AI_FEATURES keys (e.g. "narrate", "unit-economics", …)
 *
 * Access control is enforced server-side (tier gate + AI access middleware).
 * Client-side, the view calls gate() before mounting so blocked users see the
 * upgrade modal rather than a naked API 403.
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAIStore } from '@/features/ai/stores/aiStore'
import { useTierGate } from '@/composables/useTierGate'
import { AI_FEATURES } from '@/features/ai/types'
import type { AIFeatureDef } from '@/features/ai/types'
import NarrationCard from '@/features/ai/components/NarrationCard.vue'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import Message from 'primevue/message'

defineProps<{ planId?: string; sid?: string }>()

const route = useRoute()
const store = useAIStore()
const { isPro, isEnterprise, gate } = useTierGate()

// ── Feature config ─────────────────────────────────────────────
const featureKey = computed(() => route.params.feature as string)

const featureDef = computed<AIFeatureDef | undefined>(() =>
  AI_FEATURES.find((f) => f.key === featureKey.value),
)

// ── Tier mapping ───────────────────────────────────────────────
function hasAccess(def: AIFeatureDef): boolean {
  if (def.tier === 'standard') return true
  if (def.tier === 'pro') return isPro.value
  if (def.tier === 'enterprise') return isEnterprise.value
  return false
}

function requiredTierLabel(def: AIFeatureDef): string {
  return def.tier === 'enterprise' ? 'Enterprise' : 'Pro'
}

// ── Lifecycle ──────────────────────────────────────────────────
onMounted(async () => {
  const def = featureDef.value
  if (!def) return

  if (def.tier === 'pro' && !gate('pro', def.label)) return
  if (def.tier === 'enterprise' && !gate('enterprise', def.label)) return

  store.reset()
  await store.fetchNarration(def.endpoint, { narration_type: def.narration_type })
})

async function refresh() {
  const def = featureDef.value
  if (!def) return
  store.reset()
  await store.fetchNarration(def.endpoint, { narration_type: def.narration_type })
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-6 py-8 space-y-6">

    <!-- Feature header -->
    <div v-if="featureDef" class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-50">
          <i :class="[featureDef.icon, 'text-primary-600 text-lg']"></i>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-bold text-gray-900">{{ featureDef.label }}</h1>
            <!-- Tier badge -->
            <span
              v-if="featureDef.tier === 'pro'"
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"
            >
              PRO
            </span>
            <span
              v-else-if="featureDef.tier === 'enterprise'"
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700"
            >
              ENTERPRISE
            </span>
          </div>
          <p class="text-sm text-gray-500 mt-0.5">{{ featureDef.description }}</p>
        </div>
      </div>

      <!-- Refresh button -->
      <Button
        v-if="featureDef && hasAccess(featureDef) && !store.loading"
        icon="pi pi-refresh"
        severity="secondary"
        text
        rounded
        size="small"
        v-tooltip.left="'Re-run analysis'"
        @click="refresh"
      />
    </div>

    <!-- Unknown feature -->
    <Message v-if="!featureDef" severity="error">
      Unknown AI feature: {{ featureKey }}
    </Message>

    <!-- Access blocked (shouldn't normally appear — gate() handles via modal) -->
    <template v-else-if="featureDef && !hasAccess(featureDef)">
      <div class="text-center py-16 space-y-4">
        <div class="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
          <i class="pi pi-lock text-2xl text-amber-500"></i>
        </div>
        <p class="text-gray-600">
          <span class="font-semibold">{{ featureDef.label }}</span> requires the
          <span class="font-semibold text-amber-600">{{ requiredTierLabel(featureDef) }}</span> plan.
        </p>
      </div>
    </template>

    <!-- Loading -->
    <template v-else-if="store.loading">
      <div class="flex flex-col items-center justify-center py-20 gap-4 text-gray-500">
        <ProgressSpinner style="width:42px; height:42px" strokeWidth="4" />
        <p class="text-sm animate-pulse">Generating AI analysis…</p>
      </div>
    </template>

    <!-- Error -->
    <Message v-else-if="store.error" severity="error" :closable="false">
      {{ store.error }}
    </Message>

    <!-- Result -->
    <NarrationCard v-else-if="store.narration" :narration="store.narration" />

    <!-- Empty / initial state -->
    <div v-else-if="featureDef && hasAccess(featureDef)" class="text-center py-20 text-gray-400">
      <i class="pi pi-sparkles text-4xl mb-4 block"></i>
      <p class="text-sm">Ready to analyse. Click refresh to start.</p>
    </div>

  </div>
</template>
