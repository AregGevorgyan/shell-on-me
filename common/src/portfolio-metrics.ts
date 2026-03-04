export type PortfolioMetrics = {
  investmentValue: number
  balance: number
  totalDeposits: number
  loanTotal: number
  timestamp: number
  profit?: number
  userId: string
}
export type LivePortfolioMetrics = PortfolioMetrics & {
  dailyProfit: number
}
