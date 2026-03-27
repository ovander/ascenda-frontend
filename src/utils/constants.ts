export const STAFF_CATEGORIES = [
  // R&D
  { key: 'rnd_engineers', label: 'R&D Engineers', function: 'rnd' },
  { key: 'rnd_product', label: 'Product Management', function: 'rnd' },
  // Production
  { key: 'prod_engineers', label: 'Production Engineers', function: 'production' },
  { key: 'prod_technicians', label: 'Production Technicians', function: 'production' },
  // Sales & Marketing
  { key: 'sales_team', label: 'Sales Team', function: 'sales_marketing' },
  { key: 'marketing_team', label: 'Marketing Team', function: 'sales_marketing' },
  { key: 'sales_customer_success', label: 'Customer Success', function: 'sales_marketing' },
  // G&A
  { key: 'admin_managers', label: 'Admin Managers', function: 'ga' },
  { key: 'admin_assistants', label: 'Admin Assistants', function: 'ga' },
  { key: 'executive_team', label: 'Executive Team', function: 'ga' },
  { key: 'gna_finance', label: 'Finance & Accounting', function: 'ga' },
  { key: 'gna_hr', label: 'HR & People', function: 'ga' },
  { key: 'gna_it', label: 'IT & Infrastructure', function: 'ga' },
] as const

export const ASSET_CATEGORIES = [
  { key: 'land', label: 'Land', depreciable: false, defaultLife: 0 },
  { key: 'intangible_business', label: 'Intangible Business (Goodwill)', depreciable: false, defaultLife: 0 },
  { key: 'buildings', label: 'Buildings', depreciable: true, defaultLife: 10 },
  { key: 'setup_expenses', label: 'Setup Expenses', depreciable: true, defaultLife: 5 },
  { key: 'patents_trademarks', label: 'Patents & Trademarks', depreciable: true, defaultLife: 20 },
  { key: 'rnd_expenses', label: 'R&D Expenses', depreciable: true, defaultLife: 4 },
  { key: 'other_intangible', label: 'Other Intangible', depreciable: true, defaultLife: 4 },
  { key: 'prototypes', label: 'Prototypes', depreciable: true, defaultLife: 5 },
  { key: 'equipment_tools', label: 'Equipment & Tools', depreciable: true, defaultLife: 5 },
  { key: 'office_furniture', label: 'Office Furniture', depreciable: true, defaultLife: 5, staffLinked: true },
  { key: 'computer_hw_sw', label: 'Computer HW/SW', depreciable: true, defaultLife: 3, staffLinked: true },
  { key: 'vehicles', label: 'Vehicles', depreciable: true, defaultLife: 5 },
  { key: 'other_tangible', label: 'Other Tangible', depreciable: true, defaultLife: 4 },
  { key: 'financial', label: 'Financial Assets', depreciable: false, defaultLife: 0 },
] as const

export const GEO_ZONES = [
  { key: 'france', label: 'France' },
  { key: 'europe', label: 'Europe' },
  { key: 'export', label: 'Export' },
] as const

export const SALES_CHANNELS = [
  { key: 'direct', label: 'Direct' },
  { key: 'indirect', label: 'Indirect (Distributors)' },
] as const

export const MAX_YEARS = 5
export const MAX_MONTHS = 12
export const DEBOUNCE_MS = 300
export const REPORT_CACHE_TTL_MS = 30000
