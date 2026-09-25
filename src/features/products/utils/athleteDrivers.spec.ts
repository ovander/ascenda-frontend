import { describe, it, expect } from 'vitest'
import type { CompetitionParams, ContractParams } from '@/types'
import {
  CIRCUIT_PRESETS,
  competitionCosts,
  competitionGains,
  competitionIssues,
  contractBonus,
  contractFixed,
  defaultCompetition,
  normalizeCompetition,
  scenarioWins,
} from './athleteDrivers'

const s5 = (...v: (string | number)[]) => v.map(String) as [string, string, string, string, string]
const n5 = (...v: number[]) => v as [number, number, number, number, number]

// Medium scenario of the reference golf-professional forecast: Alps Tour,
// two Challenge Tour seasons, two DP World Tour seasons. The backend test
// (internal/compute/athlete_drivers_test.go) checks the same figures.
const medium: CompetitionParams = {
  circuit: s5('Alps Tour', 'Challenge Tour', 'Challenge Tour', 'DP World Tour', 'DP World Tour'),
  events: n5(21, 24, 26, 26, 28),
  cuts: n5(13, 14, 18, 15, 18),
  top10s: n5(3, 2, 5, 1, 3),
  wins: n5(4, 0, 1, 0, 0),
  prizePerWin: s5(7455, 45000, 45000, 380000, 380000),
  prizePerTop10: s5(1647, 12000, 12000, 90000, 90000),
  prizePerCut: s5(692, 2500, 2500, 12000, 12000),
  otherPrizeMoney: s5(1776.67, 2000, 3000, 0, 0),
  entryFeePerEvent: s5(350, 300, 300, 0, 0),
  travelPerEvent: s5(1100, 2200, 2300, 3800, 4000),
  caddieFeePerEvent: s5(0, 1200, 1300, 2000, 2200),
  caddieShare: s5(0, 0.07, 0.07, 0.08, 0.08),
  coachAnnualFee: s5(8000, 15000, 18000, 30000, 35000),
  coachShare: s5(0, 0, 0, 0, 0),
}

describe('competition helpers', () => {
  it('reproduce the reference prize money and direct costs, coach included', () => {
    const gains = [0, 1, 2, 3, 4].map((y) => competitionGains(medium, y))
    const costs = [0, 1, 2, 3, 4].map((y) => competitionCosts(medium, y))
    expect(gains.map((v) => v.toFixed(2))).toEqual(['40689.67', '56000.00', '138000.00', '258000.00', '450000.00'])
    // per-event costs (entry, travel, caddie) + the coach's annual fee
    expect(costs.map((v) => v.toFixed(2))).toEqual(['38450.00', '107720.00', '129060.00', '201440.00', '244600.00'])
  })

  it('costs the coach as an annual fee plus a share of winnings, the caddie per event', () => {
    const p: CompetitionParams = { ...defaultCompetition(), events: n5(10, 0, 0, 0, 0), cuts: n5(5, 0, 0, 0, 0),
      top10s: n5(0, 0, 0, 0, 0), wins: n5(1, 0, 0, 0, 0), prizePerWin: s5(40000, 0, 0, 0, 0), prizePerCut: s5(2000, 0, 0, 0, 0),
      entryFeePerEvent: s5(0, 0, 0, 0, 0), travelPerEvent: s5(0, 0, 0, 0, 0),
      caddieFeePerEvent: s5(1000, 0, 0, 0, 0), caddieShare: s5(0.07, 0, 0, 0, 0),
      coachAnnualFee: s5(12000, 0, 0, 0, 0), coachShare: s5(0.05, 0, 0, 0, 0) }
    expect(competitionGains(p, 0)).toBe(48000)
    // caddie 10 × 1 000, coach 12 000 for the year, shares 12 % × 48 000
    expect(competitionCosts(p, 0)).toBeCloseTo(10000 + 12000 + 5760, 6)
  })

  it('reports impossible results with the backend rules', () => {
    const p: CompetitionParams = { ...medium, events: n5(10, 24, 26, 26, 28), cuts: n5(12, 14, 18, 15, 18) }
    expect(competitionIssues(p, 0).map((i) => i.key)).toEqual(['products.driver.competition.issue.cutsAboveEvents'])
    expect(competitionIssues(medium, 0)).toEqual([])
    const shares: CompetitionParams = { ...medium, caddieShare: s5(0.6, 0, 0, 0, 0), coachShare: s5(0.5, 0, 0, 0, 0) }
    expect(competitionIssues(shares, 0).map((i) => i.key)).toContain('products.driver.competition.issue.sharesAboveOne')
  })

  it('ships the European and US golf tour ladders', () => {
    const byRegion = (r: string) => CIRCUIT_PRESETS.filter((p) => p.region === r).map((p) => p.name)
    expect(byRegion('europe')).toEqual(['Alps Tour', 'Challenge Tour', 'DP World Tour'])
    expect(byRegion('us')).toEqual(['PGA Tour Americas', 'Korn Ferry Tour', 'PGA Tour'])
  })

  it('derive the US presets from the PGA Tour payout split', () => {
    // winner 18 %, top 10 average 42.05 % / 9, other cut average 39.95 % / 60, at 1 EUR = 1.1389 USD
    const eur = (usd: number) => usd / 1.1389
    const expected = (purse: number) => [0.18 * purse, (0.4205 / 9) * purse, (0.3995 / 60) * purse].map(eur)
    for (const [id, purse] of [['americas', 225_000], ['kornferry', 1_000_000], ['pgatour', 9_000_000]] as const) {
      const p = CIRCUIT_PRESETS.find((c) => c.id === id)!
      const got = [p.prizePerWin, p.prizePerTop10, p.prizePerCut].map(Number)
      expected(purse).forEach((v, i) => expect(Math.abs(got[i]! - v) / v).toBeLessThan(0.01))
    }
  })

  it('fold a legacy coach fee per event into the annual fee', () => {
    const legacy = { ...medium, coachAnnualFee: undefined, coachFeePerEvent: s5(500, 0, 0, 0, 0) } as unknown as CompetitionParams
    const normalized = normalizeCompetition(legacy)
    expect(normalized.coachAnnualFee).toEqual(['10500', '0', '0', '0', '0']) // 21 events × 500
    expect(normalized.coachFeePerEvent).toBeUndefined()
    expect(competitionCosts(normalized, 0)).toBeCloseTo(competitionCosts(legacy, 0), 6)
    expect(normalizeCompetition(medium)).toBe(medium) // current shape is returned as is
  })
})

describe('contract helpers', () => {
  const sponsoring: ContractParams = {
    contracts: [
      { partner: 'Main sponsor', amounts: s5(0, 6000, 6000, 30000, 50000), bonusPerWin: '1000' },
      { partner: 'Club', amounts: s5(0, 4000, 4000, 5000, 5000), bonusPerWin: '0' },
      { partner: 'National sponsor', amounts: s5(0, 0, 0, 10000, 30000), bonusPerWin: '1000' },
    ],
  }

  it('pay the bonus only on contracts active that year', () => {
    const wins = n5(4, 0, 1, 0, 0)
    const total = [0, 1, 2, 3, 4].map((y) => contractFixed(sponsoring, y) + contractBonus(sponsoring, y, wins[y]!))
    // Year 1: 4 wins but no active contract; year 3: 1 win, only the main sponsor is active.
    expect(total).toEqual([0, 10000, 11000, 45000, 85000])
  })

  it('sum the wins of every competition product in the scenario', () => {
    const products = [
      { driverType: 'competition' as const, driverParams: { ...medium, wins: n5(1, 2, 0, 0, 0) } },
      { driverType: 'competition' as const, driverParams: { ...medium, wins: n5(0, 1, 0, 0, 3) } },
      { driverType: 'contract' as const, driverParams: sponsoring },
      { driverType: 'competition' as const, driverParams: null },
    ]
    expect(scenarioWins(products)).toEqual([1, 3, 0, 0, 3])
  })
})
