import { ENV } from 'common/envs/constants'
import { createClient } from 'common/supabase/utils'
import { getSupabaseInstanceId } from './db'

// the vercel names for these secrets
let key =
  ENV == 'PROD'
    ? process.env.PROD_ADMIN_SUPABASE_KEY
    : process.env.DEV_ADMIN_SUPABASE_KEY

export async function initSupabaseAdmin() {
  if (key == null) {
    console.warn(
      'PROD_ADMIN_SUPABASE_KEY / DEV_ADMIN_SUPABASE_KEY not set. Admin Supabase client unavailable.'
    )
  }
  return createClient(getSupabaseInstanceId(), key ?? '')
}
