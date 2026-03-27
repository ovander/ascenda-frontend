import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useYearHeaders } from './useYearHeaders'
import { useSettingsStore } from '@/features/settings/stores/settingsStore'

describe('useYearHeaders composable', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('yearHeaders', () => {
    it('should return default fallback when no config', () => {
      const { yearHeaders } = useYearHeaders()
      expect(yearHeaders.value).toEqual(['Y1', 'Y2', 'Y3', 'Y4', 'Y5'])
    })

    it('should return configComputed.yearHeaders when available', () => {
      const settings = useSettingsStore()
      settings.configComputed = {
        yearHeaders: ['2025', '2026', '2027', '2028', '2029'],
      } as any
      const { yearHeaders } = useYearHeaders()
      expect(yearHeaders.value).toEqual(['2025', '2026', '2027', '2028', '2029'])
    })

    it('should generate from forecastStart when no configComputed', () => {
      const settings = useSettingsStore()
      settings.config = { forecastStart: '2024-01-01' } as any
      const { yearHeaders } = useYearHeaders()
      expect(yearHeaders.value).toEqual(['2024', '2025', '2026', '2027', '2028'])
    })

    it('should prefer configComputed over forecastStart', () => {
      const settings = useSettingsStore()
      // yearHeaders from configComputed must be valid years (>= 2000) to pass the sanity check
      settings.configComputed = {
        yearHeaders: ['2025', '2026', '2027', '2028', '2029'],
      } as any
      settings.config = { forecastStart: '2020-01-01' } as any
      const { yearHeaders } = useYearHeaders()
      expect(yearHeaders.value).toEqual(['2025', '2026', '2027', '2028', '2029'])
    })

    it('should always return 5 elements from forecastStart', () => {
      const settings = useSettingsStore()
      settings.config = { forecastStart: '2030-06-15' } as any
      const { yearHeaders } = useYearHeaders()
      expect(yearHeaders.value).toHaveLength(5)
      expect(yearHeaders.value[0]).toBe('2030')
      expect(yearHeaders.value[4]).toBe('2034')
    })
  })

  describe('monthHeaders', () => {
    it('should return 12 months in French by default', () => {
      const { monthHeaders } = useYearHeaders()
      expect(monthHeaders.value).toHaveLength(12)
    })

    it('should return English months when language is en', () => {
      const settings = useSettingsStore()
      settings.config = { language: 'en' } as any
      const { monthHeaders } = useYearHeaders()
      expect(monthHeaders.value).toHaveLength(12)
      expect(monthHeaders.value[0]).toMatch(/jan/i)
    })

    it('should always return exactly 12 months', () => {
      const settings = useSettingsStore()
      settings.config = { language: 'fr' } as any
      const { monthHeaders } = useYearHeaders()
      expect(monthHeaders.value).toHaveLength(12)
    })
  })

  describe('return structure', () => {
    it('should return yearHeaders and monthHeaders', () => {
      const result = useYearHeaders()
      expect(result).toHaveProperty('yearHeaders')
      expect(result).toHaveProperty('monthHeaders')
    })
  })
})
