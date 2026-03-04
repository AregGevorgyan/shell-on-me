import {
  DEV_HOUSE_LIQUIDITY_PROVIDER_ID,
  HOUSE_LIQUIDITY_PROVIDER_ID,
} from 'common/antes'
import { Contract } from 'common/contract'
import {
  BOOST_COST_MANA,
} from 'common/economy'
import { isAdminId, isModId } from 'common/envs/constants'
import { Row } from 'common/supabase/utils'
import { TopLevelPost } from 'common/top-level-post'
import { ContractBoostPurchaseTxn } from 'common/txn'
import { DAY_MS } from 'common/util/time'
import { trackPublicEvent } from 'shared/analytics'
import { boostContractImmediately } from 'shared/supabase/contracts'
import {
  createSupabaseDirectClient,
  SupabaseDirectClient,
} from 'shared/supabase/init'
import { getPost } from 'shared/supabase/posts'
import { runTxnInBetQueue, TxnData } from 'shared/txn/run-txn'
import { getContract, isProd } from 'shared/utils'
import { APIError, APIHandler } from './helpers/endpoint'
import { onlyUsersWhoCanPerformAction } from './helpers/rate-limit'

const MAX_ACTIVE_BOOSTS = 5

//TODO; we could add a 'paid' column that is default true but for those paying with USD,
// defaults to false until the strpe webhook marks it as true
export const purchaseContractBoost: APIHandler<'purchase-boost'> =
  onlyUsersWhoCanPerformAction('boost', async (props, auth) => {
  const { contractId, postId, startTime, method } = props
  const userId = auth.uid

  const pg = createSupabaseDirectClient()

  // Validate that either contract or post exists and user can see it
  let contract: Contract | undefined = undefined
  let post: TopLevelPost | null = null
  let contentSlug = ''

  if (contractId) {
    contract = await getContract(pg, contractId)
    if (!contract) {
      throw new APIError(404, 'Contract not found')
    }
    contentSlug = contract.slug
  } else if (postId) {
    post = await getPost(pg, postId)
    if (!post) {
      throw new APIError(404, 'Post not found')
    }
    contentSlug = post.slug
  }

  const freeAdminBoost = method === 'admin-free'

  // Check if user is admin/mod for free boost
  if (freeAdminBoost && !isAdminId(userId) && !isModId(userId)) {
    throw new APIError(403, 'Only admins and mods can use free boosts')
  }

  // If paying with mana (or admin-free), block when MANA is disabled site-wide
  const systemStatus = await pg.oneOrNone(
    `select status from system_trading_status where token = 'MANA'`
  )
  if (!systemStatus?.status) {
    throw new APIError(403, `Trading with MANA is currently disabled.`)
  }

  // Check if there's already an active boost for the same time period
  const activeBoost = await pg.manyOrNone<Row<'contract_boosts'>>(
    `select * from contract_boosts 
     where millis_to_ts($1) between start_time and end_time
     and funded`,
    [startTime]
  )

  // Check if the specific content (contract or post) already has a boost for this time
  const contentHasBoost = activeBoost.some(
    (b) =>
      (contractId && b.contract_id === contractId) ||
      (postId && b.post_id === postId)
  )

  if (contentHasBoost) {
    throw new APIError(
      400,
      `${
        contractId ? 'Contract' : 'Post'
      } already has an active boost for that time`
    )
  }

  if (activeBoost.length >= MAX_ACTIVE_BOOSTS) {
    throw new APIError(
      400,
      'That time period has the maximum number of boosts. Please select a different time.'
    )
  }

  // Start transaction for mana payment
  await pg.tx(async (tx) => {
    const boost = await tx.one(
      `insert into contract_boosts (contract_id, post_id, user_id, start_time, end_time, funded)
       values ($1, $2, $3, millis_to_ts($4), millis_to_ts($5), true)
       returning id`,
      [
        contractId ?? null,
        postId ?? null,
        userId,
        startTime,
        startTime + DAY_MS,
      ]
    )
    if (!freeAdminBoost) {
      const txnData: TxnData = {
        category: 'CONTRACT_BOOST_PURCHASE',
        fromType: 'USER',
        toType: 'BANK',
        token: 'M$',
        data: { contractId, postId, boostId: boost.id },
        amount: BOOST_COST_MANA,
        fromId: userId,
        toId: isProd()
          ? HOUSE_LIQUIDITY_PROVIDER_ID
          : DEV_HOUSE_LIQUIDITY_PROVIDER_ID,
      } as ContractBoostPurchaseTxn
      await runTxnInBetQueue(tx, txnData)
    }
  })

  return {
    result: { success: true },
    continue: async () => {
      trackPublicEvent(
        auth.uid,
        `${contractId ? 'contract' : 'post'} boost purchased`,
        {
          contractId,
          postId,
          slug: contentSlug,
          paymentMethod: 'mana',
        }
      )
      if (startTime <= Date.now() && contract) {
        await boostContractImmediately(pg, contract)
      }
      if (startTime <= Date.now() && post) {
        await boostPostImmediately(pg, post)
      }
    },
  }
})

export const boostPostImmediately = async (
  pg: SupabaseDirectClient,
  post: TopLevelPost
) => {
  await pg.none(
    `update old_posts set boosted = true, importance_score = 0.9 where id = $1`,
    [post.id]
  )
}
