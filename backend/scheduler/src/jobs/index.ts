import { calculateUserTopicInterests } from 'shared/calculate-user-topic-interests'
import { downsamplePortfolioHistory } from 'shared/downsample-portfolio-history'
import { expireLimitOrders } from 'shared/expire-limit-orders'
import { calculateGroupImportanceScore } from 'shared/group-importance-score'
import { IMPORTANCE_MINUTE_INTERVAL } from 'shared/importance-score'
import { updateContractMetricsCore } from 'shared/update-contract-metrics-core'
import {
  CREATOR_UPDATE_FREQUENCY,
  updateCreatorMetricsCore,
} from 'shared/update-creator-metrics-core'
import { updateUserMetricPeriods } from 'shared/update-user-metric-periods'
import { updateUserPortfolioHistoriesCore } from 'shared/update-user-portfolio-histories-core'
import { isProd } from 'shared/utils'
import { applyPendingClarifications } from './apply-pending-clarifications'
import { autoAwardBounty } from './auto-award-bounty'
import { cleanOldNotifications } from './clean-old-notifications'
import { denormalizeAnswers } from './denormalize-answers'
import { drizzleLiquidity } from './drizzle-liquidity'
import { createJob } from './helpers'
import { resetPgStats } from './reset-pg-stats'
import { scoreContracts } from './score-contracts'
import { updateStatsCore } from './update-stats'

export function createJobs() {
  return [
    // Sub-hourly jobs:
    createJob(
      'update-user-portfolio-histories',
      '30 * * * * *', // every minute
      () => updateUserPortfolioHistoriesCore()
    ),
    createJob(
      'expire-limit-orders',
      '0 */1 * * * *', // every minute
      expireLimitOrders
    ),
    createJob(
      'denormalize-answers',
      '0 * * * * *', // every minute
      denormalizeAnswers
    ),
    createJob(
      'score-contracts',
      `0 */${isProd() ? IMPORTANCE_MINUTE_INTERVAL : 60} * * * *`, // every 2 minutes
      scoreContracts
    ),
    createJob(
      'apply-pending-clarifications',
      '0 */5 * * * *', // every 5 minutes
      applyPendingClarifications
    ),
    createJob(
      'drizzle-liquidity',
      '0 */7 * * * *', // every 7 minutes
      drizzleLiquidity
    ),
    createJob(
      'update-contract-metrics',
      '0 */21 * * * *', // every 21 minutes
      () => updateContractMetricsCore(false)
    ),
    // Hourly jobs:
    createJob(
      'group-importance-score',
      '0 6 * * * *', // on the 6th minute of every hour
      () => calculateGroupImportanceScore()
    ),
    createJob(
      'auto-award-bounty',
      '0 55 * * * *', // on the 55th minute of every hour
      autoAwardBounty
    ),
    createJob(
      'update-creator-metrics',
      `0 */${CREATOR_UPDATE_FREQUENCY} * * * *`, // every 57 minutes
      updateCreatorMetricsCore
    ),
    // Daily jobs:
    createJob(
      'clean-old-notifications',
      '0 30 2 * * *', // 2:30 AM daily
      cleanOldNotifications
    ),
    createJob(
      'update-user-metric-periods',
      '0 0 2 * * *', // 2 AM daily
      async () => {
        await updateUserMetricPeriods()
      }
    ),
    createJob(
      'reset-pg-stats',
      '0 0 3 * * *', // 3 AM daily
      resetPgStats
    ),
    createJob(
      'calculate-user-topic-interests',
      '0 0 3 * * *', // 3 AM daily
      () => calculateUserTopicInterests()
    ),
    createJob(
      'update-stats',
      '0 20 4 * * *', // 4:20 AM daily
      () => updateStatsCore(7)
    ),
    createJob(
      'update-contract-metrics-full',
      '0 30 5 * * *', // 5:30 AM daily
      () => updateContractMetricsCore(true)
    ),
    createJob(
      'downsample-portfolio-history',
      '0 50 4 * * *', // 4:50 AM daily
      downsamplePortfolioHistory
    ),
  ]
}
