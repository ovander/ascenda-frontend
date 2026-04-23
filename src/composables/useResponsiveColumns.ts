import { computed, type ComputedRef } from 'vue'
import { useUiStore } from '@/stores/ui'

type HideAt = 'mobile' | 'tablet'

export interface ResponsiveColumn {
  field:    string
  header:   string
  /** Hide this column at the given breakpoint and below */
  hide?:    HideAt
  frozen?:  boolean
  sortable?: boolean
  style?:   string
  [key: string]: unknown
}

/**
 * Filters a column definition array based on the current device.
 *
 * hide: 'mobile'  → hidden only on mobile
 * hide: 'tablet'  → hidden on mobile AND tablet (desktop only)
 *
 * Usage:
 *   const cols = useResponsiveColumns([
 *     { field: 'name',        header: 'Name' },
 *     { field: 'description', header: 'Description', hide: 'tablet' },
 *     { field: 'status',      header: 'Status' },
 *     { field: 'updatedAt',   header: 'Last Updated', hide: 'tablet' },
 *   ])
 */
export function useResponsiveColumns<T extends ResponsiveColumn>(
  cols: T[],
): ComputedRef<T[]> {
  const ui = useUiStore()
  return computed(() =>
    cols.filter(c => {
      if (c.hide === 'mobile' && ui.isMobile)  return false
      if (c.hide === 'tablet' && !ui.isDesktop) return false   // hide on mobile + tablet
      return true
    }),
  )
}
