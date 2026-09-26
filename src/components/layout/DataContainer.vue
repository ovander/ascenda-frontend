<template>
  <div class="relative">
    <!-- Scroll hint: gradient + arrow visible on tablet when content overflows right -->
    <Transition name="fade-hint">
      <div
        v-if="showScrollHint"
        class="absolute right-0 top-0 bottom-0 w-10 bg-linear-to-l from-white via-white/70 to-transparent pointer-events-none z-10 flex items-center justify-end pr-1"
      >
        <i class="pi pi-chevron-right text-gray-400 text-xs" />
      </div>
    </Transition>

    <!-- Negative horizontal margin pulls content flush with page edges, then re-adds padding -->
    <div
      ref="containerRef"
      class="overflow-x-auto -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 pb-1"
      @scroll="onScroll"
    >
      <div :style="minWidth ? `min-width: ${minWidth}` : undefined">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

defineProps<{
  /** Minimum inner width before scroll kicks in (e.g. '640px', '900px') */
  minWidth?: string
}>()

const containerRef = ref<HTMLElement>()
const showScrollHint = ref(false)

function check() {
  if (!containerRef.value) return
  const { scrollLeft, scrollWidth, clientWidth } = containerRef.value
  showScrollHint.value = scrollWidth > clientWidth + 2 && scrollLeft < scrollWidth - clientWidth - 8
}

function onScroll() { check() }

// Re-check on resize
const ro = typeof ResizeObserver !== 'undefined'
  ? new ResizeObserver(check)
  : null

onMounted(() => {
  check()
  if (containerRef.value && ro) ro.observe(containerRef.value)
})

onUnmounted(() => ro?.disconnect())
</script>

<style scoped>
.fade-hint-enter-active, .fade-hint-leave-active { transition: opacity 0.2s ease }
.fade-hint-enter-from, .fade-hint-leave-to { opacity: 0 }
</style>
