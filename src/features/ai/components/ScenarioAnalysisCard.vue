<script setup lang="ts">
/**
 * ScenarioAnalysisCard — full renderer for ScenarioAnalysis v2 data.
 *
 * Used in AINarrationView when the feature is 'narrate' and v2 analysis data
 * is available. Replaces the NarrationCard raw-JSON structured_data block
 * with properly typed, styled sections.
 *
 * Renders in order:
 *   1. Viability score + rationale
 *   2. Highlights (headline + strengths / weaknesses)
 *   3. Risks (full list, sorted by urgency priority)
 *   4. Drivers (root causes, sorted by priority)
 *   5. Trend insights
 *   6. AI narration text (if present)
 *
 * Mobile safe: no tables, no overflow-x, all card-based layout.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Tag from 'primevue/tag'
import type {
  ScenarioAnalysisResult,
  ViabilityScore,
  AnalysisRisk,
  AnalysisDriver,
  RiskUrgency,
  DriverImpact,
  TrendDirection,
} from '@/features/scenarios/types'

const props = defineProps<{
  analysis: ScenarioAnalysisResult
  mode?: 'full' | 'compact' | 'embedded'
}>()

const { t, locale } = useI18n()

// Default to 'full' mode
const mode = computed(() => props.mode ?? 'full')

// ── Enum helpers ───────────────────────────────────────────────────────────────

// Map backend ViabilityLabel ('Strong', 'Viable', 'At Risk', 'Critical') to locale keys.
const VIABILITY_KEY: Record<string, string> = {
  'Strong': 'strong', 'Viable': 'viable', 'At Risk': 'atRisk', 'Critical': 'critical',
}
function tViability(label: string | undefined): string {
  if (!label) return ''
  const key = VIABILITY_KEY[label] ?? label.toLowerCase().replace(/ /g, '_')
  return t(`enums.viability.${key}`)
}

function tUrgency(urgency: string | undefined): string {
  if (!urgency) return ''
  return t(`enums.risk.urgency.${urgency.toLowerCase()}`)
}

// ── Sort helpers ───────────────────────────────────────────────────────────────

const URGENCY_RANK: Record<string, number> = {
  critical: 0,
  high:     1,
  medium:   2,
  low:      3,
}

function urgencyRank(u: string | undefined): number {
  return URGENCY_RANK[(u ?? '').toLowerCase()] ?? 99
}

const sortedRisks = computed<AnalysisRisk[]>(() =>
  [...(props.analysis.risks ?? [])].sort(
    (a, b) => urgencyRank(a.urgency) - urgencyRank(b.urgency),
  ),
)

const sortedDrivers = computed<AnalysisDriver[]>(() =>
  [...(props.analysis.drivers ?? [])].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0)),
)

// ── Visual helpers ─────────────────────────────────────────────────────────────

function scoreClasses(v: ViabilityScore | undefined) {
  const score = v?.score ?? 0
  if (score >= 80) return { outer: 'bg-green-50 border-green-200',  score: 'text-green-700', label: 'text-green-600' }
  if (score >= 60) return { outer: 'bg-blue-50 border-blue-200',    score: 'text-blue-700',  label: 'text-blue-600' }
  if (score >= 40) return { outer: 'bg-amber-50 border-amber-200',  score: 'text-amber-700', label: 'text-amber-600' }
  return               { outer: 'bg-red-50 border-red-200',      score: 'text-red-700',   label: 'text-red-600' }
}

const RISK_CLASSES: Record<string, { strip: string; bg: string; text: string; badge: string }> = {
  critical: { strip: 'border-l-red-500',    bg: 'bg-red-50',    text: 'text-red-800',    badge: 'bg-red-100 text-red-700 border-red-200' },
  high:     { strip: 'border-l-orange-500', bg: 'bg-orange-50', text: 'text-orange-800', badge: 'bg-orange-100 text-orange-700 border-orange-200' },
  medium:   { strip: 'border-l-amber-500',  bg: 'bg-amber-50',  text: 'text-amber-800',  badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  low:      { strip: 'border-l-gray-300',   bg: 'bg-gray-50',   text: 'text-gray-700',   badge: 'bg-gray-100 text-gray-600 border-gray-200' },
}
function riskClasses(urgency: RiskUrgency | string | undefined) {
  const key = (urgency ?? '').toLowerCase()
  return RISK_CLASSES[key] ?? RISK_CLASSES.low
}

const DRIVER_CLASSES: Record<string, { icon: string; color: string; bg: string }> = {
  positive: { icon: 'pi pi-arrow-up',    color: 'text-green-500',  bg: 'bg-green-50 border-green-200' },
  negative: { icon: 'pi pi-arrow-down',  color: 'text-red-500',    bg: 'bg-red-50 border-red-200' },
  neutral:  { icon: 'pi pi-minus',       color: 'text-gray-400',   bg: 'bg-gray-50 border-gray-200' },
}
function driverClasses(impact: DriverImpact | string | undefined) {
  const key = (impact ?? '').toLowerCase()
  return DRIVER_CLASSES[key] ?? DRIVER_CLASSES.neutral
}

const TREND_CLASSES: Record<string, { icon: string; color: string }> = {
  up:   { icon: 'pi pi-trending-up',   color: 'text-green-500' },
  down: { icon: 'pi pi-trending-down', color: 'text-red-500' },
  flat: { icon: 'pi pi-minus',         color: 'text-gray-400' },
}
function trendClasses(direction: TrendDirection | string | undefined) {
  const key = (direction ?? '').toLowerCase()
  return TREND_CLASSES[key] ?? TREND_CLASSES.flat
}

const SECTION_LABEL = 'text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3'
</script>

<template>
  <div class="space-y-6">

    <!-- ── 1. Viability Score ────────────────────────────────────────────────── -->
    <div
      :class="[
        'flex items-start gap-4 rounded-xl p-4 border-2',
        scoreClasses(analysis.viability).outer,
      ]"
    >
      <!-- Big score circle -->
      <div
        :class="[
          'shrink-0 flex flex-col items-center justify-center w-20 h-20 rounded-2xl border-2',
          scoreClasses(analysis.viability).outer,
        ]"
      >
        <span :class="['text-3xl font-black leading-none', scoreClasses(analysis.viability).score]">
          {{ analysis.viability?.score ?? '—' }}
        </span>
        <span :class="['text-[10px] font-bold uppercase tracking-wide mt-0.5', scoreClasses(analysis.viability).label]">
          {{ tViability(analysis.viability?.label) }}
        </span>
      </div>
      <!-- Rationale -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-base font-bold text-gray-800">{{ t('ai.viabilityScore') }}</span>
          <Tag
            v-if="analysis.narration?.is_ai_generated"
            value="AI"
            severity="info"
            class="text-[10px] font-semibold shrink-0"
          />
        </div>
        <p class="text-sm text-gray-600 leading-relaxed">{{ analysis.viability?.rationale }}</p>
      </div>
    </div>

    <!-- ── 2. Highlights ─────────────────────────────────────────────────────── -->
    <div
      v-if="mode !== 'compact' && (analysis.highlights?.headline || analysis.highlights?.strengths?.length || analysis.highlights?.weaknesses?.length)"
      class="space-y-3"
    >
      <p :class="SECTION_LABEL">{{ t('ai.highlights') }}</p>

      <!-- Headline -->
      <p v-if="analysis.highlights?.headline" class="text-base font-semibold text-gray-800 leading-snug">
        {{ analysis.highlights.headline }}
      </p>

      <!-- Strengths / Weaknesses — 2-column on tablet+, stacked on mobile -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">

        <!-- Strengths -->
        <div v-if="analysis.highlights?.strengths?.length" class="rounded-lg bg-green-50 border border-green-200 p-3">
          <p class="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1.5">
            <i class="pi pi-thumbs-up text-green-500 text-[11px]"></i>
            {{ t('ai.strengths') }}
          </p>
          <ul class="space-y-1.5">
            <li
              v-for="(s, i) in analysis.highlights.strengths"
              :key="i"
              class="flex items-start gap-1.5 text-xs text-green-800"
            >
              <i class="pi pi-check shrink-0 mt-0.5 text-green-500 text-[10px]"></i>
              {{ s }}
            </li>
          </ul>
        </div>

        <!-- Weaknesses -->
        <div v-if="analysis.highlights?.weaknesses?.length" class="rounded-lg bg-red-50 border border-red-200 p-3">
          <p class="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1.5">
            <i class="pi pi-thumbs-down text-red-500 text-[11px]"></i>
            {{ t('ai.weaknesses') }}
          </p>
          <ul class="space-y-1.5">
            <li
              v-for="(w, i) in analysis.highlights.weaknesses"
              :key="i"
              class="flex items-start gap-1.5 text-xs text-red-800"
            >
              <i class="pi pi-times shrink-0 mt-0.5 text-red-400 text-[10px]"></i>
              {{ w }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- ── 3. Risks ──────────────────────────────────────────────────────────── -->
    <div v-if="sortedRisks.length" data-testid="risks-section" class="space-y-3">
      <p :class="SECTION_LABEL">{{ t('ai.risks') }}</p>
      <div class="space-y-2">
        <div
          v-for="(risk, i) in mode === 'compact' ? sortedRisks.slice(0, 2) : sortedRisks"
          :key="i"
          :class="[
            'rounded-r-lg border-l-4 px-4 py-3',
            riskClasses(risk.urgency).strip,
            riskClasses(risk.urgency).bg,
          ]"
        >
          <div class="flex items-start gap-2">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span :class="['text-sm font-semibold', riskClasses(risk.urgency).text]">
                  {{ risk.title }}
                </span>
                <!-- Urgency badge -->
                <span
                  :class="[
                    'inline-flex items-center px-1.5 py-0 rounded-sm border text-[9px] font-bold uppercase tracking-wide',
                    riskClasses(risk.urgency).badge,
                  ]"
                >
                  {{ tUrgency(risk.urgency) }}
                </span>
                <!-- Category -->
                <span
                  v-if="risk.category"
                  class="inline-flex items-center px-1.5 py-0 rounded-sm border text-[9px] font-medium text-gray-500 bg-white border-gray-200"
                >
                  {{ risk.category }}
                </span>
              </div>
              <p :class="['text-xs mt-1 leading-relaxed', riskClasses(risk.urgency).text, 'opacity-80']">
                {{ risk.description }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 4. Drivers ────────────────────────────────────────────────────────── -->
    <div v-if="mode === 'full' && sortedDrivers.length" data-testid="drivers-section" class="space-y-3">
      <p :class="SECTION_LABEL">{{ t('ai.rootCauses') }}</p>
      <div class="space-y-2">
        <div
          v-for="(driver, i) in sortedDrivers"
          :key="i"
          :class="['flex items-start gap-3 rounded-lg border p-3', driverClasses(driver.impact).bg]"
        >
          <!-- Impact arrow -->
          <div class="shrink-0 mt-0.5">
            <i :class="[driverClasses(driver.impact).icon, driverClasses(driver.impact).color, 'text-sm']"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-gray-800">{{ driver.title }}</span>
              <span class="text-[9px] font-medium text-gray-400 bg-gray-100 border border-gray-200 rounded-sm px-1.5">
                #{{ driver.priority }}
              </span>
            </div>
            <p class="text-xs text-gray-600 mt-0.5 leading-relaxed">{{ driver.description }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 5. Trend Insights ─────────────────────────────────────────────────── -->
    <div v-if="mode === 'full' && analysis.trends?.length" data-testid="trends-section" class="space-y-3">
      <p :class="SECTION_LABEL">{{ t('ai.trendInsights') }}</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div
          v-for="(trend, i) in analysis.trends"
          :key="i"
          class="flex items-start gap-2.5 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5"
        >
          <i :class="[trendClasses(trend.direction).icon, trendClasses(trend.direction).color, 'shrink-0 mt-0.5 text-sm']"></i>
          <div class="min-w-0">
            <p class="text-xs font-semibold text-gray-700">{{ trend.metric }}</p>
            <p class="text-xs text-gray-500 mt-0.5 leading-relaxed">{{ trend.description }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 6. AI Narration ───────────────────────────────────────────────────── -->
    <div
      v-if="mode === 'full' && analysis.narration?.text"
      class="rounded-xl bg-primary-50 border border-primary-200 p-4"
    >
      <p class="text-xs font-semibold text-primary-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <i class="pi pi-sparkles text-primary-500 text-[11px]"></i>
        {{ t('ai.aiCommentary') }}
        <span
          v-if="!analysis.narration.is_ai_generated"
          class="font-normal normal-case tracking-normal text-primary-400"
        >{{ t('ai.fallback') }}</span>
      </p>
      <p class="text-sm text-primary-900 leading-relaxed whitespace-pre-line">
        {{ analysis.narration.text }}
      </p>
    </div>

    <!-- Generated timestamp -->
    <p v-if="mode === 'full' && analysis.generated_at" class="text-[10px] text-gray-400 text-right">
      {{ t('ai.analysisGenerated') }} {{ new Date(analysis.generated_at).toLocaleString(locale) }}
    </p>

    <!-- View full analysis link (embedded mode) -->
    <div v-if="mode === 'embedded'" class="mt-2">
      <router-link
        :to="{ name: 'ai-narration', params: { feature: 'narrate' } }"
        class="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
      >
        {{ t('ai.viewFullAnalysis') }} <i class="pi pi-arrow-right text-[10px]"></i>
      </router-link>
    </div>

  </div>
</template>
