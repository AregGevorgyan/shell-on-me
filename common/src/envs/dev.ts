import { EnvConfig, PROD_CONFIG } from './prod'

const env = (key: string, fallback: string) => process.env[key] ?? fallback
const listEnv = (key: string, fallback: string[]) => {
  const raw = process.env[key]
  if (!raw) return fallback
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

const devDomain = env('NEXT_PUBLIC_DEV_APP_DOMAIN', 'dev.startupshell.org')
const devFirebaseProjectId = env(
  'NEXT_PUBLIC_DEV_FIREBASE_PROJECT_ID',
  'startupshell-dev'
)

export const DEV_CONFIG: EnvConfig = {
  ...PROD_CONFIG,
  domain: devDomain,
  googleAnalyticsId: '',
  firebaseConfig: {
    apiKey: env('NEXT_PUBLIC_DEV_FIREBASE_API_KEY', ''),
    authDomain: env(
      'NEXT_PUBLIC_DEV_FIREBASE_AUTH_DOMAIN',
      `${devFirebaseProjectId}.firebaseapp.com`
    ),
    projectId: devFirebaseProjectId,
    region: env('NEXT_PUBLIC_DEV_FIREBASE_REGION', 'us-central1'),
    storageBucket: env(
      'NEXT_PUBLIC_DEV_FIREBASE_STORAGE_BUCKET',
      `${devFirebaseProjectId}.appspot.com`
    ),
    privateBucket: env(
      'NEXT_PUBLIC_DEV_FIREBASE_PRIVATE_BUCKET',
      `${devFirebaseProjectId}-private`
    ),
    messagingSenderId: env('NEXT_PUBLIC_DEV_FIREBASE_MESSAGING_SENDER_ID', ''),
    appId: env('NEXT_PUBLIC_DEV_FIREBASE_APP_ID', ''),
    measurementId: env('NEXT_PUBLIC_DEV_FIREBASE_MEASUREMENT_ID', ''),
  },
  cloudRunId: env('NEXT_PUBLIC_DEV_CLOUD_RUN_ID', ''),
  cloudRunRegion: env('NEXT_PUBLIC_DEV_CLOUD_RUN_REGION', 'uc'),
  amplitudeApiKey: env('NEXT_PUBLIC_DEV_AMPLITUDE_API_KEY', ''),
  supabaseInstanceId: env('NEXT_PUBLIC_DEV_SUPABASE_INSTANCE_ID', ''),
  supabaseAnonKey: env('NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY', ''),
  twitchBotEndpoint: env(
    'NEXT_PUBLIC_DEV_TWITCH_BOT_ENDPOINT',
    `https://twitch-bot.${devDomain}`
  ),
  apiEndpoint: env('NEXT_PUBLIC_DEV_API_ENDPOINT', `api.${devDomain}`),
  expoConfig: {
    iosClientId: process.env.EXPO_DEV_IOS_CLIENT_ID,
    iosClientId2: process.env.EXPO_DEV_IOS_CLIENT_ID_2,
    expoClientId: process.env.EXPO_DEV_CLIENT_ID,
    androidClientId: process.env.EXPO_DEV_ANDROID_CLIENT_ID,
    androidClientId2: process.env.EXPO_DEV_ANDROID_CLIENT_ID_2,
  },
  adminIds: listEnv('STARTUPSHELL_DEV_ADMIN_IDS', PROD_CONFIG.adminIds),
}
