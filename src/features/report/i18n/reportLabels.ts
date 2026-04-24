/**
 * Bilingual label constants for the Word (.docx) financial report generator.
 * Language is driven by PlanConfig.language ('fr' | 'en').
 *
 * Usage:
 *   import { getLabels } from '@/features/report/i18n/reportLabels'
 *   const L = getLabels('fr')
 *   L.cover.title          // "Dossier Prévisionnel"
 *   L.pnl.rows.sales       // "Chiffre d'affaires"
 */

export type ReportLanguage = 'fr' | 'en'

export interface ReportLabels {
  // ── Meta ──────────────────────────────────────────────────────────────────
  meta: {
    reportTitle: string        // "Dossier Prévisionnel" | "Business Plan"
    generatedOn: string        // "Généré le" | "Generated on"
    confidential: string       // "Document confidentiel" | "Confidential document"
    currency: string           // "Devise" | "Currency"
    unit: string               // "Unité" | "Unit"
    unitK: string              // "k€" | "k€"
    page: string               // "Page" | "Page"
    of: string                 // "sur" | "of"
    year: string               // "Année" | "Year"
  }

  // ── TOC ───────────────────────────────────────────────────────────────────
  toc: {
    title: string              // "Sommaire" | "Table of Contents"
    sections: string[]         // ordered section titles for TOC
  }

  // ── Sections ──────────────────────────────────────────────────────────────
  sections: {
    investment: string         // "Investissements et financements"
    revenue: string            // "Chiffre d'affaires"
    payroll: string            // "Charges de personnel"
    overhead: string           // "Frais généraux"
    pnl: string                // "Compte de résultat"
    sig: string                // "Soldes intermédiaires de gestion"
    caf: string                // "Capacité d'autofinancement"
    ratiosOp: string           // "Ratios d'exploitation"
    breakeven: string          // "Seuil de rentabilité"
    wcr: string                // "Besoin en fonds de roulement"
    fiplan: string             // "Plan de financement"
    cashflow: string           // "État de trésorerie"
    bsheet: string             // "Bilan prévisionnel"
    ratiosSt: string           // "Ratios de structure"
    synthesis: string          // "Synthèse"
  }

  // ── Table headers ─────────────────────────────────────────────────────────
  table: {
    lineItem: string           // "Rubrique" | "Line Item"
    opening: string            // "Bilan d'ouverture" | "Opening Balance"
    total: string              // "Total" | "Total"
    requirements: string       // "Emplois" | "Requirements"
    resources: string          // "Ressources" | "Resources"
    balance: string            // "Solde" | "Balance"
  }

  // ── Revenue section ───────────────────────────────────────────────────────
  revenue: {
    totalTurnover: string      // "Chiffre d'affaires total"
    directSales: string        // "Ventes directes"
    indirectSales: string      // "Ventes indirectes"
    exportSales: string        // "Export Europe / International"
    cogs: string               // "Coût des marchandises vendues"
    grossMargin: string        // "Marge brute"
    grossMarginPct: string     // "Taux de marge brute"
    unitSales: string          // "Volume (unités)"
  }

  // ── P&L section ───────────────────────────────────────────────────────────
  pnl: {
    rows: {
      sales: string            // "Chiffre d'affaires"
      exportSalesMemo: string  // "dont Export (mémo)"
      cogs: string             // "Achats et charges directes"
      externalExpenses: string // "Charges externes"
      addedValue: string       // "Valeur ajoutée"
      taxesAndDuties: string   // "Impôts et taxes"
      payrollExpenses: string  // "Charges de personnel"
      ebitda: string           // "Excédent brut d'exploitation (EBE)"
      depreciation: string     // "Dotations aux amortissements"
      otherOperatingExp: string// "Autres charges d'exploitation"
      ebit: string             // "Résultat d'exploitation"
      financialExpenses: string// "Charges financières nettes"
      preTaxEarnings: string   // "Résultat courant avant impôt"
      corporateTax: string     // "Impôt sur les sociétés"
      netProfit: string        // "Résultat net"
      cashFlow: string         // "Capacité d'autofinancement (CAF)"
    }
  }

  // ── SIG / CAF section ─────────────────────────────────────────────────────
  sig: {
    addedValue: string         // "Valeur ajoutée"
    ebitda: string             // "EBE"
    ebit: string               // "Résultat d'exploitation"
    ebt: string                // "Résultat courant avant impôt"
    netProfit: string          // "Résultat net"
    caf: string                // "CAF"
    cafNote: string            // "= Résultat net + Dotations"
  }

  // ── Ratios d'exploitation ─────────────────────────────────────────────────
  ratiosOp: {
    sales: string
    salesGrowth: string
    grossMarginPct: string
    ebitdaPct: string
    ebitPct: string
    netProfitPct: string
    headcount: string
    salesPerStaff: string
    capex: string
  }

  // ── Breakeven ─────────────────────────────────────────────────────────────
  breakeven: {
    title: string
    fixedCosts: string
    variableCosts: string
    variableCostPct: string
    contributionMargin: string
    contributionPct: string
    breakevenRevenue: string
    breakevenNote: string
  }

  // ── WCR section ───────────────────────────────────────────────────────────
  wcr: {
    customers: string          // "Créances clients"
    inventory: string          // "Stocks"
    suppliers: string          // "Dettes fournisseurs"
    fiscalSocial: string       // "Dettes fiscales et sociales"
    netWcr: string             // "BFR net"
    dsoDays: string            // "DSO (jours)"
    dpoDays: string            // "DPO (jours)"
    dioDays: string            // "DIO (jours)"
  }

  // ── FiPlan / Funding ──────────────────────────────────────────────────────
  fiplan: {
    requirements: {
      title: string            // "Emplois"
      capex: string            // "Investissements"
      wcrChange: string        // "Variation du BFR"
      loanRepayments: string   // "Remboursements d'emprunts"
      negativeCashFlow: string // "Déficit de trésorerie"
      dividends: string        // "Dividendes versés"
      total: string            // "Total des emplois"
    }
    resources: {
      title: string            // "Ressources"
      capitalIncrease: string  // "Augmentation de capital"
      ltLoans: string          // "Emprunts à long terme"
      positiveCashFlow: string // "Excédent de trésorerie"
      subsidies: string        // "Subventions"
      total: string            // "Total des ressources"
    }
    balance: {
      title: string            // "Solde"
      annualBalance: string    // "Solde annuel"
      cumulativeCash: string   // "Trésorerie cumulée"
    }
  }

  // ── Cash flow statement ───────────────────────────────────────────────────
  cashflow: {
    operatingFlows: string     // "Flux de trésorerie opérationnels"
    netProfit: string          // "Résultat net"
    depreciation: string       // "Dotations aux amortissements"
    wcrChange: string          // "Variation du BFR"
    investingFlows: string     // "Flux d'investissement"
    capex: string              // "Investissements"
    financingFlows: string     // "Flux de financement"
    capitalIncrease: string    // "Augmentation de capital"
    newLoansAndGrants: string  // "Nouveaux emprunts et subventions"
    loanRepayments: string     // "Remboursements d'emprunts"
    dividends: string          // "Dividendes versés"
    netChange: string          // "Variation nette de trésorerie"
    cumulativeCash: string     // "Trésorerie cumulée"
  }

  // ── Balance Sheet ─────────────────────────────────────────────────────────
  bsheet: {
    assets: string             // "Actif"
    liabilities: string        // "Passif"
    noncurrentAssets: string   // "Immobilisations nettes"
    currentAssets: string      // "Actif circulant"
    cash: string               // "Trésorerie"
    totalAssets: string        // "Total actif"
    equity: string             // "Capitaux propres"
    longTermDebt: string       // "Dettes financières long terme"
    shortTermDebt: string      // "Dettes court terme"
    totalLiabilities: string   // "Total passif"
  }

  // ── Ratios de structure ───────────────────────────────────────────────────
  ratiosSt: {
    totalEquity: string        // "Capitaux propres"
    ltLoans: string            // "Dettes LT"
    wcrDays: string            // "BFR (jours de CA)"
    cashAtEoy: string          // "Trésorerie fin de période"
    npv: string                // "VAN"
    irr: string                // "TRI"
    terminalValue: string      // "Valeur terminale"
  }

  // ── Synthesis ─────────────────────────────────────────────────────────────
  synthesis: {
    title: string              // "Synthèse des indicateurs clés"
    keyMetrics: string         // "Indicateurs clés"
    year: string               // "Année"
    sales: string
    ebitdaPct: string
    netProfitPct: string
    cashFlow: string
    cashAtEoy: string
    headcount: string
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// French labels
// ─────────────────────────────────────────────────────────────────────────────
const FR: ReportLabels = {
  meta: {
    reportTitle:  'Dossier Prévisionnel',
    generatedOn:  'Généré le',
    confidential: 'Document confidentiel',
    currency:     'Devise',
    unit:         'Unité',
    unitK:        'k€',
    page:         'Page',
    of:           'sur',
    year:         'Année',
  },
  toc: {
    title: 'Sommaire',
    sections: [
      'Investissements et financements',
      "Chiffre d'affaires",
      'Charges de personnel',
      'Frais généraux',
      'Compte de résultat',
      'Soldes intermédiaires de gestion / CAF',
      "Ratios d'exploitation",
      'Seuil de rentabilité',
      'Besoin en fonds de roulement (BFR)',
      'Plan de financement',
      'État de trésorerie',
      'Bilan prévisionnel',
      'Ratios de structure',
      'Synthèse',
    ],
  },
  sections: {
    investment: 'Investissements et financements',
    revenue:    "Chiffre d'affaires",
    payroll:    'Charges de personnel',
    overhead:   'Frais généraux',
    pnl:        'Compte de résultat',
    sig:        'Soldes intermédiaires de gestion',
    caf:        "Capacité d'autofinancement",
    ratiosOp:   "Ratios d'exploitation",
    breakeven:  'Seuil de rentabilité',
    wcr:        'Besoin en fonds de roulement (BFR)',
    fiplan:     'Plan de financement',
    cashflow:   'État de trésorerie',
    bsheet:     'Bilan prévisionnel',
    ratiosSt:   'Ratios de structure',
    synthesis:  'Synthèse',
  },
  table: {
    lineItem:     'Rubrique',
    opening:      "Bilan d'ouverture",
    total:        'Total',
    requirements: 'Emplois',
    resources:    'Ressources',
    balance:      'Solde',
  },
  revenue: {
    totalTurnover:  "Chiffre d'affaires total",
    directSales:    'Ventes directes',
    indirectSales:  'Ventes indirectes',
    exportSales:    'Export Europe / International',
    cogs:           'Coût des marchandises vendues',
    grossMargin:    'Marge brute',
    grossMarginPct: 'Taux de marge brute',
    unitSales:      'Volume (unités)',
  },
  pnl: {
    rows: {
      sales:             "Chiffre d'affaires",
      exportSalesMemo:   'dont Export (mémo)',
      cogs:              'Achats et charges directes',
      externalExpenses:  'Charges externes',
      addedValue:        'Valeur ajoutée',
      taxesAndDuties:    'Impôts et taxes',
      payrollExpenses:   'Charges de personnel',
      ebitda:            "Excédent brut d'exploitation (EBE)",
      depreciation:      'Dotations aux amortissements',
      otherOperatingExp: "Autres charges d'exploitation",
      ebit:              "Résultat d'exploitation",
      financialExpenses: 'Charges financières nettes',
      preTaxEarnings:    'Résultat courant avant impôt',
      corporateTax:      'Impôt sur les sociétés',
      netProfit:         'Résultat net',
      cashFlow:          "Capacité d'autofinancement (CAF)",
    },
  },
  sig: {
    addedValue: 'Valeur ajoutée',
    ebitda:     "Excédent brut d'exploitation (EBE)",
    ebit:       "Résultat d'exploitation",
    ebt:        'Résultat courant avant impôt',
    netProfit:  'Résultat net',
    caf:        "Capacité d'autofinancement",
    cafNote:    '= Résultat net + Dotations aux amortissements',
  },
  ratiosOp: {
    sales:          "Chiffre d'affaires",
    salesGrowth:    'Croissance du CA',
    grossMarginPct: 'Taux de marge brute',
    ebitdaPct:      "Taux d'EBE",
    ebitPct:        "Taux de résultat d'exploitation",
    netProfitPct:   'Taux de résultat net',
    headcount:      'Effectif (ETP)',
    salesPerStaff:  'CA par salarié',
    capex:          'Investissements',
  },
  breakeven: {
    title:              'Seuil de rentabilité',
    fixedCosts:         'Charges fixes',
    variableCosts:      'Charges variables',
    variableCostPct:    'Taux de charges variables',
    contributionMargin: 'Marge sur coût variable',
    contributionPct:    'Taux de marge sur coût variable',
    breakevenRevenue:   'Seuil de rentabilité',
    breakevenNote:      '= Charges fixes / Taux de marge sur coût variable',
  },
  wcr: {
    customers:   'Créances clients',
    inventory:   'Stocks',
    suppliers:   'Dettes fournisseurs',
    fiscalSocial:'Dettes fiscales et sociales',
    netWcr:      'BFR net',
    dsoDays:     'DSO (jours)',
    dpoDays:     'DPO (jours)',
    dioDays:     'DIO (jours)',
  },
  fiplan: {
    requirements: {
      title:           'Emplois',
      capex:           'Investissements',
      wcrChange:       'Variation du BFR',
      loanRepayments:  'Remboursements d\'emprunts',
      negativeCashFlow:'Déficit de trésorerie',
      dividends:       'Dividendes versés',
      total:           'Total des emplois',
    },
    resources: {
      title:           'Ressources',
      capitalIncrease: 'Augmentation de capital',
      ltLoans:         'Emprunts long terme',
      positiveCashFlow:'Excédent de trésorerie',
      subsidies:       'Subventions reçues',
      total:           'Total des ressources',
    },
    balance: {
      title:          'Solde',
      annualBalance:  'Solde annuel',
      cumulativeCash: 'Trésorerie cumulée',
    },
  },
  cashflow: {
    operatingFlows:  'Flux de trésorerie opérationnels',
    netProfit:       'Résultat net',
    depreciation:    'Dotations aux amortissements',
    wcrChange:       'Variation du BFR',
    investingFlows:  "Flux d'investissement",
    capex:           'Investissements',
    financingFlows:  'Flux de financement',
    capitalIncrease: 'Augmentation de capital',
    newLoansAndGrants:'Nouveaux emprunts et subventions',
    loanRepayments:  'Remboursements d\'emprunts',
    dividends:       'Dividendes versés',
    netChange:       'Variation nette de trésorerie',
    cumulativeCash:  'Trésorerie cumulée',
  },
  bsheet: {
    assets:          'Actif',
    liabilities:     'Passif',
    noncurrentAssets:'Immobilisations nettes',
    currentAssets:   'Actif circulant',
    cash:            'Trésorerie',
    totalAssets:     'Total actif',
    equity:          'Capitaux propres',
    longTermDebt:    'Dettes financières long terme',
    shortTermDebt:   'Dettes court terme',
    totalLiabilities:'Total passif',
  },
  ratiosSt: {
    totalEquity:   'Capitaux propres',
    ltLoans:       'Dettes long terme',
    wcrDays:       'BFR (jours de CA)',
    cashAtEoy:     'Trésorerie fin de période',
    npv:           'VAN (valeur actuelle nette)',
    irr:           'TRI (taux de rentabilité interne)',
    terminalValue: 'Valeur terminale',
  },
  synthesis: {
    title:        'Synthèse des indicateurs clés',
    keyMetrics:   'Indicateurs clés',
    year:         'Année',
    sales:        "Chiffre d'affaires",
    ebitdaPct:    "Taux d'EBE",
    netProfitPct: 'Taux de résultat net',
    cashFlow:     "Capacité d'autofinancement",
    cashAtEoy:    'Trésorerie fin de période',
    headcount:    'Effectif (ETP)',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// English labels
// ─────────────────────────────────────────────────────────────────────────────
const EN: ReportLabels = {
  meta: {
    reportTitle:  'Business Plan',
    generatedOn:  'Generated on',
    confidential: 'Confidential document',
    currency:     'Currency',
    unit:         'Unit',
    unitK:        'k€',
    page:         'Page',
    of:           'of',
    year:         'Year',
  },
  toc: {
    title: 'Table of Contents',
    sections: [
      'Investment & Funding Plan',
      'Revenue Summary',
      'Payroll',
      'Overheads',
      'P&L Statement',
      'Gross Margin / Cash Flow',
      'Operating Ratios',
      'Break-Even Analysis',
      'Working Capital Requirement (WCR)',
      'Funding Plan',
      'Cash Flow Statement',
      'Balance Sheet',
      'Financial Ratios',
      'Executive Summary',
    ],
  },
  sections: {
    investment: 'Investment & Funding Plan',
    revenue:    'Revenue Summary',
    payroll:    'Payroll',
    overhead:   'Overheads',
    pnl:        'P&L Statement',
    sig:        'Gross Margin Analysis',
    caf:        'Self-Financing Capacity',
    ratiosOp:   'Operating Ratios',
    breakeven:  'Break-Even Analysis',
    wcr:        'Working Capital Requirement (WCR)',
    fiplan:     'Funding Plan',
    cashflow:   'Cash Flow Statement',
    bsheet:     'Balance Sheet',
    ratiosSt:   'Financial Ratios',
    synthesis:  'Executive Summary',
  },
  table: {
    lineItem:     'Line Item',
    opening:      'Opening Balance',
    total:        'Total',
    requirements: 'Requirements',
    resources:    'Resources',
    balance:      'Balance',
  },
  revenue: {
    totalTurnover:  'Total Revenue',
    directSales:    'Direct Sales',
    indirectSales:  'Indirect Sales',
    exportSales:    'Export / International Sales',
    cogs:           'Cost of Goods Sold (COGS)',
    grossMargin:    'Gross Margin',
    grossMarginPct: 'Gross Margin %',
    unitSales:      'Unit Sales Volume',
  },
  pnl: {
    rows: {
      sales:             'Sales (Revenue)',
      exportSalesMemo:   'Export Sales (memo)',
      cogs:              'COGS',
      externalExpenses:  'External Expenses',
      addedValue:        'Added Value',
      taxesAndDuties:    'Taxes & Duties',
      payrollExpenses:   'Payroll Expenses',
      ebitda:            'EBITDA',
      depreciation:      'Depreciation',
      otherOperatingExp: 'Other Operating Expenses',
      ebit:              'EBIT',
      financialExpenses: 'Financial Expenses',
      preTaxEarnings:    'Pre-Tax Earnings',
      corporateTax:      'Corporate Tax',
      netProfit:         'Net Profit',
      cashFlow:          'Cash Flow (Self-Financing)',
    },
  },
  sig: {
    addedValue: 'Added Value',
    ebitda:     'EBITDA',
    ebit:       'EBIT',
    ebt:        'Pre-Tax Earnings',
    netProfit:  'Net Profit',
    caf:        'Self-Financing Capacity',
    cafNote:    '= Net Profit + Depreciation',
  },
  ratiosOp: {
    sales:          'Sales',
    salesGrowth:    'Revenue Growth',
    grossMarginPct: 'Gross Margin %',
    ebitdaPct:      'EBITDA %',
    ebitPct:        'EBIT %',
    netProfitPct:   'Net Profit %',
    headcount:      'Headcount (FTE)',
    salesPerStaff:  'Revenue / Staff',
    capex:          'CapEx',
  },
  breakeven: {
    title:              'Break-Even Analysis',
    fixedCosts:         'Fixed Costs',
    variableCosts:      'Variable Costs',
    variableCostPct:    'Variable Cost Rate',
    contributionMargin: 'Contribution Margin',
    contributionPct:    'Contribution Margin %',
    breakevenRevenue:   'Break-Even Revenue',
    breakevenNote:      '= Fixed Costs / Contribution Margin %',
  },
  wcr: {
    customers:   'Trade Receivables',
    inventory:   'Inventory',
    suppliers:   'Trade Payables',
    fiscalSocial:'Tax & Social Payables',
    netWcr:      'Net WCR',
    dsoDays:     'DSO (days)',
    dpoDays:     'DPO (days)',
    dioDays:     'DIO (days)',
  },
  fiplan: {
    requirements: {
      title:           'Requirements',
      capex:           'Capital Expenditure',
      wcrChange:       'WCR Change',
      loanRepayments:  'Loan Repayments',
      negativeCashFlow:'Cash Deficit',
      dividends:       'Dividends Paid',
      total:           'Total Requirements',
    },
    resources: {
      title:           'Resources',
      capitalIncrease: 'Capital Increase',
      ltLoans:         'Long-Term Loans',
      positiveCashFlow:'Cash Surplus',
      subsidies:       'Subsidies & Grants',
      total:           'Total Resources',
    },
    balance: {
      title:          'Balance',
      annualBalance:  'Annual Balance',
      cumulativeCash: 'Cumulative Cash',
    },
  },
  cashflow: {
    operatingFlows:  'Operating Cash Flow',
    netProfit:       'Net Profit',
    depreciation:    'Depreciation',
    wcrChange:       'WCR Change',
    investingFlows:  'Investing Cash Flow',
    capex:           'Capital Expenditure',
    financingFlows:  'Financing Cash Flow',
    capitalIncrease: 'Capital Increase',
    newLoansAndGrants:'New Loans & Grants',
    loanRepayments:  'Loan Repayments',
    dividends:       'Dividends',
    netChange:       'Net Change in Cash',
    cumulativeCash:  'Cumulative Cash',
  },
  bsheet: {
    assets:          'Assets',
    liabilities:     'Liabilities & Equity',
    noncurrentAssets:'Non-Current Assets',
    currentAssets:   'Current Assets',
    cash:            'Cash',
    totalAssets:     'Total Assets',
    equity:          'Equity',
    longTermDebt:    'Long-Term Debt',
    shortTermDebt:   'Short-Term Liabilities',
    totalLiabilities:'Total Liabilities & Equity',
  },
  ratiosSt: {
    totalEquity:   'Total Equity',
    ltLoans:       'Long-Term Loans',
    wcrDays:       'WCR (days of revenue)',
    cashAtEoy:     'Cash at End of Year',
    npv:           'NPV (Net Present Value)',
    irr:           'IRR (Internal Rate of Return)',
    terminalValue: 'Terminal Value',
  },
  synthesis: {
    title:        'Executive Summary — Key Indicators',
    keyMetrics:   'Key Metrics',
    year:         'Year',
    sales:        'Revenue',
    ebitdaPct:    'EBITDA %',
    netProfitPct: 'Net Profit %',
    cashFlow:     'Self-Financing Capacity',
    cashAtEoy:    'Cash at End of Year',
    headcount:    'Headcount (FTE)',
  },
}

/**
 * Returns the label set for the given language.
 * Defaults to French if an unknown language code is provided.
 */
export function getLabels(lang: ReportLanguage | string | undefined): ReportLabels {
  return lang === 'en' ? EN : FR
}
