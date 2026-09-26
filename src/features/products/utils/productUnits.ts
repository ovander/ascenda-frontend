/**
 * productUnits — what one unit of a product's volume is, and how its price,
 * cost and volume are labelled.
 *
 * Service products bill in days and physical products sell in units, except
 * for the athlete drivers: the competition driver's volume is the number of
 * events played (price = average prize per event), the contract driver's is
 * one per year with a contract (price = the year's contract revenue).
 */
import type { DriverType } from '@/types'

export interface ProductUnits {
  /** Singular unit, for "€/…" (day, unit, event, year). */
  per: string
  /** Plural unit, as a volume suffix (days, units, events, years). */
  plural: string
  /** Capitalised plural, for column headers ("Total Events"). */
  heading: string
  priceLabel: string
  costLabel: string
  assumptionsTab: string
  volumesTab: string
}

const SERVICE: ProductUnits = {
  per: 'day', plural: 'days', heading: 'Days',
  priceLabel: 'Day Rate (Billing)', costLabel: 'Cost per Day (COGS)',
  assumptionsTab: 'Day Rate & Cost', volumesTab: 'Billable Days',
}
const PRODUCT: ProductUnits = {
  per: 'unit', plural: 'units', heading: 'Units',
  priceLabel: 'Base Unit Price', costLabel: 'Raw Material Cost',
  assumptionsTab: 'Key Assumptions', volumesTab: 'Sales Volumes',
}
const BY_DRIVER: Partial<Record<DriverType, ProductUnits>> = {
  competition: {
    per: 'event', plural: 'events', heading: 'Events',
    priceLabel: 'Average Prize per Event', costLabel: 'Cost per Event',
    assumptionsTab: 'Prize & Cost per Event', volumesTab: 'Events Played',
  },
  contract: {
    per: 'year', plural: 'years', heading: 'Contract Years',
    priceLabel: 'Contract Revenue', costLabel: 'Cost per Year',
    assumptionsTab: 'Contract Revenue', volumesTab: 'Contract Years',
  },
}

export function productUnits(driverType: DriverType | undefined, productType: string | undefined): ProductUnits {
  return (driverType && BY_DRIVER[driverType]) || (productType === 'service' ? SERVICE : PRODUCT)
}

/**
 * Heading for a volume summed over several products: their common unit, or
 * "Volume" when they count different things (days + events + contract years).
 */
export function commonVolumeHeading(products: { driverType?: DriverType; productType?: string }[]): string {
  const headings = new Set(products.map((p) => productUnits(p.driverType, p.productType).heading))
  if (headings.size === 1) return [...headings][0]!
  return products.length ? 'Volume' : PRODUCT.heading
}
