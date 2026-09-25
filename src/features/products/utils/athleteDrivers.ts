/**
 * Pure helpers for the athlete drivers (competition and contract).
 *
 * They mirror the backend formulas (internal/compute/athlete_drivers.go) so
 * the forms can show prize money, costs and contract revenue while the user
 * types, and warn about impossible results before the backend rejects them.
 */
import type { CompetitionParams, ContractParams, Product } from '@/types'

export const YEARS = [0, 1, 2, 3, 4] as const

const num = (v: string | number | undefined | null): number => {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

export type CircuitRegion = 'europe' | 'us'

/** A tour's average prize economics, used to pre-fill a year. */
export interface CircuitPreset {
  id: string
  region: CircuitRegion
  name: string
  prizePerWin: string
  prizePerTop10: string
  prizePerCut: string
}

/**
 * Golf tour presets, in euros: average winner's cheque, average top-10
 * cheque (wins excluded) and average cheque for another cut made. Starting
 * points only; every value stays editable.
 *
 * Europe (ladder: Alps → Challenge → DP World Tour): Alps Tour from a full
 * 2026 season of official results; Challenge and DP World Tour from
 * published 2026 purses.
 *
 * United States (ladder: PGA Tour Americas → Korn Ferry → PGA Tour): all
 * three pay on the PGA Tour distribution (winner 18 %, 2nd–10th 42.05 %,
 * 11th–70th 39.95 %), so a top 10 averages 4.67 % of the purse and another
 * cut 0.67 %. 2026 purses: PGA Tour Americas $225K, Korn Ferry Tour $1.0M
 * (minimum; playoffs $1.5M), PGA Tour full-field events ~$9M (signature
 * events, $20M, not included). Converted at 1 EUR = 1.1389 USD
 * (25 Sept 2026) and rounded.
 */
export const CIRCUIT_PRESETS: CircuitPreset[] = [
  { id: 'alps',      region: 'europe', name: 'Alps Tour',         prizePerWin: '7455',    prizePerTop10: '1647',   prizePerCut: '692' },
  { id: 'challenge', region: 'europe', name: 'Challenge Tour',    prizePerWin: '45000',   prizePerTop10: '12000',  prizePerCut: '2500' },
  { id: 'dpworld',   region: 'europe', name: 'DP World Tour',     prizePerWin: '380000',  prizePerTop10: '90000',  prizePerCut: '12000' },
  { id: 'americas',  region: 'us',     name: 'PGA Tour Americas', prizePerWin: '35600',   prizePerTop10: '9230',   prizePerCut: '1320' },
  { id: 'kornferry', region: 'us',     name: 'Korn Ferry Tour',   prizePerWin: '158000',  prizePerTop10: '41000',  prizePerCut: '5850' },
  { id: 'pgatour',   region: 'us',     name: 'PGA Tour',          prizePerWin: '1420000', prizePerTop10: '369000', prizePerCut: '52600' },
]

export function defaultCompetition(): CompetitionParams {
  const s = (v: string) => [v, v, v, v, v] as [string, string, string, string, string]
  const n = (v: number) => [v, v, v, v, v] as [number, number, number, number, number]
  const alps = CIRCUIT_PRESETS[0]!
  return {
    circuit: s(alps.name),
    events: n(20),
    cuts: n(12),
    top10s: n(3),
    wins: n(1),
    prizePerWin: s(alps.prizePerWin),
    prizePerTop10: s(alps.prizePerTop10),
    prizePerCut: s(alps.prizePerCut),
    otherPrizeMoney: s('0'),
    entryFeePerEvent: s('350'),
    travelPerEvent: s('1100'),
    caddieFeePerEvent: s('0'),
    caddieShare: s('0'),
    coachAnnualFee: s('0'),
    coachShare: s('0'),
  }
}

/**
 * Brings parameters saved by earlier versions of the driver to the current
 * shape: a missing coach annual fee becomes 0, and a legacy coach fee per
 * event is folded into the annual fee (fee × events) so its cost is kept.
 * Returns the input unchanged when there is nothing to convert.
 */
export function normalizeCompetition(p: CompetitionParams): CompetitionParams {
  if (p.coachAnnualFee && !p.coachFeePerEvent) return p
  const { coachFeePerEvent, ...rest } = p
  const annual = YEARS.map((y) =>
    String(num(p.coachAnnualFee?.[y]) + num(coachFeePerEvent?.[y]) * num(p.events[y])),
  ) as CompetitionParams['coachAnnualFee']
  return { ...rest, coachAnnualFee: annual }
}

export function defaultContract(): ContractParams {
  return { contracts: [emptyContract()] }
}

export function emptyContract(): ContractParams['contracts'][number] {
  return { partner: '', amounts: ['0', '0', '0', '0', '0'], bonusPerWin: '0' }
}

/** Cuts made that are neither a win nor a top-10 finish. */
export function ordinaryCuts(p: CompetitionParams, y: number): number {
  return Math.max(0, num(p.cuts[y]) - num(p.wins[y]) - num(p.top10s[y]))
}

/** Prize money for year index y (0-based), including other prize money. */
export function competitionGains(p: CompetitionParams, y: number): number {
  return (
    num(p.wins[y]) * num(p.prizePerWin[y]) +
    num(p.top10s[y]) * num(p.prizePerTop10[y]) +
    ordinaryCuts(p, y) * num(p.prizePerCut[y]) +
    num(p.otherPrizeMoney[y])
  )
}

/**
 * Direct costs for year y: per-event fees (entry, travel, caddie), the
 * coach's annual fee, and the caddie's and coach's shares of winnings.
 */
export function competitionCosts(p: CompetitionParams, y: number): number {
  const perEvent =
    num(p.entryFeePerEvent[y]) + num(p.travelPerEvent[y]) + num(p.caddieFeePerEvent[y]) +
    num(p.coachFeePerEvent?.[y]) // legacy, 0 once normalized
  const share = num(p.caddieShare[y]) + num(p.coachShare[y])
  return num(p.events[y]) * perEvent + num(p.coachAnnualFee?.[y]) + share * competitionGains(p, y)
}

/**
 * Problems in year y's results, as i18n keys with their parameters.
 * Mirrors CompetitionParams.Validate on the backend.
 */
export function competitionIssues(p: CompetitionParams, y: number): { key: string; params: Record<string, number> }[] {
  const issues: { key: string; params: Record<string, number> }[] = []
  const events = num(p.events[y]), cuts = num(p.cuts[y])
  const wt = num(p.wins[y]) + num(p.top10s[y])
  if (cuts > events) issues.push({ key: 'products.driver.competition.issue.cutsAboveEvents', params: { cuts, events } })
  if (wt > cuts) issues.push({ key: 'products.driver.competition.issue.winsAboveCuts', params: { count: wt, cuts } })
  if (num(p.caddieShare[y]) + num(p.coachShare[y]) > 1) {
    issues.push({ key: 'products.driver.competition.issue.sharesAboveOne', params: {} })
  }
  return issues
}

/** Total wins per year across the scenario's competition products. */
export function scenarioWins(products: Pick<Product, 'driverType' | 'driverParams'>[]): number[] {
  const wins = [0, 0, 0, 0, 0]
  for (const product of products) {
    if (product.driverType !== 'competition' || !product.driverParams) continue
    const p = product.driverParams as CompetitionParams
    YEARS.forEach((y) => { wins[y]! += num(p.wins?.[y]) })
  }
  return wins
}

/** Fixed contract value for year y. */
export function contractFixed(p: ContractParams, y: number): number {
  return p.contracts.reduce((sum, c) => sum + num(c.amounts[y]), 0)
}

/** Bonus for year y: wins × bonuses of the contracts active that year. */
export function contractBonus(p: ContractParams, y: number, wins: number): number {
  const perWin = p.contracts
    .filter((c) => num(c.amounts[y]) > 0)
    .reduce((sum, c) => sum + num(c.bonusPerWin), 0)
  return wins * perWin
}
