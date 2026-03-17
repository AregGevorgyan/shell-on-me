import { zip } from 'lodash'

// List of secrets available to backend (api, scheduler, scripts, etc.)
// Set these as environment variables in Render dashboard and ECS task definition.
export const secrets = (
  [
    'API_SECRET',
    'DREAM_KEY',
    'MAILGUN_KEY',
    'OPENAI_API_KEY',
    'SCHEDULER_AUTH_PASSWORD',
    'STRIPE_APIKEY',
    'STRIPE_WEBHOOKSECRET',
    'SUPABASE_KEY',
    'SUPABASE_JWT_SECRET',
    'SUPABASE_PASSWORD',
    'TEST_CREATE_USER_KEY',
    'NEWS_API_KEY',
    'REACT_APP_GIPHY_KEY',
    'TWITTER_API_KEY_JSON',
    'DESTINY_API_KEY',
    'FB_ACCESS_TOKEN',
    'GEODB_API_KEY',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_SID',
    'TWILIO_VERIFY_SID',
    'GIDX_API_KEY',
    'GIDX_MERCHANT_ID',
    'GIDX_PRODUCT_TYPE_ID',
    'GIDX_DEVICE_TYPE_ID',
    'GIDX_ACTIVITY_TYPE_ID',
    'ANTHROPIC_API_KEY',
    'PERPLEXITY_API_KEY',
    'FIRECRAWL_API_KEY',
    'SPORTSDB_KEY',
    'VERIFIED_PHONE_NUMBER',
    'GEMINI_API_KEY',
    // Some typescript voodoo to keep the string literal types while being not readonly.
  ] as const
).concat()

type SecretId = (typeof secrets)[number]

// Reads secrets from environment variables.
// All secrets must be set as env vars in Render dashboard / ECS task definition.
export const getSecrets = async (_credentials?: any, ...ids: SecretId[]) => {
  const secretIds = ids.length > 0 ? ids : secrets
  const pairs = secretIds.map((id) => [id, process.env[id]] as [string, string])
  return Object.fromEntries(pairs)
}

// Loads secrets into process.env (no-op on Render/ECS where they're already set,
// but keeps the same interface for local dev compatibility).
export const loadSecretsToEnv = async (_credentials?: any) => {
  const allSecrets = await getSecrets()
  for (const [key, value] of Object.entries(allSecrets)) {
    if (key && value && !process.env[key]) {
      process.env[key] = value
    }
  }
}
