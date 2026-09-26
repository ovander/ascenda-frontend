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
 *
 * v2 behaviour:
 *   When feature === 'narrate', the view fetches ScenarioAnalysis v2 in parallel
 *   with the existing AI narration call. ScenarioAnalysisCard renders as the
 *   primary surface. NarrationCard renders below as supplementary AI commentary
 *   (prose output from the narrate endpoint).
 *   All other features continue to use NarrationCard unchanged.
 */
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAIStore } from '@/features/ai/stores/aiStore'
import { useTierGate } from '@/composables/useTierGate'
import { useScenarioAnalysis } from '@/features/scenarios/composables/useScenarioAnalysis'
import { AI_FEATURES } from '@/features/ai/types'
import type { AIFeatureDef } from '@/features/ai/types'
import NarrationCard from '@/features/ai/components/NarrationCard.vue'
import ScenarioAnalysisCard from '@/features/ai/components/ScenarioAnalysisCard.vue'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import Message from 'primevue/message'

const props = defineProps<{ planId?: string; sid?: string }>()

const route = useRoute()
const { t } = useI18n()
const store = useAIStore()
const { isFreemium, isPro, isEnterprise, gate } = useTierGate()

// ── v2 analysis (only used when feature === 'narrate') ─────────────────────────
const scenarioAnalysis = useScenarioAnalysis()

// ── Feature config ─────────────────────────────────────────────────────────────
const featureKey = computed(() => route.params.feature as string)

const featureDef = computed<AIFeatureDef | undefined>(() =>
  AI_FEATURES.find((f) => f.key === featureKey.value),
)

// Whether this view should show the v2 ScenarioAnalysisCard as primary surface.
const isV2Feature = computed(() => featureKey.value === 'narrate')

// ── Tier access check ──────────────────────────────────────────────────────────
// Freemium has no AI access at all. Paid tiers gate by feature tier.
function hasAccess(def: AIFeatureDef): boolean {
  if (isFreemium.value) return false
  if (def.tier === 'standard') return true
  if (def.tier === 'pro') return isPro.value
  if (def.tier === 'enterprise') return isEnterprise.value
  return false
}

function requiredTierLabel(def: AIFeatureDef): string {
  if (isFreemium.value) return t('enums.tier.pro')
  return def.tier === 'enterprise' ? t('enums.tier.enterprise') : t('enums.tier.pro')
}

// ── Combined loading state ─────────────────────────────────────────────────────
// For the 'narrate' feature we show loading while EITHER request is pending.
const isLoading = computed(() =>
  store.loading || (isV2Feature.value && scenarioAnalysis.loading.value),
)

// ── Core fetch logic (shared by initial load, feature-switch, and refresh) ─────
async function runFeature(def: typeof featureDef.value) {
  if (!def) return

  // Freemium: all AI features require an upgrade to Pro.
  if (isFreemium.value && !gate('pro', 'AI Features')) return
  if (def.tier === 'pro' && !gate('pro', def.label)) return
  if (def.tier === 'enterprise' && !gate('enterprise', def.label)) return

  store.reset()
  scenarioAnalysis.reset()

  if (isV2Feature.value && props.planId && props.sid) {
    // Fetch both endpoints in parallel — neither blocks the other.
    await Promise.allSettled([
      store.fetchNarration(def.endpoint, { narration_type: def.narration_type }),
      scenarioAnalysis.fetch(props.planId, props.sid),
    ])
  } else {
    await store.fetchNarration(def.endpoint, { narration_type: def.narration_type })
  }
}

// ── Lifecycle ──────────────────────────────────────────────────────────────────

// Initial load
onMounted(() => runFeature(featureDef.value))

/**
 * Re-fetch when the user switches AI features via the sidebar.
 * Vue Router reuses the same AINarrationView instance for all /ai/:feature routes,
 * so onMounted only fires once. This watcher handles every subsequent navigation.
 */
watch(featureKey, () => runFeature(featureDef.value))

async function refresh() {
  await runFeature(featureDef.value)
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-6">

    <!-- Feature header -->
    <div v-if="featureDef" class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-50">
          <i :class="[featureDef.icon, 'text-primary-600 text-lg']"></i>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-bold text-gray-900">{{ t(featureDef.labelKey) }}</h1>
            <!-- Tier badge -->
            <span
              v-if="featureDef.tier === 'pro'"
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"
            >
              {{ t('ai.tierBadge.pro') }}
            </span>
            <span
              v-else-if="featureDef.tier === 'enterprise'"
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700"
            >
              {{ t('ai.tierBadge.enterprise') }}
            </span>
            <!-- v2 badge on narrate -->
            <span
              v-if="isV2Feature"
              class="inline-flex items-center px-1.5 py-0 rounded-sm text-[9px] font-bold uppercase tracking-wide bg-primary-50 text-primary-600 border border-primary-200"
            >
              v2
            </span>
          </div>
          <p class="text-sm text-gray-500 mt-0.5">{{ t(featureDef.descriptionKey) }}</p>
        </div>
      </div>

      <!-- Refresh button -->
      <Button
        v-if="featureDef && hasAccess(featureDef) && !isLoading"
        icon="pi pi-refresh"
        severity="secondary"
        text
        rounded
        size="small"
        v-tooltip.left="t('ai.rerunAnalysis')"
        @click="refresh"
      />
    </div>

    <!-- Unknown feature -->
    <Message v-if="!featureDef" severity="error">
      {{ t('ai.unknownFeature') }}: {{ featureKey }}
    </Message>

    <!-- Access blocked (gate() handles via modal; this is a safety fallback) -->
    <template v-else-if="featureDef && !hasAccess(featureDef)">
      <div class="text-center py-16 space-y-4">
        <div class="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
          <i class="pi pi-lock text-2xl text-amber-500"></i>
        </div>
        <p class="text-gray-600">
          {{ t('ai.requiresPlan', { feature: t(featureDef.labelKey), tier: requiredTierLabel(featureDef) }) }}
        </p>
      </div>
    </template>

    <!-- Loading -->
    <template v-else-if="isLoading">
      <div class="flex flex-col items-center justify-center py-20 gap-4 text-gray-500">
        <ProgressSpinner style="width:42px; height:42px" strokeWidth="4" />
        <p class="text-sm animate-pulse">
          {{ isV2Feature ? t('ai.runningScenarioAnalysis') : t('ai.generatingAnalysis') }}
        </p>
      </div>
    </template>

    <!-- Error — only if BOTH endpoints failed -->
    <Message
      v-else-if="store.error && (!isV2Feature || !scenarioAnalysis.analysis.value)"
      severity="error"
      :closable="false"
    >
      {{ store.error }}
    </Message>

    <!-- ── v2 feature: ScenarioAnalysisCard (primary) + NarrationCard (supplementary) ── -->
    <template v-else-if="isV2Feature">

      <!-- v2 analysis — primary surface -->
      <ScenarioAnalysisCard
        v-if="scenarioAnalysis.analysis.value"
        :analysis="scenarioAnalysis.analysis.value"
      />

      <!-- v2 analysis failed but narration succeeded: fall back gracefully -->
      <Message
        v-else-if="scenarioAnalysis.error.value && !store.narration"
        severity="warn"
        :closable="false"
        class="text-sm"
      >
        {{ t('ai.intelligenceUnavailable') }}
      </Message>

      <!-- Existing narration as supplementary "AI Commentary" section -->
      <div v-if="store.narration" :class="scenarioAnalysis.analysis.value ? 'border-t border-gray-100 pt-6' : ''">
        <p
          v-if="scenarioAnalysis.analysis.value"
          class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4"
        >
          {{ t('ai.aiCommentarySectionLabel') }}
        </p>
        <NarrationCard :narration="store.narration" />
      </div>

      <!-- Empty state: neither endpoint returned data -->
      <div
        v-else-if="!scenarioAnalysis.analysis.value"
        class="text-center py-20 text-gray-400"
      >
        <i class="pi pi-sparkles text-4xl mb-4 block"></i>
        <p class="text-sm">{{ t('ai.readyToAnalyse') }}</p>
      </div>
    </template>

    <!-- ── All other features: existing NarrationCard unchanged ─────────────── -->
    <template v-else>
      <!-- Result -->
      <NarrationCard v-if="store.narration" :narration="store.narration" />

      <!-- Empty / initial state -->
      <div v-else-if="featureDef && hasAccess(featureDef)" class="text-center py-20 text-gray-400">
        <i class="pi pi-sparkles text-4xl mb-4 block"></i>
        <p class="text-sm">{{ t('ai.readyToAnalyse') }}</p>
      </div>
    </template>

  </div>
</template>
