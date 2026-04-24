<script setup lang="ts">
/**
 * ScenarioIntelligenceSection — Scenario Dashboard surface for ScenarioAnalysis v2.
 *
 * Placement: between KPI cards and the Module grid in ScenarioDashboardView.
 *
 * Tier behaviour:
 *   Freemium  → score badge only; strengths/risks blurred; UpgradeModal on click
 *   Pro+      → full display (score, headline, top strengths, top risks, CTA)
 *
 * Device layout (via ShowOn + isMobile):
 *   Mobile    → score badge + headline + CTA button only
 *   Tablet/Desktop → score + headline + 2 strengths + 3 risks + CTA
 *
 * Loading: skeleton while `loading` prop is true.
 * Error: silent — section simply does not render when analysis is null after load.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTierGate } from '@/composables/useTierGate'
import ShowOn from '@/components/common/ShowOn.vue'
import ProBadge from '@/components/common/ProBadge.vue'
import Button from 'primevue/button'
import type {
  ScenarioAnalysisResult,
  ViabilityScore,
  RiskUrgency,
} from '@/features/scenarios/types'

// ── Props & emits ──────────────────────────────────────────────────────────────

const props = defineProps<{
  analysis:  ScenarioAnalysisResult | null
  loading:   boolean
  /** Used by the "View Full Analysis" CTA to navigate to /ai/narrate. */
  basePath:  string
}>()

const emit = defineEmits<{
  (e: 'refresh'): void
}>()

// ── Stores & composables ───────────────────────────────────────────────────────

const { t, locale } = useI18n()
const { isFreemium, isPro, showUpgradeModal } = useTierGate()

// ── Enum helpers ───────────────────────────────────────────────────────────────
const VIABILITY_KEY: Record<string, string> = {
  'Strong': 'strong', 'Viable': 'viable', 'At Risk': 'atRisk', 'Critical': 'critical',
}
function tViability(label: string | undefined): string {
  if (!label) return ''
  const key = VIABILITY_KEY[label] ?? label.toLowerCase().replace(/ /g, '_')
  return t(`enums.viability.${key}`)
}

// ── Derived state ──────────────────────────────────────────────────────────────

/** Pro or Enterprise users see the full section. */
const hasFullAccess = computed(() => isPro.value)

/** Slice data for the compact dashboard surface. */
const topStrengths = computed(() => props.analysis?.highlights?.strengths?.slice(0, 2) ?? [])
const topRisks     = computed(() => props.analysis?.risks?.slice(0, 3) ?? [])

// ── Visual helpers ─────────────────────────────────────────────────────────────

function scoreClasses(v: ViabilityScore | undefined): {
  bg: string; border: string; text: string; ring: string
} {
  const score = v?.score ?? 0
  if (score >= 80) return { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  ring: 'ring-green-400' }
  if (score >= 60) return { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   ring: 'ring-blue-400' }
  if (score >= 40) return { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  ring: 'ring-amber-400' }
  return               { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    ring: 'ring-red-400' }
}

function riskClasses(urgency: RiskUrgency | string | undefined): { dot: string; bg: string; text: string; border: string } {
  const map: Record<string, { dot: string; bg: string; text: string; border: string }> = {
    critical: { dot: 'bg-red-500',    bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200' },
    high:     { dot: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    medium:   { dot: 'bg-amber-500',  bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
    low:      { dot: 'bg-gray-400',   bg: 'bg-gray-50',   text: 'text-gray-600',   border: 'border-gray-200' },
  }
  // Normalise: backend may send "HIGH", "MEDIUM" etc. — fall back to low.
  const key = (urgency ?? '').toLowerCase()
  return map[key] ?? map.low
}

// ── Freemium interaction ───────────────────────────────────────────────────────

function handleLockedClick() {
  showUpgradeModal('Scenario Intelligence', 'pro')
}
</script>

<template>
  <!-- ── Nothing to show ──────────────────────────────────────────────────────── -->
  <template v-if="!loading && !analysis" />

  <!-- ── Skeleton ──────────────────────────────────────────────────────────────── -->
  <div v-else-if="loading" class="mb-4 md:mb-6">
    <div class="bg-white rounded-xl border border-gray-200 p-4 md:p-5 animate-pulse">
      <div class="flex items-center gap-3 mb-4">
        <!-- Score badge skeleton -->
        <div class="w-14 h-14 rounded-xl bg-gray-100 shrink-0" />
        <div class="flex-1 space-y-2">
          <div class="h-4 bg-gray-100 rounded w-1/3" />
          <div class="h-3 bg-gray-100 rounded w-2/3" />
        </div>
      </div>
      <!-- Detail rows — tablet/desktop only -->
      <ShowOn from="tablet">
        <div class="space-y-2">
          <div class="h-3 bg-gray-100 rounded w-full" />
          <div class="h-3 bg-gray-100 rounded w-4/5" />
          <div class="h-3 bg-gray-100 rounded w-3/4" />
        </div>
      </ShowOn>
    </div>
  </div>

  <!-- ── Content ───────────────────────────────────────────────────────────────── -->
  <div v-else-if="analysis" class="mb-4 md:mb-6">
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

      <!-- Section header -->
      <div class="flex items-center justify-between px-4 md:px-5 pt-4 pb-3 border-b border-gray-100">
        <div class="flex items-center gap-2">
          <i class="pi pi-sparkles text-primary-500 text-sm"></i>
          <span class="text-sm font-semibold text-gray-700">{{ t('ai.scenarioIntelligence') }}</span>
          <ProBadge v-if="isFreemium" size="xs" />
          <span
            v-else
            class="inline-flex items-center px-1.5 py-0 rounded text-[9px] font-bold uppercase tracking-wide bg-primary-50 text-primary-600 border border-primary-200"
          >
            v2
          </span>
        </div>
        <button
          v-if="hasFullAccess"
          class="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded"
          :title="t('ai.refreshAnalysis')"
          @click="emit('refresh')"
        >
          <i class="pi pi-refresh text-xs"></i>
        </button>
      </div>

      <!-- Body -->
      <div class="px-4 md:px-5 py-4">

        <!-- ── Score + headline row ────────────────────────────────────────────── -->
        <div class="flex items-start gap-3 md:gap-4">

          <!-- Viability score badge -->
          <div
            :class="[
              'shrink-0 flex flex-col items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-xl border-2 ring-1',
              scoreClasses(analysis.viability).bg,
              scoreClasses(analysis.viability).border,
              scoreClasses(analysis.viability).ring,
            ]"
          >
            <span :class="['text-xl md:text-2xl font-bold leading-none', scoreClasses(analysis.viability).text]">
              {{ analysis.viability?.score ?? '—' }}
            </span>
            <span :class="['text-[9px] font-semibold uppercase tracking-wide leading-none mt-0.5', scoreClasses(analysis.viability).text]">
              {{ tViability(analysis.viability?.label) }}
            </span>
          </div>

          <!-- Headline + rationale -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-800 leading-snug">
              {{ analysis.highlights?.headline ?? analysis.viability?.label }}
            </p>
            <!-- Rationale visible on tablet/desktop -->
            <ShowOn from="tablet">
              <p class="text-xs text-gray-500 mt-1 leading-relaxed">
                {{ analysis.viability?.rationale }}
              </p>
            </ShowOn>
          </div>
        </div>

        <!-- ── Freemium: locked overlay ─────────────────────────────────────────── -->
        <template v-if="isFreemium">
          <div
            class="relative mt-4 rounded-lg overflow-hidden cursor-pointer"
            @click="handleLockedClick"
          >
            <!-- Blurred preview -->
            <div class="blur-sm pointer-events-none select-none space-y-2 p-3">
              <div v-for="i in 3" :key="i" class="h-3 bg-gray-100 rounded" />
            </div>
            <!-- Lock overlay -->
            <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/60 backdrop-blur-[1px]">
              <i class="pi pi-lock text-amber-500 text-lg"></i>
              <span class="text-xs font-semibold text-amber-700">{{ t('ai.upgradeToUnlock') }}</span>
            </div>
          </div>
        </template>

        <!-- ── Pro/Enterprise: full content ────────────────────────────────────── -->
        <template v-else-if="hasFullAccess">

          <!-- Strengths — tablet/desktop only -->
          <ShowOn from="tablet">
            <div v-if="topStrengths.length" class="mt-4">
              <p class="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                {{ t('ai.strengths') }}
              </p>
              <ul class="space-y-1.5">
                <li
                  v-for="(s, i) in topStrengths"
                  :key="i"
                  class="flex items-start gap-2 text-xs text-gray-700"
                >
                  <i class="pi pi-check-circle text-green-500 shrink-0 mt-0.5 text-[11px]"></i>
                  {{ s }}
                </li>
              </ul>
            </div>
          </ShowOn>

          <!-- Top risks — tablet/desktop only -->
          <ShowOn from="tablet">
            <div v-if="topRisks.length" class="mt-4">
              <p class="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                {{ t('ai.topRisks') }}
              </p>
              <div class="space-y-1.5">
                <div
                  v-for="(risk, i) in topRisks"
                  :key="i"
                  :class="[
                    'flex items-start gap-2 rounded-lg px-3 py-2 border text-xs',
                    riskClasses(risk.urgency).bg,
                    riskClasses(risk.urgency).border,
                  ]"
                >
                  <span
                    :class="[
                      'shrink-0 mt-1 w-1.5 h-1.5 rounded-full',
                      riskClasses(risk.urgency).dot,
                    ]"
                  />
                  <div class="min-w-0">
                    <span :class="['font-semibold', riskClasses(risk.urgency).text]">
                      {{ risk.title }}
                    </span>
                    <span class="text-gray-600 ml-1">— {{ risk.description }}</span>
                  </div>
                </div>
              </div>
            </div>
          </ShowOn>

        </template>
      </div>

      <!-- ── Footer CTA ────────────────────────────────────────────────────────── -->
      <div class="px-4 md:px-5 pb-4 pt-2 flex items-center justify-between gap-2">
        <span
          v-if="analysis.generated_at"
          class="text-[10px] text-gray-400"
        >
          {{ t('ai.generated') }} {{ new Date(analysis.generated_at).toLocaleDateString(locale) }}
        </span>
        <ShowOn not="mobile">
          <div class="flex gap-2 ml-auto">
            <Button
              v-if="isFreemium"
              :label="t('ai.unlockFullAnalysis')"
              icon="pi pi-lock"
              size="small"
              severity="warn"
              outlined
              @click="handleLockedClick"
            />
            <Button
              v-else
              :label="t('ai.viewFullAnalysis')"
              icon="pi pi-arrow-right"
              iconPos="right"
              size="small"
              severity="secondary"
              outlined
              :as="'a'"
              :href="`${basePath}/ai/narrate`"
            />
          </div>
        </ShowOn>
      </div>

    </div>
  </div>
</template>
