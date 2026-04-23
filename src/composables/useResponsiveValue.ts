import { computed, type ComputedRef } from 'vue'
import { useUiStore } from '@/stores/ui'

interface ResponsiveSpec<T> {
  mobile?:  T
  tablet?:  T
  desktop?: T
  /** Required fallback used when device-specific value is undefined */
  default:  T
}

/**
 * Returns a computed ref that resolves to the appropriate value for the current device.
 *
 * Usage:
 *   const chartHeight = useResponsiveValue({ mobile: '220px', tablet: '280px', default: '320px' })
 *   const dialogWidth = useResponsiveValue({ mobile: 'calc(100vw - 40px)', tablet: '85vw', default: '600px' })
 */
export function useResponsiveValue<T>(spec: ResponsiveSpec<T>): ComputedRef<T> {
  const ui = useUiStore()
  return computed<T>(() => {
    if (ui.isMobile  && spec.mobile  !== undefined) return spec.mobile
    if (ui.isTablet  && spec.tablet  !== undefined) return spec.tablet
    if (ui.isDesktop && spec.desktop !== undefined) return spec.desktop
    return spec.default
  })
}
