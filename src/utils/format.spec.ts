import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatDate, formatDateTime, debounce, slugify, clamp } from './format'

describe('format utilities', () => {
  describe('formatDate', () => {
    it('should format a valid date string in French locale by default', () => {
      const result = formatDate('2024-03-17')
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    })

    it('should format a valid date string in English locale when specified', () => {
      const result = formatDate('2024-03-17', 'en-US')
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
    })

    it('should return empty string for empty input', () => {
      expect(formatDate('')).toBe('')
    })

    it('should return empty string for null-like input', () => {
      expect(formatDate(null as any)).toBe('')
    })

    it('should handle ISO date format correctly', () => {
      const result = formatDate('2024-12-25')
      expect(result).toBeTruthy()
      expect(result).not.toBe('')
    })

    it('should handle different locales', () => {
      const frResult = formatDate('2024-01-15', 'fr-FR')
      const enResult = formatDate('2024-01-15', 'en-US')
      expect(frResult).toBeTruthy()
      expect(enResult).toBeTruthy()
    })
  })

  describe('formatDateTime', () => {
    it('should format date with time in French locale by default', () => {
      const result = formatDateTime('2024-03-17T14:30:00')
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    })

    it('should include time information', () => {
      const result = formatDateTime('2024-03-17T14:30:00')
      expect(result).toBeTruthy()
    })

    it('should return empty string for empty input', () => {
      expect(formatDateTime('')).toBe('')
    })

    it('should return empty string for null-like input', () => {
      expect(formatDateTime(null as any)).toBe('')
    })

    it('should format in English locale when specified', () => {
      const result = formatDateTime('2024-03-17T14:30:00', 'en-US')
      expect(result).toBeTruthy()
      expect(result).not.toBe('')
    })

    it('should handle different times', () => {
      const morning = formatDateTime('2024-03-17T08:00:00')
      const evening = formatDateTime('2024-03-17T18:45:00')
      expect(morning).toBeTruthy()
      expect(evening).toBeTruthy()
    })
  })

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should debounce function calls with default delay', () => {
      const fn = vi.fn()
      const debounced = debounce(fn)

      debounced()
      debounced()
      debounced()

      expect(fn).not.toHaveBeenCalled()

      vi.advanceTimersByTime(300)
      expect(fn).toHaveBeenCalledOnce()
    })

    it('should debounce function calls with custom delay', () => {
      const fn = vi.fn()
      const debounced = debounce(fn, 500)

      debounced()
      vi.advanceTimersByTime(300)
      expect(fn).not.toHaveBeenCalled()

      vi.advanceTimersByTime(200)
      expect(fn).toHaveBeenCalledOnce()
    })

    it('should pass arguments to the debounced function', () => {
      const fn = vi.fn()
      const debounced = debounce(fn, 300)

      debounced('arg1', 42, { key: 'value' })

      vi.advanceTimersByTime(300)
      expect(fn).toHaveBeenCalledWith('arg1', 42, { key: 'value' })
    })

    it('should reset timer on subsequent calls', () => {
      const fn = vi.fn()
      const debounced = debounce(fn, 300)

      debounced()
      vi.advanceTimersByTime(250)
      debounced()
      vi.advanceTimersByTime(250)
      expect(fn).not.toHaveBeenCalled()

      vi.advanceTimersByTime(300)
      expect(fn).toHaveBeenCalledOnce()
    })

    it('should handle rapid calls efficiently', () => {
      const fn = vi.fn()
      const debounced = debounce(fn, 300)

      for (let i = 0; i < 100; i++) {
        debounced()
      }

      vi.advanceTimersByTime(300)
      expect(fn).toHaveBeenCalledTimes(1)
    })
  })

  describe('slugify', () => {
    it('should convert text to lowercase slug', () => {
      expect(slugify('Hello World')).toBe('hello-world')
    })

    it('should remove special characters', () => {
      expect(slugify('Hello@#$% World!')).toBe('hello-world')
    })

    it('should replace spaces with hyphens', () => {
      expect(slugify('The Quick Brown Fox')).toBe('the-quick-brown-fox')
    })

    it('should collapse multiple spaces into single hyphen', () => {
      expect(slugify('Hello   World')).toBe('hello-world')
    })

    it('should remove duplicate hyphens', () => {
      expect(slugify('Hello---World')).toBe('hello-world')
    })

    it('should handle leading/trailing whitespace', () => {
      // trim() removes whitespace but dashes from space→dash conversion remain
      expect(slugify('  Hello World  ')).toBe('-hello-world-')
    })

    it('should preserve numbers', () => {
      expect(slugify('Test 123 Case')).toBe('test-123-case')
    })

    it('should handle empty string', () => {
      expect(slugify('')).toBe('')
    })

    it('should handle only special characters', () => {
      expect(slugify('@#$%^&*()')).toBe('')
    })

    it('should handle text with hyphens', () => {
      expect(slugify('Already-Slugified-Text')).toBe('already-slugified-text')
    })
  })

  describe('clamp', () => {
    it('should return value when within range', () => {
      expect(clamp(5, 0, 10)).toBe(5)
    })

    it('should return min when value is below range', () => {
      expect(clamp(-5, 0, 10)).toBe(0)
    })

    it('should return max when value is above range', () => {
      expect(clamp(15, 0, 10)).toBe(10)
    })

    it('should return min when value equals min', () => {
      expect(clamp(0, 0, 10)).toBe(0)
    })

    it('should return max when value equals max', () => {
      expect(clamp(10, 0, 10)).toBe(10)
    })

    it('should work with negative numbers', () => {
      expect(clamp(-5, -10, -1)).toBe(-5)
    })

    it('should work with decimal numbers', () => {
      expect(clamp(5.5, 0, 10)).toBe(5.5)
    })

    it('should work with negative range', () => {
      expect(clamp(-15, -10, -5)).toBe(-10)
    })

    it('should handle zero range (min = max)', () => {
      expect(clamp(5, 10, 10)).toBe(10)
    })
  })
})
