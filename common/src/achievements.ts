export type RanksType = {
  creatorTraders: { rank: number | null; percentile: number | null }
  totalReferrals: { rank: number | null; percentile: number | null }
  totalReferredProfit: { rank: number | null; percentile: number | null }
  volume: { rank: number | null; percentile: number | null }
  trades: { rank: number | null; percentile: number | null }
  marketsCreated: { rank: number | null; percentile: number | null }
  comments: { rank: number | null; percentile: number | null }
  /** @deprecated league features removed */
  seasonsPlatinumOrHigher?: { rank: number | null; percentile: number | null }
  /** @deprecated league features removed */
  seasonsDiamondOrHigher?: { rank: number | null; percentile: number | null }
  /** @deprecated league features removed */
  seasonsMasters?: { rank: number | null; percentile: number | null }
  /** @deprecated league features removed */
  largestLeagueSeasonEarnings?: {
    rank: number | null
    percentile: number | null
  }
  liquidity: { rank: number | null; percentile: number | null }
  profitableMarkets: { rank: number | null; percentile: number | null }
  unprofitableMarkets: { rank: number | null; percentile: number | null }
  largestProfitableTrade: {
    rank: number | null
    percentile: number | null
  }
  largestUnprofitableTrade: {
    rank: number | null
    percentile: number | null
  }
  accountAge: { rank: number | null; percentile: number | null }
  /** @deprecated streak features removed */
  longestBettingStreak?: { rank: number | null; percentile: number | null }
  modTickets: { rank: number | null; percentile: number | null }
  charityDonated: { rank: number | null; percentile: number | null }
}
