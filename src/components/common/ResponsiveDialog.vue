<template>
  <Dialog
    v-bind="$attrs"
    :style="dialogStyle"
    :modal="true"
    :draggable="!ui.isMobile"
    :dismissable-mask="ui.isMobile"
  >
    <slot />
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
    <template v-if="$slots.header" #header>
      <slot name="header" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '@/stores/ui'
import Dialog from 'primevue/dialog'

/**
 * Responsive Dialog wrapper.
 * Replaces all raw <Dialog :style="{ width: 'Xpx' }"> usages.
 *
 * Width per device:
 *   mobile  → calc(100vw - 40px)
 *   tablet  → 85vw
 *   desktop → sm=480px | md=600px | lg=800px | xl=900px
 *
 * Usage:
 *   <ResponsiveDialog v-model:visible="open" header="Title" size="md">
 *     ...content...
 *     <template #footer>...</template>
 *   </ResponsiveDialog>
 */
const props = defineProps<{
  size?: 'sm' | 'md' | 'lg' | 'xl'
}>()

const ui = useUiStore()

const DESKTOP_WIDTHS: Record<string, string> = {
  sm: '480px',
  md: '600px',
  lg: '800px',
  xl: '900px',
}

const dialogStyle = computed(() => {
  if (ui.isMobile) return { width: 'calc(100vw - 40px)', maxHeight: '90vh' }
  if (ui.isTablet) return { width: '85vw',               maxHeight: '85vh' }
  return { width: DESKTOP_WIDTHS[props.size ?? 'md'],    maxHeight: '85vh' }
})
</script>
