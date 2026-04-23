import { computed } from 'vue'
import { useUiStore } from '@/stores/ui'

/**
 * Reactive breakpoint state composable.
 * Wraps ui store for use outside components (other composables, service layers).
 */
export function useBreakpoint() {
  const ui = useUiStore()
  return {
    isMobile:  computed(() => ui.isMobile),
    isTablet:  computed(() => ui.isTablet),
    isDesktop: computed(() => ui.isDesktop),
    canEdit:   computed(() => ui.canEdit),
    /** true from tablet and up */
    isTabletUp: computed(() => !ui.isMobile),
  }
}
