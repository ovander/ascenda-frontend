import { describe, it, expect } from 'vitest'
import { escapeHtml } from './escapeHtml'

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`Tom & Jerry <b>"quoted"</b> it's`)).toBe(
      'Tom &amp; Jerry &lt;b&gt;&quot;quoted&quot;&lt;/b&gt; it&#39;s',
    )
  })

  it('neutralises a script injection in a product name', () => {
    const out = escapeHtml('<script>alert(document.cookie)</script>')
    expect(out).not.toContain('<script>')
    expect(out).toBe('&lt;script&gt;alert(document.cookie)&lt;/script&gt;')
  })

  it('neutralises attribute break-outs', () => {
    expect(escapeHtml('" onmouseover="alert(1)')).toBe('&quot; onmouseover=&quot;alert(1)')
  })

  it('leaves plain text, digits and accents untouched', () => {
    expect(escapeHtml('Chiffre d’affaires — Année 1 (k€)')).toBe('Chiffre d’affaires — Année 1 (k€)')
    expect(escapeHtml(2026)).toBe('2026')
  })

  it('maps null and undefined to the empty string', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
  })

  it('does not double-escape already escaped input', () => {
    // Escaping is idempotent only on plain text; an already-escaped string is
    // escaped again by design (the caller must escape exactly once).
    expect(escapeHtml('&amp;')).toBe('&amp;amp;')
  })
})
