import { type APIHandler } from './helpers/endpoint'
import { APIError } from 'api/helpers/endpoint'
import { onlyUsersWhoCanPerformAction } from './helpers/rate-limit'

export const donate: APIHandler<'donate'> = onlyUsersWhoCanPerformAction(
  'trade',
  async () => {
    throw new APIError(
      403,
      'Charity donation flows are disabled for this StartupShell deployment.'
    )
  }
)
