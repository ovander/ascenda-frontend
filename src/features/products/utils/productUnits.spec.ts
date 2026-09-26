import { describe, it, expect } from 'vitest'
import { commonVolumeHeading, productUnits } from './productUnits'

describe('productUnits', () => {
  it('keeps days for services and units for physical products', () => {
    expect(productUnits('generic', 'service')).toMatchObject({ per: 'day', plural: 'days', priceLabel: 'Day Rate (Billing)' })
    expect(productUnits('consulting', 'service')).toMatchObject({ per: 'day', volumesTab: 'Billable Days' })
    expect(productUnits('generic', 'product')).toMatchObject({ per: 'unit', plural: 'units', priceLabel: 'Base Unit Price' })
    expect(productUnits('industry', 'product')).toMatchObject({ per: 'unit' })
    expect(productUnits(undefined, undefined)).toMatchObject({ per: 'unit' })
  })

  it('counts events for prize money and contract years for contracts, whatever the product type', () => {
    expect(productUnits('competition', 'service')).toMatchObject({
      per: 'event', plural: 'events', heading: 'Events',
      priceLabel: 'Average Prize per Event', costLabel: 'Cost per Event', volumesTab: 'Events Played',
    })
    expect(productUnits('contract', 'service')).toMatchObject({
      per: 'year', plural: 'years', heading: 'Contract Years', priceLabel: 'Contract Revenue', assumptionsTab: 'Contract Revenue',
    })
  })
})

describe('commonVolumeHeading', () => {
  it('names the unit the products share', () => {
    expect(commonVolumeHeading([{ driverType: 'generic', productType: 'service' }, { driverType: 'consulting', productType: 'service' }])).toBe('Days')
    expect(commonVolumeHeading([{ driverType: 'generic', productType: 'product' }])).toBe('Units')
    expect(commonVolumeHeading([{ driverType: 'competition', productType: 'service' }])).toBe('Events')
  })

  it('says "Volume" when the products count different things', () => {
    // The golfer: events + contract years + appearance days.
    expect(commonVolumeHeading([
      { driverType: 'competition', productType: 'service' },
      { driverType: 'contract', productType: 'service' },
      { driverType: 'generic', productType: 'service' },
    ])).toBe('Volume')
    expect(commonVolumeHeading([{ productType: 'service' }, { productType: 'product' }])).toBe('Volume')
  })

  it('falls back to "Units" with no products', () => {
    expect(commonVolumeHeading([])).toBe('Units')
  })
})
