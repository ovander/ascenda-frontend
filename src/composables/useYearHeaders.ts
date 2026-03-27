import { computed } from 'vue'
import { useSettingsStore } from '@/features/settings/stores/settingsStore'

export function useYearHeaders() {
  const settings = useSettingsStore()

  const yearHeaders = computed<string[]>(() => {
    // configComputed.yearHeaders comes from the backend as number[] (Go [5]int)
    const computed = settings.configComputed?.yearHeaders
    if (computed?.length) {
      const first = Number(computed[0])
      // Sanity-check: backend zero-time yields year 1; skip it
      if (first >= 2000) {
        return computed.map(String)
      }
    }
    // Fallback: generate from forecastStart
    const config = settings.config
    if (config?.forecastStart) {
      const startYear = new Date(config.forecastStart).getFullYear()
      if (startYear >= 2000) {
        return Array.from({ length: 5 }, (_, i) => String(startYear + i))
      }
    }
    return ['Y1', 'Y2', 'Y3', 'Y4', 'Y5']
  })

  const monthHeaders = computed<string[]>(() => {
    const config = settings.config
    const locale = config?.language === 'en' ? 'en-US' : 'fr-FR'
    return Array.from({ length: 12 }, (_, i) => {
      const date = new Date(2025, i, 1)
      return date.toLocaleDateString(locale, { month: 'short' })
    })
  })

  return { yearHeaders, monthHeaders }
}
