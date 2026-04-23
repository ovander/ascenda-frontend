import { describe, it, expect } from 'vitest'
import { getLabels } from './reportLabels'
import type { ReportLabels } from './reportLabels'

describe('getLabels', () => {
  // ── Language selection ──────────────────────────────────────────────────
  describe('language selection', () => {
    it('returns French labels when language is "fr"', () => {
      const L = getLabels('fr')
      expect(L.meta.reportTitle).toBe('Dossier Prévisionnel')
    })

    it('returns English labels when language is "en"', () => {
      const L = getLabels('en')
      expect(L.meta.reportTitle).toBe('Business Plan')
    })

    it('defaults to French for an unknown language string', () => {
      const L = getLabels('de')
      expect(L.meta.reportTitle).toBe('Dossier Prévisionnel')
    })

    it('defaults to French when language is undefined', () => {
      const L = getLabels(undefined)
      expect(L.meta.reportTitle).toBe('Dossier Prévisionnel')
    })

    it('returns different label objects for fr and en', () => {
      expect(getLabels('fr')).not.toBe(getLabels('en'))
    })
  })

  // ── French labels ───────────────────────────────────────────────────────
  describe('French labels', () => {
    const L = getLabels('fr')

    it('meta.generatedOn is French', () => {
      expect(L.meta.generatedOn).toBe('Généré le')
    })

    it('toc.title is "Sommaire"', () => {
      expect(L.toc.title).toBe('Sommaire')
    })

    it('has 14 TOC sections', () => {
      expect(L.toc.sections).toHaveLength(14)
    })

    it('sections.pnl is French account label', () => {
      expect(L.sections.pnl).toBe('Compte de résultat')
    })

    it('pnl.rows.ebitda contains "EBE"', () => {
      expect(L.pnl.rows.ebitda).toContain('EBE')
    })

    it('pnl.rows.cashFlow mentions "CAF"', () => {
      expect(L.pnl.rows.cashFlow).toContain('CAF')
    })

    it('fiplan.requirements.total is "Total des emplois"', () => {
      expect(L.fiplan.requirements.total).toBe('Total des emplois')
    })

    it('fiplan.resources.total is "Total des ressources"', () => {
      expect(L.fiplan.resources.total).toBe('Total des ressources')
    })

    it('bsheet.assets is "Actif"', () => {
      expect(L.bsheet.assets).toBe('Actif')
    })

    it('wcr.netWcr is "BFR net"', () => {
      expect(L.wcr.netWcr).toBe('BFR net')
    })

    it('ratiosSt.irr contains "TRI"', () => {
      expect(L.ratiosSt.irr).toContain('TRI')
    })
  })

  // ── English labels ──────────────────────────────────────────────────────
  describe('English labels', () => {
    const L = getLabels('en')

    it('meta.generatedOn is English', () => {
      expect(L.meta.generatedOn).toBe('Generated on')
    })

    it('toc.title is "Table of Contents"', () => {
      expect(L.toc.title).toBe('Table of Contents')
    })

    it('has 14 TOC sections', () => {
      expect(L.toc.sections).toHaveLength(14)
    })

    it('sections.pnl is "P&L Statement"', () => {
      expect(L.sections.pnl).toBe('P&L Statement')
    })

    it('pnl.rows.ebitda is "EBITDA"', () => {
      expect(L.pnl.rows.ebitda).toBe('EBITDA')
    })

    it('fiplan.requirements.total is "Total Requirements"', () => {
      expect(L.fiplan.requirements.total).toBe('Total Requirements')
    })

    it('bsheet.assets is "Assets"', () => {
      expect(L.bsheet.assets).toBe('Assets')
    })

    it('wcr.netWcr is "Net WCR"', () => {
      expect(L.wcr.netWcr).toBe('Net WCR')
    })

    it('ratiosSt.irr contains "IRR"', () => {
      expect(L.ratiosSt.irr).toContain('IRR')
    })
  })

  // ── Completeness — every key is a non-empty string ──────────────────────
  function assertAllStringsNonEmpty(obj: unknown, path = ''): void {
    if (typeof obj === 'string') {
      expect(obj.length, `Label at ${path} must not be empty`).toBeGreaterThan(0)
    } else if (Array.isArray(obj)) {
      obj.forEach((item, i) => assertAllStringsNonEmpty(item, `${path}[${i}]`))
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
        assertAllStringsNonEmpty(val, path ? `${path}.${key}` : key)
      }
    }
  }

  it('all French labels are non-empty strings', () => {
    assertAllStringsNonEmpty(getLabels('fr') as unknown as Record<string, unknown>)
  })

  it('all English labels are non-empty strings', () => {
    assertAllStringsNonEmpty(getLabels('en') as unknown as Record<string, unknown>)
  })

  // ── Symmetry — both languages expose the same keys ──────────────────────
  function collectKeys(obj: unknown, prefix = ''): string[] {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return [prefix]
    return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
      collectKeys(v, prefix ? `${prefix}.${k}` : k),
    )
  }

  it('FR and EN label trees have identical key sets', () => {
    const frKeys = collectKeys(getLabels('fr') as unknown as Record<string, unknown>).sort()
    const enKeys = collectKeys(getLabels('en') as unknown as Record<string, unknown>).sort()
    expect(frKeys).toEqual(enKeys)
  })
})
