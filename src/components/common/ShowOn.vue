<template>
  <template v-if="shouldShow">
    <slot />
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '@/stores/ui'

type Device = 'mobile' | 'tablet' | 'desktop'

/**
 * Conditionally renders slot content based on the current device breakpoint.
 *
 * Usage:
 *   <ShowOn only="desktop">...</ShowOn>     — renders only on desktop
 *   <ShowOn from="tablet">...</ShowOn>      — renders on tablet AND desktop
 *   <ShowOn not="mobile">...</ShowOn>       — renders on tablet + desktop
 */
const props = defineProps<{
  /** Show ONLY on this exact device */
  only?: Device
  /** Show FROM this device and up (inclusive) */
  from?: Device
  /** Show on all devices EXCEPT this one */
  not?: Device
}>()

const ui = useUiStore()

const shouldShow = computed(() => {
  if (props.only === 'mobile')  return ui.isMobile
  if (props.only === 'tablet')  return ui.isTablet
  if (props.only === 'desktop') return ui.isDesktop
  if (props.from === 'tablet')  return !ui.isMobile        // tablet + desktop
  if (props.from === 'desktop') return ui.isDesktop
  if (props.not  === 'mobile')  return !ui.isMobile
  if (props.not  === 'tablet')  return !ui.isTablet
  if (props.not  === 'desktop') return !ui.isDesktop
  return true
})
</script>
