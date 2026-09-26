<script setup lang="ts">
/**
 * KSaveBanner — Inline save-state indicator for financial module views.
 *
 * Accepts a `moduleKey` string that corresponds to the key used in
 * `useDirtyState(moduleKey)`. Automatically reads the current state
 * from the global registry so the banner stays in sync with the store.
 *
 * Usage:
 *   <KSaveBanner module-key="staff" />
 *
 * Rendered states:
 *   dirty   → orange dot + "Unsaved changes"
 *   saving  → spinner + "Saving…"
 *   error   → red dot + error message + Retry hint
 *   clean   → green check + "All changes saved" (auto-fades after 3 s)
 */
import { computed, watch, ref } from 'vue'
import { useDirtyState } from '@/composables/useDirtyState'

const props = defineProps<{
  moduleKey: string
  /** When true, the banner is hidden while the module data is still loading */
  loading?: boolean
}>()

const dirty = useDirtyState(props.moduleKey)

// Auto-fade the "All changes saved" message after 3 seconds
const showClean = ref(false)
let fadeTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => dirty.state.value,
  (newState) => {
    if (fadeTimer) clearTimeout(fadeTimer)
    if (newState === 'clean') {
      showClean.value = true
      fadeTimer = setTimeout(() => {
        showClean.value = false
      }, 3000)
    } else {
      showClean.value = false
    }
  },
  { immediate: true }
)

const visible = computed(() => {
  if (props.loading) return false
  const s = dirty.state.value
  return s === 'dirty' || s === 'saving' || s === 'error' || showClean.value
})
</script>

<template>
  <Transition name="k-save-banner">
    <div
      v-if="visible"
      class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium select-none"
      :class="{
        'bg-amber-50 text-amber-700 border border-amber-200':   dirty.state.value === 'dirty',
        'bg-blue-50  text-blue-600  border border-blue-200':    dirty.state.value === 'saving',
        'bg-red-50   text-red-600   border border-red-200':     dirty.state.value === 'error',
        'bg-green-50 text-green-700 border border-green-200':   showClean,
      }"
    >
      <!-- Saving: spinner -->
      <svg
        v-if="dirty.state.value === 'saving'"
        class="animate-spin h-3.5 w-3.5 text-blue-500 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>

      <!-- Clean: check -->
      <i v-else-if="showClean" class="pi pi-check-circle text-green-600 text-sm shrink-0" />

      <!-- Error: X -->
      <i v-else-if="dirty.state.value === 'error'" class="pi pi-exclamation-circle text-red-500 text-sm shrink-0" />

      <!-- Dirty: dot -->
      <span
        v-else
        class="w-2 h-2 rounded-full bg-amber-400 shrink-0"
      />

      <!-- Label -->
      <span v-if="dirty.state.value === 'saving'">Saving…</span>
      <span v-else-if="showClean">All changes saved</span>
      <span v-else-if="dirty.state.value === 'error'">
        {{ dirty.errorMessage.value || 'Changes not saved — please retry.' }}
      </span>
      <span v-else>Unsaved changes</span>
    </div>
  </Transition>
</template>

<style scoped>
.k-save-banner-enter-active,
.k-save-banner-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.k-save-banner-enter-from,
.k-save-banner-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
