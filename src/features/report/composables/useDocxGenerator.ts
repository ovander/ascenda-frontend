/**
 * useDocxGenerator — generates a professional bilingual .docx financial report
 * for Pro / Enterprise users, matching the structure of the "Dossier Prévisionnel"
 * template.
 *
 * Language is driven by PlanConfig.language ('fr' | 'en').
 * Number formatting respects the country locale (fr-FR → 1 234,56 € / en-US → €1,234.56).
 *
 * Sections generated:
 *  1. Cover page
 *  2. Table of Contents
 *  3. Investment & Funding Plan (FiPlan requirements/resources)
 *  4. Revenue Summary
 *  5. P&L Statement
 *  6. SIG / CAF (Gross Margin intermediary balances + Self-Financing)
 *  7. Operating Ratios
 *  8. Break-Even Analysis
 *  9. Working Capital Requirement (WCR / BFR)
 * 10. Funding Plan (FiPlan)
 * 11. Cash Flow Statement
 * 12. Balance Sheet
 * 13. Financial Ratios
 * 14. Executive Summary / Synthesis
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  ShadingType,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  Header,
  Footer,
  PageNumber,   // enum: PageNumber.CURRENT | PageNumber.TOTAL_PAGES
  NumberFormat,
} from 'docx'

import type { FullPlanOutput, PlanConfigComputed } from '@/types'
import { getLabels, type ReportLanguage } from '../i18n/reportLabels'

// ── Layout constants (A4, DXA units) ────────────────────────────────────────
const A4_WIDTH  = 11_906   // DXA
const A4_HEIGHT = 16_838   // DXA
const MARGIN    = 1_100    // top / bottom / left / right
const CONTENT_W = A4_WIDTH - 2 * MARGIN   // 9 706 DXA

// Column widths for 5-year financial tables
const COL_LABEL = 3_000   // row label column
const COL_YEAR  = Math.floor((CONTENT_W - COL_LABEL) / 5)   // ≈ 1 341 DXA

// ── Colour palette ────────────────────────────────────────────────────────────
const CLR = {
  navyBg:     '1F3864',   // section header background
  navyFg:     'FFFFFF',   // header text (white)
  blueBg:     '2E74B5',   // year-header background
  blueLightBg:'BDD7EE',   // total / subtotal row background
  greyBg:     'F2F2F2',   // alternate row
  whiteBg:    'FFFFFF',
  redText:    'C00000',   // negative values
  borderClr:  'BDD7EE',
  black:      '000000',
  darkGrey:   '404040',
}

// ── Font sizes (half-points) ──────────────────────────────────────────────────
const SZ = {
  cover:    36,   // 18pt
  h1:       26,   // 13pt
  h2:       22,   // 11pt
  body:     18,   // 9pt
  small:    16,   // 8pt
  footer:   16,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format a numeric value as a locale-aware currency string (no decimals). */
function fmtCurrency(
  v: number | string | null | undefined,
  locale: string,
  currency: string,
): string {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v ?? 0)
  if (!isFinite(n)) return '—'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(n)
}

/** Format as percentage string (value in 0–1 range). */
function fmtPct(v: number | null | undefined, decimals = 1): string {
  if (v == null || !isFinite(v)) return '—'
  return `${(v * 100).toFixed(decimals)} %`
}

/** Format a plain integer with locale-aware thousand separator. */
function fmtInt(v: number | null | undefined, locale: string): string {
  if (v == null || !isFinite(v)) return '—'
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(v)
}

function numOrZero(v: string | number | null | undefined): number {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v ?? 0)
  return isFinite(n) ? n : 0
}

// ── Cell builders ─────────────────────────────────────────────────────────────

interface CellOpts {
  text: string
  bold?: boolean
  italic?: boolean
  align?: (typeof AlignmentType)[keyof typeof AlignmentType]
  bgColor?: string
  fgColor?: string
  size?: number
  width?: number
  columnSpan?: number
  negative?: boolean
}

function makeCell(opts: CellOpts): TableCell {
  const {
    text, bold = false, italic = false,
    align = AlignmentType.LEFT,
    bgColor = CLR.whiteBg, fgColor = CLR.black,
    size = SZ.body, width, columnSpan = 1, negative = false,
  } = opts

  const resolvedFg = negative ? CLR.redText : fgColor

  const widthOpts = width
    ? { size: width, type: WidthType.DXA }
    : undefined

  return new TableCell({
    columnSpan,
    width: widthOpts,
    shading: { fill: bgColor, type: ShadingType.SOLID, color: bgColor },
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 1, color: CLR.borderClr },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: CLR.borderClr },
      left:   { style: BorderStyle.NONE },
      right:  { style: BorderStyle.NONE },
    },
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [
      new Paragraph({
        alignment: align,
        children: [
          new TextRun({ text, bold, italics: italic, size, color: resolvedFg }),
        ],
      }),
    ],
  })
}

/** Section header row spanning all columns. */
function sectionHeaderRow(label: string, colCount: number): TableRow {
  return new TableRow({
    children: [
      makeCell({
        text: label.toUpperCase(),
        bold: true,
        bgColor: CLR.navyBg,
        fgColor: CLR.navyFg,
        columnSpan: colCount,
        align: AlignmentType.LEFT,
        size: SZ.body,
      }),
    ],
  })
}

/** Column header row: label column + year columns. */
function yearHeaderRow(
  labelHeader: string,
  years: (string | number)[],
  labelWidth = COL_LABEL,
): TableRow {
  return new TableRow({
    tableHeader: true,
    children: [
      makeCell({
        text: labelHeader,
        bold: true,
        bgColor: CLR.blueBg,
        fgColor: CLR.navyFg,
        width: labelWidth,
        align: AlignmentType.LEFT,
        size: SZ.small,
      }),
      ...years.map((y) =>
        makeCell({
          text: String(y),
          bold: true,
          bgColor: CLR.blueBg,
          fgColor: CLR.navyFg,
          width: COL_YEAR,
          align: AlignmentType.RIGHT,
          size: SZ.small,
        }),
      ),
    ],
  })
}

/** Data row for a pivot / financial table. */
interface DataRowOpts {
  label: string
  values: (number | string | null | undefined)[]
  bold?: boolean
  indent?: boolean
  isTotal?: boolean
  labelWidth?: number
  locale: string
  currency: string
  formatValue?: (v: number | string | null | undefined) => string
}

function dataRow(opts: DataRowOpts): TableRow {
  const {
    label, values, bold = false, indent = false, isTotal = false,
    labelWidth = COL_LABEL, locale, currency,
    formatValue,
  } = opts

  const bgColor = isTotal ? CLR.blueLightBg : CLR.whiteBg
  const fmt = formatValue ?? ((v) => fmtCurrency(v, locale, currency))

  return new TableRow({
    children: [
      makeCell({
        text: indent ? `    ${label}` : label,
        bold,
        bgColor,
        width: labelWidth,
        size: SZ.body,
      }),
      ...values.map((v) => {
        const n = numOrZero(v)
        return makeCell({
          text: fmt(v),
          bold,
          bgColor,
          width: COL_YEAR,
          align: AlignmentType.RIGHT,
          size: SZ.body,
          negative: n < 0,
        })
      }),
    ],
  })
}

// ── Table factory ─────────────────────────────────────────────────────────────

function makeTable(rows: TableRow[]): Table {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    rows,
    borders: {
      top:           { style: BorderStyle.NONE },
      bottom:        { style: BorderStyle.NONE },
      left:          { style: BorderStyle.NONE },
      right:         { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: CLR.borderClr },
      insideVertical:   { style: BorderStyle.NONE },
    },
  })
}

// ── Section heading paragraph ─────────────────────────────────────────────────

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 160 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: SZ.h1,
        color: CLR.navyBg,
      }),
    ],
  })
}

// TODO: Implement sub-heading formatting if needed
// function subHeading(text: string): Paragraph {
//   return new Paragraph({
//     heading: HeadingLevel.HEADING_2,
//     spacing: { before: 200, after: 100 },
//     children: [
//       new TextRun({ text, bold: true, size: SZ.h2, color: CLR.navyBg }),
//     ],
//   })
// }

function spacer(lines = 1): Paragraph[] {
  return Array.from({ length: lines }, () => new Paragraph({ text: '' }))
}

// ── Page break ────────────────────────────────────────────────────────────────

function pageBreak(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] })
}

// ─────────────────────────────────────────────────────────────────────────────
// Section builders
// ─────────────────────────────────────────────────────────────────────────────

/** Cover page */
function buildCover(
  config: PlanConfigComputed,
  L: ReturnType<typeof getLabels>,
  locale: string,
): Paragraph[] {
  const now = new Date().toLocaleDateString(locale, {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  const years = config.yearHeaders?.join(' – ') ?? ''

  return [
    ...Array.from({ length: 8 }, () => new Paragraph({ text: '' })),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 320 },
      children: [
        new TextRun({
          text: L.meta.reportTitle.toUpperCase(),
          bold: true,
          size: SZ.cover,
          color: CLR.navyBg,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: config.companyName ?? '',
          bold: true,
          size: 32,
          color: CLR.darkGrey,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({ text: years, size: 24, color: CLR.darkGrey }),
      ],
    }),
    ...Array.from({ length: 6 }, () => new Paragraph({ text: '' })),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `${L.meta.generatedOn} ${now}`,
          size: SZ.small,
          color: '888888',
          italics: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: L.meta.confidential,
          size: SZ.small,
          color: '888888',
          italics: true,
        }),
      ],
    }),
  ]
}

/** Revenue Summary table */
function buildRevenue(
  report: FullPlanOutput,
  L: ReturnType<typeof getLabels>,
  locale: string,
  currency: string,
): (Paragraph | Table)[] {
  const totals = report.revenue?.totals ?? []
  if (!totals.length) return []

  const rows: TableRow[] = [
    yearHeaderRow(L.table.lineItem, totals.map((t) => t.year)),
    dataRow({ label: L.revenue.totalTurnover, values: totals.map((t) => t.totalTurnover), bold: true, isTotal: true, locale, currency }),
    dataRow({ label: L.revenue.directSales,   values: totals.map((t) => t.totalDirectSales),  indent: true, locale, currency }),
    dataRow({ label: L.revenue.indirectSales, values: totals.map((t) => t.totalIndirectSales), indent: true, locale, currency }),
    dataRow({ label: L.revenue.exportSales,   values: totals.map((t) => t.europeExportSales),  indent: true, locale, currency }),
    dataRow({ label: L.revenue.cogs,          values: totals.map((t) => t.totalCogs),          locale, currency }),
    dataRow({ label: L.revenue.grossMargin,   values: totals.map((t) => t.totalGrossMargin),   bold: true, isTotal: true, locale, currency }),
    dataRow({
      label: L.revenue.grossMarginPct,
      values: totals.map((t) => numOrZero(t.grossMarginPct)),
      locale,
      currency,
      formatValue: (v) => fmtPct(numOrZero(v)),
    }),
    dataRow({
      label: L.revenue.unitSales,
      values: totals.map((t) => t.totalUnitSales),
      locale,
      currency,
      formatValue: (v) => fmtInt(numOrZero(v), locale),
    }),
  ]

  return [makeTable(rows)]
}

/** P&L Statement table */
function buildPnl(
  report: FullPlanOutput,
  L: ReturnType<typeof getLabels>,
  locale: string,
  currency: string,
): (Paragraph | Table)[] {
  const years = report.pnl?.years ?? []
  if (!years.length) return []

  const pnlL = L.pnl.rows
  const yr = (field: string) => years.map((y) => numOrZero((y as any)[field]))

  const rows: TableRow[] = [
    yearHeaderRow(L.table.lineItem, years.map((y) => y.year)),
    dataRow({ label: pnlL.sales,             values: yr('sales'),             bold: true, isTotal: true, locale, currency }),
    dataRow({ label: pnlL.exportSalesMemo,   values: yr('exportSalesMemo'),   indent: true, locale, currency }),
    dataRow({ label: pnlL.cogs,              values: yr('cogs'),              locale, currency }),
    dataRow({ label: pnlL.externalExpenses,  values: yr('externalExpenses'),  locale, currency }),
    dataRow({ label: pnlL.addedValue,        values: yr('addedValue'),        bold: true, isTotal: true, locale, currency }),
    dataRow({ label: pnlL.taxesAndDuties,    values: yr('taxesAndDuties'),    indent: true, locale, currency }),
    dataRow({ label: pnlL.payrollExpenses,   values: yr('payrollExpenses'),   indent: true, locale, currency }),
    dataRow({ label: pnlL.ebitda,            values: yr('ebitda'),            bold: true, isTotal: true, locale, currency }),
    dataRow({ label: pnlL.depreciation,      values: yr('depreciation'),      indent: true, locale, currency }),
    dataRow({ label: pnlL.otherOperatingExp, values: yr('otherOperatingExp'), indent: true, locale, currency }),
    dataRow({ label: pnlL.ebit,              values: yr('ebit'),              bold: true, isTotal: true, locale, currency }),
    dataRow({ label: pnlL.financialExpenses, values: yr('financialExpenses'), indent: true, locale, currency }),
    dataRow({ label: pnlL.preTaxEarnings,    values: yr('preTaxEarnings'),    bold: true, locale, currency }),
    dataRow({ label: pnlL.corporateTax,      values: yr('corporateTax'),      indent: true, locale, currency }),
    dataRow({ label: pnlL.netProfit,         values: yr('netProfit'),         bold: true, isTotal: true, locale, currency }),
    dataRow({ label: pnlL.cashFlow,          values: yr('cashFlow'),          bold: true, isTotal: true, locale, currency }),
  ]

  return [makeTable(rows)]
}

/** SIG / CAF — uses P&L data to extract key margin intermediaries */
function buildSig(
  report: FullPlanOutput,
  L: ReturnType<typeof getLabels>,
  locale: string,
  currency: string,
): (Paragraph | Table)[] {
  const years = report.pnl?.years ?? []
  if (!years.length) return []

  const yr = (field: string) => years.map((y) => numOrZero((y as any)[field]))
  const SL = L.sig

  const rows: TableRow[] = [
    yearHeaderRow(L.table.lineItem, years.map((y) => y.year)),
    dataRow({ label: SL.addedValue, values: yr('addedValue'),    bold: true, isTotal: true, locale, currency }),
    dataRow({ label: SL.ebitda,     values: yr('ebitda'),        bold: true, isTotal: true, locale, currency }),
    dataRow({ label: SL.ebit,       values: yr('ebit'),          bold: true, locale, currency }),
    dataRow({ label: SL.ebt,        values: yr('preTaxEarnings'), locale, currency }),
    dataRow({ label: SL.netProfit,  values: yr('netProfit'),     bold: true, isTotal: true, locale, currency }),
    dataRow({ label: SL.caf,        values: yr('cashFlow'),      bold: true, isTotal: true, locale, currency }),
  ]

  return [makeTable(rows)]
}

/** Operating Ratios table */
function buildRatiosOp(
  report: FullPlanOutput,
  L: ReturnType<typeof getLabels>,
  locale: string,
  currency: string,
): (Paragraph | Table)[] {
  const r = report.ratios
  if (!r) return []

  const years = r.years
  const RL = L.ratiosOp

  const rows: TableRow[] = [
    yearHeaderRow(L.table.lineItem, years),
    dataRow({ label: RL.sales,          values: r.sales.sales,              bold: true, isTotal: true, locale, currency }),
    dataRow({
      label: RL.salesGrowth,
      values: r.sales.growthRate,
      locale, currency,
      formatValue: (v) => fmtPct(numOrZero(v)),
    }),
    dataRow({
      label: RL.grossMarginPct,
      values: r.sales.grossMarginPct,
      locale, currency,
      formatValue: (v) => fmtPct(numOrZero(v)),
    }),
    dataRow({ label: RL.ebitdaPct,   values: r.profitability.ebitda,    bold: true, locale, currency }),
    dataRow({
      label: RL.ebitdaPct + ' %',
      values: r.profitability.ebitdaPct,
      indent: true, locale, currency,
      formatValue: (v) => fmtPct(numOrZero(v)),
    }),
    dataRow({ label: RL.netProfitPct,  values: r.profitability.netProfit,  bold: true, locale, currency }),
    dataRow({
      label: RL.netProfitPct + ' %',
      values: r.profitability.netProfitPct,
      indent: true, locale, currency,
      formatValue: (v) => fmtPct(numOrZero(v)),
    }),
    dataRow({
      label: RL.headcount,
      values: r.operational.staffHeadcount,
      locale, currency,
      formatValue: (v) => fmtInt(numOrZero(v), locale),
    }),
    dataRow({
      label: RL.salesPerStaff,
      values: r.operational.salesPerStaff,
      locale, currency,
    }),
    dataRow({ label: RL.capex,  values: r.operational.capitalExpenditure, locale, currency }),
  ]

  return [makeTable(rows)]
}

/** Break-even Analysis */
function buildBreakeven(
  report: FullPlanOutput,
  L: ReturnType<typeof getLabels>,
  locale: string,
  currency: string,
): (Paragraph | Table)[] {
  const years = report.pnl?.years ?? []
  if (!years.length) return []

  const BL = L.breakeven
  // Derive fixed/variable split from P&L
  // Fixed costs ≈ payrollExpenses + depreciation + taxesAndDuties + otherOperatingExp
  // Variable costs ≈ cogs + externalExpenses
  const variableCosts   = years.map((y) => numOrZero(y.cogs) + numOrZero(y.externalExpenses))
  const fixedCosts      = years.map((y) => numOrZero(y.payrollExpenses) + numOrZero(y.depreciation) + numOrZero(y.taxesAndDuties) + numOrZero(y.otherOperatingExp))
  const sales           = years.map((y) => numOrZero(y.sales))
  const varCostPct      = years.map((_, i) => sales[i] ? variableCosts[i] / sales[i] : 0)
  const contribPct      = varCostPct.map((r) => 1 - r)
  const contribMargin   = years.map((_, i) => sales[i] * contribPct[i])
  const breakevenRev    = years.map((_, i) => contribPct[i] ? fixedCosts[i] / contribPct[i] : 0)

  const rows: TableRow[] = [
    yearHeaderRow(L.table.lineItem, years.map((y) => y.year)),
    dataRow({ label: BL.fixedCosts,         values: fixedCosts,    locale, currency }),
    dataRow({ label: BL.variableCosts,       values: variableCosts, locale, currency }),
    dataRow({
      label: BL.variableCostPct,
      values: varCostPct,
      locale, currency,
      formatValue: (v) => fmtPct(numOrZero(v)),
    }),
    dataRow({ label: BL.contributionMargin,  values: contribMargin, bold: true, isTotal: true, locale, currency }),
    dataRow({
      label: BL.contributionPct,
      values: contribPct,
      locale, currency,
      formatValue: (v) => fmtPct(numOrZero(v)),
    }),
    dataRow({ label: BL.breakevenRevenue,    values: breakevenRev,  bold: true, isTotal: true, locale, currency }),
  ]

  const note = new Paragraph({
    spacing: { before: 80 },
    children: [
      new TextRun({ text: BL.breakevenNote, size: SZ.small, italics: true, color: '888888' }),
    ],
  })

  return [makeTable(rows), note]
}

/** WCR / BFR */
function buildWcr(
  report: FullPlanOutput,
  L: ReturnType<typeof getLabels>,
  locale: string,
  currency: string,
): (Paragraph | Table)[] {
  const w = report.wcr as any
  if (!w) return []

  const WL = L.wcr
  const years = report.ratios?.years ?? []

  const rows: TableRow[] = [
    yearHeaderRow(L.table.lineItem, years),
    dataRow({ label: WL.customers,    values: (w.customers?.receivables ?? []) as any, locale, currency }),
    dataRow({ label: WL.inventory,    values: (w.inventory?.closing ?? []) as any,     locale, currency }),
    dataRow({ label: WL.suppliers,    values: (w.suppliers?.payables ?? []) as any,    locale, currency }),
    dataRow({ label: WL.fiscalSocial, values: (w.fiscalSocial?.total ?? []) as any,    locale, currency }),
    dataRow({ label: WL.netWcr,       values: (w.summary?.netWcr ?? []) as any,        bold: true, isTotal: true, locale, currency }),
    dataRow({
      label: WL.dsoDays,
      // effectiveDso is a plan-level scalar (weighted-average collection delay).
      // Repeat it across all year columns so the table row is fully populated.
      values: years.map(() => w.effectiveDso),
      locale, currency,
      formatValue: (v) => fmtInt(numOrZero(v), locale),
    }),
    dataRow({
      label: WL.dpoDays,
      // effectiveDpo is likewise a scalar (weighted-average payment delay).
      values: years.map(() => w.effectiveDpo),
      locale, currency,
      formatValue: (v) => fmtInt(numOrZero(v), locale),
    }),
  ]

  return [makeTable(rows)]
}

/** Funding Plan (FiPlan requirements & resources) */
function buildFiplan(
  report: FullPlanOutput,
  L: ReturnType<typeof getLabels>,
  locale: string,
  currency: string,
): (Paragraph | Table)[] {
  const fp = report.fiplan?.plan
  if (!fp) return []

  const FL = L.fiplan
  const years = report.ratios?.years ?? []
  const colCount = years.length + 1

  const arr = (a: string[]) => a.map(Number)

  const rows: TableRow[] = [
    yearHeaderRow(L.table.lineItem, years),
    sectionHeaderRow(FL.requirements.title, colCount),
    dataRow({ label: FL.requirements.capex,           values: arr(fp.requirements.capex),            indent: true, locale, currency }),
    dataRow({ label: FL.requirements.wcrChange,        values: arr(fp.requirements.wcrChange),         indent: true, locale, currency }),
    dataRow({ label: FL.requirements.loanRepayments,   values: arr(fp.requirements.loanRepayments),    indent: true, locale, currency }),
    dataRow({ label: FL.requirements.negativeCashFlow, values: arr(fp.requirements.negativeCashFlow),  indent: true, locale, currency }),
    dataRow({ label: FL.requirements.dividends,        values: arr(fp.requirements.dividends),         indent: true, locale, currency }),
    dataRow({ label: FL.requirements.total,            values: arr(fp.requirements.total),             bold: true, isTotal: true, locale, currency }),
    sectionHeaderRow(FL.resources.title, colCount),
    dataRow({ label: FL.resources.capitalIncrease,  values: arr(fp.resources.capitalIncrease),  indent: true, locale, currency }),
    dataRow({ label: FL.resources.ltLoans,          values: arr(fp.resources.ltLoans),          indent: true, locale, currency }),
    dataRow({ label: FL.resources.positiveCashFlow, values: arr(fp.resources.positiveCashFlow), indent: true, locale, currency }),
    dataRow({ label: FL.resources.subsidies,        values: arr(fp.resources.subsidies),        indent: true, locale, currency }),
    dataRow({ label: FL.resources.total,            values: arr(fp.resources.total),            bold: true, isTotal: true, locale, currency }),
    sectionHeaderRow(FL.balance.title, colCount),
    dataRow({ label: FL.balance.annualBalance,  values: arr(fp.balance.annualBalance),  bold: true, locale, currency }),
    dataRow({ label: FL.balance.cumulativeCash, values: arr(fp.balance.cumulativeCash), bold: true, isTotal: true, locale, currency }),
  ]

  return [makeTable(rows)]
}

/** Cash Flow Statement */
function buildCashFlow(
  report: FullPlanOutput,
  L: ReturnType<typeof getLabels>,
  locale: string,
  currency: string,
): (Paragraph | Table)[] {
  const cf = report.fiplan?.cashFlow
  if (!cf) return []

  const CL = L.cashflow
  const years = report.ratios?.years ?? []
  const arr = (a: string[]) => a.map(Number)

  const rows: TableRow[] = [
    yearHeaderRow(L.table.lineItem, years),
    dataRow({ label: CL.operatingFlows,   values: arr(cf.operating.operatingFlows),  bold: true, isTotal: true, locale, currency }),
    dataRow({ label: CL.netProfit,         values: arr(cf.operating.netProfit),         indent: true, locale, currency }),
    dataRow({ label: CL.depreciation,      values: arr(cf.operating.depreciation),      indent: true, locale, currency }),
    dataRow({ label: CL.wcrChange,         values: arr(cf.operating.wcrChange),         indent: true, locale, currency }),
    dataRow({ label: CL.investingFlows,   values: arr(cf.investing.investmentFlows),  bold: true, isTotal: true, locale, currency }),
    dataRow({ label: CL.capex,             values: arr(cf.investing.capexOutflow),       indent: true, locale, currency }),
    dataRow({ label: CL.financingFlows,   values: arr(cf.financing.financingFlows),  bold: true, isTotal: true, locale, currency }),
    dataRow({ label: CL.capitalIncrease,   values: arr(cf.financing.capitalIncrease),   indent: true, locale, currency }),
    dataRow({ label: CL.newLoansAndGrants, values: arr(cf.financing.newLoansAndGrants), indent: true, locale, currency }),
    dataRow({ label: CL.dividends,         values: arr(cf.financing.dividends),          indent: true, locale, currency }),
    dataRow({ label: CL.netChange,         values: arr(cf.summary.changeInCash),         bold: true, isTotal: true, locale, currency }),
    dataRow({ label: CL.cumulativeCash,    values: arr(cf.summary.cumulativeCash),       bold: true, isTotal: true, locale, currency }),
  ]

  return [makeTable(rows)]
}

/** Balance Sheet */
function buildBSheet(
  report: FullPlanOutput,
  L: ReturnType<typeof getLabels>,
  locale: string,
  currency: string,
): (Paragraph | Table)[] {
  const bs = report.bsheet
  if (!bs) return []

  const BL = L.bsheet
  const years = bs.charts?.years ?? []
  const colCount = years.length + 1

  const ca = bs.condensed.assets
  const cl = bs.condensed.liabilities

  const rows: TableRow[] = [
    yearHeaderRow(L.table.lineItem, years.map((y, i) => (i === 0 ? L.table.opening : y))),
    sectionHeaderRow(BL.assets, colCount),
    dataRow({ label: BL.noncurrentAssets, values: ca.noncurrentAssets, indent: true, locale, currency }),
    dataRow({ label: BL.currentAssets,    values: ca.currentAssets,    indent: true, locale, currency }),
    dataRow({ label: BL.cash,             values: ca.cash,             indent: true, locale, currency }),
    dataRow({ label: BL.totalAssets,      values: ca.total,            bold: true, isTotal: true, locale, currency }),
    sectionHeaderRow(BL.liabilities, colCount),
    dataRow({ label: BL.equity,           values: cl.equity,       indent: true, locale, currency }),
    dataRow({ label: BL.longTermDebt,     values: cl.longTermDebt, indent: true, locale, currency }),
    dataRow({ label: BL.shortTermDebt,    values: cl.shortTermDebt, indent: true, locale, currency }),
    dataRow({ label: BL.totalLiabilities, values: cl.total,        bold: true, isTotal: true, locale, currency }),
  ]

  return [makeTable(rows)]
}

/** Financial Ratios */
function buildRatiosSt(
  report: FullPlanOutput,
  L: ReturnType<typeof getLabels>,
  locale: string,
  currency: string,
): (Paragraph | Table)[] {
  const r = report.ratios
  if (!r) return []

  const RL = L.ratiosSt
  const years = r.years
  const v = r.valuation

  const rows: TableRow[] = [
    yearHeaderRow(L.table.lineItem, years),
    dataRow({ label: RL.totalEquity, values: r.equityLeverage.totalEquityEoy, bold: true, locale, currency }),
    dataRow({ label: RL.ltLoans,     values: r.equityLeverage.ltLoans,        locale, currency }),
    dataRow({
      label: RL.wcrDays,
      values: r.equityLeverage.wcrRotationDays,
      locale, currency,
      formatValue: (v2) => fmtInt(numOrZero(v2), locale),
    }),
    dataRow({ label: RL.cashAtEoy,   values: r.profitability.cashAtEoy,       bold: true, locale, currency }),
  ]

  const valRows: (Paragraph | Table)[] = []
  if (v) {
    const irr = v.irrValid ? fmtPct(v.irr) : 'N/A'
    const valTable = new Table({
      width: { size: Math.round(CONTENT_W / 2), type: WidthType.DXA },
      rows: [
        new TableRow({
          children: [
            makeCell({ text: RL.npv,          bold: true, bgColor: CLR.blueBg, fgColor: CLR.navyFg, size: SZ.small }),
            makeCell({ text: fmtCurrency(v.npv, locale, currency), bgColor: CLR.blueLightBg, align: AlignmentType.RIGHT, size: SZ.body }),
          ],
        }),
        new TableRow({
          children: [
            makeCell({ text: RL.irr,          bold: true, bgColor: CLR.blueBg, fgColor: CLR.navyFg, size: SZ.small }),
            makeCell({ text: irr,             bgColor: CLR.blueLightBg, align: AlignmentType.RIGHT, size: SZ.body }),
          ],
        }),
        new TableRow({
          children: [
            makeCell({ text: RL.terminalValue, bold: true, bgColor: CLR.blueBg, fgColor: CLR.navyFg, size: SZ.small }),
            makeCell({ text: fmtCurrency(v.terminalValue, locale, currency), bgColor: CLR.blueLightBg, align: AlignmentType.RIGHT, size: SZ.body }),
          ],
        }),
      ],
    })
    valRows.push(...spacer(1), valTable)
  }

  return [makeTable(rows), ...valRows]
}

/** Executive Summary — key KPI matrix */
function buildSynthesis(
  report: FullPlanOutput,
  L: ReturnType<typeof getLabels>,
  locale: string,
  currency: string,
): (Paragraph | Table)[] {
  const r = report.ratios
  if (!r) return []

  const SL = L.synthesis
  const years = r.years

  const rows: TableRow[] = [
    yearHeaderRow(SL.year, years),
    dataRow({ label: SL.sales,        values: r.sales.sales,              bold: true, isTotal: true, locale, currency }),
    dataRow({
      label: SL.ebitdaPct,
      values: r.profitability.ebitdaPct,
      locale, currency,
      formatValue: (v) => fmtPct(numOrZero(v)),
    }),
    dataRow({
      label: SL.netProfitPct,
      values: r.profitability.netProfitPct,
      locale, currency,
      formatValue: (v) => fmtPct(numOrZero(v)),
    }),
    dataRow({ label: SL.cashFlow,     values: r.profitability.cashFlow,   locale, currency }),
    dataRow({ label: SL.cashAtEoy,    values: r.profitability.cashAtEoy,  bold: true, locale, currency }),
    dataRow({
      label: SL.headcount,
      values: r.operational.staffHeadcount,
      locale, currency,
      formatValue: (v) => fmtInt(numOrZero(v), locale),
    }),
  ]

  return [makeTable(rows)]
}

// ─────────────────────────────────────────────────────────────────────────────
// Main generator
// ─────────────────────────────────────────────────────────────────────────────

export interface DocxGeneratorOptions {
  /** Full plan output from the report store */
  report: FullPlanOutput
  /** Computed plan config (includes yearHeaders, companyName, language, currency...) */
  config: PlanConfigComputed
  /** Locale string e.g. 'fr-FR' or 'en-US' — derived from config.language */
  locale: string
  /** Currency code e.g. 'EUR' */
  currency: string
}

/**
 * Generates the full financial report as a `.docx` Blob.
 * Call `URL.createObjectURL(blob)` then trigger a download.
 */
export async function generateDocxReport(opts: DocxGeneratorOptions): Promise<Blob> {
  const { report, config, locale, currency } = opts
  const L = getLabels(config.language as ReportLanguage)

  // ── Header & Footer ──────────────────────────────────────────────────────
  const docHeader = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({
            text: `${L.meta.reportTitle} — ${config.companyName ?? ''}`,
            size: SZ.footer,
            color: '888888',
            italics: true,
          }),
        ],
      }),
    ],
  })

  const docFooter = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: `${L.meta.page} `, size: SZ.footer, color: '888888' }),
          new TextRun({ children: [PageNumber.CURRENT], size: SZ.footer, color: '888888' }),
          new TextRun({ text: ` ${L.meta.of} `, size: SZ.footer, color: '888888' }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: SZ.footer, color: '888888' }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: '© 2026 Ascenda',
            size: SZ.footer - 2,
            color: 'aaaaaa',
            italics: true,
          }),
        ],
      }),
    ],
  })

  // ── Body children ────────────────────────────────────────────────────────
  const children: (Paragraph | Table)[] = []

  // 1. Cover
  children.push(...buildCover(config, L, locale))
  children.push(pageBreak())

  // 2. Investment & Funding overview (fiplan)
  children.push(sectionHeading(L.sections.investment))
  children.push(...buildFiplan(report, L, locale, currency))
  children.push(pageBreak())

  // 3. Revenue
  children.push(sectionHeading(L.sections.revenue))
  children.push(...buildRevenue(report, L, locale, currency))
  children.push(pageBreak())

  // 4. P&L Statement
  children.push(sectionHeading(L.sections.pnl))
  children.push(...buildPnl(report, L, locale, currency))
  children.push(pageBreak())

  // 5. SIG / CAF
  children.push(sectionHeading(`${L.sections.sig} / ${L.sections.caf}`))
  children.push(...buildSig(report, L, locale, currency))
  children.push(pageBreak())

  // 6. Operating Ratios
  children.push(sectionHeading(L.sections.ratiosOp))
  children.push(...buildRatiosOp(report, L, locale, currency))
  children.push(pageBreak())

  // 7. Break-Even Analysis
  children.push(sectionHeading(L.sections.breakeven))
  children.push(...buildBreakeven(report, L, locale, currency))
  children.push(pageBreak())

  // 8. WCR / BFR
  children.push(sectionHeading(L.sections.wcr))
  children.push(...buildWcr(report, L, locale, currency))
  children.push(pageBreak())

  // 9. Cash Flow Statement
  children.push(sectionHeading(L.sections.cashflow))
  children.push(...buildCashFlow(report, L, locale, currency))
  children.push(pageBreak())

  // 10. Balance Sheet
  children.push(sectionHeading(L.sections.bsheet))
  children.push(...buildBSheet(report, L, locale, currency))
  children.push(pageBreak())

  // 11. Financial Ratios
  children.push(sectionHeading(L.sections.ratiosSt))
  children.push(...buildRatiosSt(report, L, locale, currency))
  children.push(pageBreak())

  // 12. Synthesis / Executive Summary
  children.push(sectionHeading(L.sections.synthesis))
  children.push(...buildSynthesis(report, L, locale, currency))

  // ── Assemble document ────────────────────────────────────────────────────
  const doc = new Document({
    title:    `${L.meta.reportTitle} — ${config.companyName ?? ''}`,
    creator:  'Ascenda',
    keywords: 'financial plan, business plan, forecast',
    numbering: {
      config: [{
        reference: 'default-numbering',
        levels: [{
          level: 0,
          format: NumberFormat.DECIMAL,
          text: '%1.',
          alignment: AlignmentType.LEFT,
        }],
      }],
    },
    styles: {
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { bold: true, size: SZ.h1, color: CLR.navyBg },
          paragraph: { spacing: { before: 320, after: 160 } },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { bold: true, size: SZ.h2, color: CLR.navyBg },
          paragraph: { spacing: { before: 200, after: 100 } },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: A4_WIDTH, height: A4_HEIGHT },
            margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
          },
        },
        headers: { default: docHeader },
        footers: { default: docFooter },
        children,
      },
    ],
  })

  return Packer.toBlob(doc)
}

// ── Vue composable wrapper ────────────────────────────────────────────────────

import { ref } from 'vue'
import { useReportStore }   from '@/features/report/stores/reportStore'
import { usePlanStore }     from '@/features/plans/stores/planStore'
import { useSettingsStore } from '@/features/settings/stores/settingsStore'
import { useDecimal }       from '@/composables/useDecimal'

/**
 * Composable that exposes `downloadDocxReport()` for use in Vue components.
 * Handles loading state, locale/currency resolution, and file download.
 */
export function useDocxGenerator() {
  const reportStore   = useReportStore()
  const planStore     = usePlanStore()
  const settingsStore = useSettingsStore()
  const { getLocale } = useDecimal()

  const generating = ref(false)

  async function downloadDocxReport(): Promise<void> {
    const report = reportStore.fullReport
    const config = settingsStore.config as PlanConfigComputed | null

    if (!report || !config) return

    generating.value = true
    try {
      const locale   = getLocale()
      const currency = config.currency ?? 'EUR'

      const blob = await generateDocxReport({ report, config, locale, currency })

      const planName = planStore.activePlan?.name ?? 'plan'
      const langSuffix = config.language === 'en' ? 'en' : 'fr'
      const dateStr = new Date().toISOString().slice(0, 10)
      const filename = `${planName.replace(/[^a-zA-Z0-9-_]/g, '_')}_dossier_${langSuffix}_${dateStr}.docx`

      const url = URL.createObjectURL(blob)
      const a   = document.createElement('a')
      a.href     = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      generating.value = false
    }
  }

  return { downloadDocxReport, generating }
}
