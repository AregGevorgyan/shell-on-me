import {
  SupabaseDirectClient,
  createSupabaseDirectClient,
} from 'shared/supabase/init'
import { ManaSupply } from 'common/stats'
import { chunk } from 'lodash'
import { log } from 'shared/utils'
import { DAY_MS } from 'common/util/time'
import { millisToTs } from 'common/supabase/utils'
import { updateUserPortfolioHistoriesCore } from './update-user-portfolio-histories-core'

export const recalculateAllUserPortfolios = async (
  pg: SupabaseDirectClient
) => {
  const allUserIdsWithInvestments = await pg.map(
    `
        select distinct u.id from users u
         join user_contract_metrics ucm on u.id = ucm.user_id
         join contracts c on ucm.contract_id = c.id
        where u.data->'lastBetTime' is not null
        and c.resolution_time is null;
    `,
    [],
    (r) => r.id as string
  )
  const chunks = chunk(allUserIdsWithInvestments, 500)
  let processed = 0
  const attemptsPerChunk: number[] = new Array(chunks.length).fill(0)
  const skippedChunks: number[] = []

  for (let i = 0; i < chunks.length; i++) {
    const userIds = chunks[i]
    let success = false
    let attempts = 0
    const maxAttemptsPerChunk = 3

    while (!success && attempts < maxAttemptsPerChunk) {
      try {
        await updateUserPortfolioHistoriesCore(userIds)
        success = true
        processed += userIds.length
        attemptsPerChunk[i] = attempts + 1
        log(
          `Processed chunk ${i + 1}/${chunks.length} (${processed} of ${
            allUserIdsWithInvestments.length
          } users) in ${attempts + 1} attempts`
        )
      } catch (error: any) {
        attempts++
        if (attempts === maxAttemptsPerChunk) {
          attemptsPerChunk[i] = attempts
          skippedChunks.push(i)
          log(
            `Skipping chunk ${i + 1}/${
              chunks.length
            } after ${maxAttemptsPerChunk} failed attempts. Error: ${
              error.message
            }`
          )
          break // Skip to next chunk
        }
        log(
          `Chunk ${i + 1}/${
            chunks.length
          }: Attempt ${attempts} failed, retrying... Error: ${error.message}`
        )
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempts))
      }
    }
  }

  const totalAttempts = attemptsPerChunk.reduce(
    (sum, attempts) => sum + attempts,
    0
  )
  const avgAttempts = totalAttempts / chunks.length
  log(
    `Completed processing. Results:\n` +
      `- Processed ${processed} of ${allUserIdsWithInvestments.length} users\n` +
      `- Average attempts per chunk: ${avgAttempts.toFixed(2)}\n` +
      `- Skipped chunks: ${skippedChunks.length} (${(
        (skippedChunks.length / chunks.length) *
        100
      ).toFixed(1)}%)`
  )
  if (skippedChunks.length > 0) {
    log(`Skipped chunk numbers: ${skippedChunks.map((i) => i + 1).join(', ')}`)
  }
}

// note this is missing amm liquidity
export const getManaSupplyEachDayBetweeen = async (
  pg: SupabaseDirectClient,
  startDate: number,
  numberOfDays: number
) => {
  const results = []

  for (let day = 0; day < numberOfDays; day++) {
    const start = startDate + day * DAY_MS
    const end = start + DAY_MS

    const filter = `filter (where (balance + investment_value > 0))`

    // claude generated - takes advantage of users table being much smaller than user_portfolio_history
    // this isn't strictly the same as getManaSupply since that uses the real user balances and gets the AMM liquidity. don't backfill more than you must.
    const userPortfolio = await pg.one(
      `with last_history as (
        select uph.* from
        users u left join lateral (
          select *
          from user_portfolio_history
          where user_id = u.id and ts <= millis_to_ts($1)
          order by ts desc
          limit 1
        ) uph on true
      )
      select
        sum(balance) ${filter} as mana_balance,
        sum(investment_value) ${filter} as mana_investment_value,
        sum(loan_total) ${filter} as loan_total
      from last_history
      where balance + investment_value > 0;
      `,
      [end],
      (r: any) => ({
        day: millisToTs(start),
        totalManaValue: r.mana_balance + r.mana_investment_value,
        manaBalance: r.mana_balance,
        manaInvestmentValue: r.mana_investment_value,
        loanTotal: r.loan_total,
      })
    )
    results.push(userPortfolio)
    console.log('fetched results for ', millisToTs(start))
  }
  return results
}

export const getManaSupply = async (pg: SupabaseDirectClient) => {
  const positiveFilter = `filter (where (u.balance + uphl.investment_value) > 0.0)`

  const userPortfolio = await pg.one(
    `select
      sum(greatest(0, u.balance + uphl.investment_value)) as total_mana_value,
      sum(u.balance) ${positiveFilter} as mana_balance,
      sum(uphl.investment_value) ${positiveFilter} as mana_investment_value,
      sum(uphl.loan_total) ${positiveFilter} as loan_total
    from users u
    left join user_portfolio_history_latest uphl on u.id = uphl.user_id`,
    undefined,
    (r: any) => ({
      totalManaValue: r.total_mana_value,
      manaBalance: r.mana_balance,
      manaInvestmentValue: r.mana_investment_value,
      loanTotal: r.loan_total,
    })
  )

  const ammManaLiquidity = await getAMMLiquidity()

  const totalManaValue = userPortfolio.totalManaValue + ammManaLiquidity
  return {
    ...userPortfolio,
    ammManaLiquidity,
    totalManaValue,
  }
}

export const getPublicManaSupply = async (
  pg: SupabaseDirectClient
): Promise<ManaSupply> => {
  const ms = await getManaSupply(pg)
  return {
    manaBalance: ms.manaBalance,
    manaInvestmentValue: ms.manaInvestmentValue,
    loanTotal: ms.loanTotal,
    ammManaLiquidity: ms.ammManaLiquidity,
    totalManaValue: ms.totalManaValue,
  }
}

const getAMMLiquidity = async () => {
  const pg = createSupabaseDirectClient()
  const [binaryLiquidity, multiLiquidity] = await Promise.all([
    pg.many<{ sum: number }>(
      `select
        sum((data->>'prob')::numeric * (data->'pool'->>'YES')::numeric + (1-(data->>'prob')::numeric) *(data->'pool'->>'NO')::numeric + (data->'subsidyPool')::numeric) as sum
      from contracts
      where resolution is null and mechanism = 'cpmm-1' and token = 'MANA'`,
      []
    ),
    pg.many<{ sum: number }>(
      `select sum(prob * pool_yes + (1-prob) * pool_no + subsidy_pool) as sum
        from answers join contracts on contract_id = contracts.id
        where contracts.resolution is null and contracts.token = 'MANA'`,
      []
    ),
  ])

  return (binaryLiquidity[0]?.sum || 0) + (multiLiquidity[0]?.sum || 0)
}
