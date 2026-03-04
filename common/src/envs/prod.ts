export type EnvConfig = {
  domain: string
  firebaseConfig: FirebaseConfig
  amplitudeApiKey: string
  supabaseInstanceId: string
  supabaseAnonKey: string
  twitchBotEndpoint: string
  apiEndpoint: string
  googleAnalyticsId: string

  // IDs for v2 cloud functions -- find these by deploying a cloud function and
  // examining the URL, https://[name]-[cloudRunId]-[cloudRunRegion].a.run.app
  cloudRunId: string
  cloudRunRegion: string

  // Access controls
  adminIds: string[]
  visibility: 'PRIVATE' | 'PUBLIC'

  // Branding
  moneyMoniker: string // e.g. 'Ṁ'
  spiceMoniker: string // e.g. 'S'
  bettor: string // e.g. 'predictor'
  nounBet: string // e.g. 'prediction'
  verbPastBet: string // e.g. 'predicted'
  faviconPath: string // Should be a file in /public
  newQuestionPlaceholders: string[]
  expoConfig: {
    iosClientId?: string
    iosClientId2?: string
    expoClientId?: string
    androidClientId?: string
    androidClientId2?: string
  }
}

type FirebaseConfig = {
  apiKey: string
  authDomain: string
  projectId: string
  region?: string
  storageBucket: string
  privateBucket: string
  messagingSenderId: string
  appId: string
  measurementId: string
}

const env = (key: string, fallback: string) => process.env[key] ?? fallback
const listEnv = (key: string, fallback: string[]) => {
  const raw = process.env[key]
  if (!raw) return fallback
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

const prodDomain = env('NEXT_PUBLIC_APP_DOMAIN', 'startupshell.org')
const prodFirebaseProjectId = env(
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'startupshell'
)

export const PROD_CONFIG: EnvConfig = {
  domain: prodDomain,
  amplitudeApiKey: env('NEXT_PUBLIC_AMPLITUDE_API_KEY', ''),
  supabaseInstanceId: env('NEXT_PUBLIC_SUPABASE_INSTANCE_ID', ''),
  supabaseAnonKey: env('NEXT_PUBLIC_SUPABASE_ANON_KEY', ''),
  googleAnalyticsId: env('NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID', ''),
  firebaseConfig: {
    apiKey: env('NEXT_PUBLIC_FIREBASE_API_KEY', ''),
    authDomain: env(
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      `${prodFirebaseProjectId}.firebaseapp.com`
    ),
    projectId: prodFirebaseProjectId,
    region: env('NEXT_PUBLIC_FIREBASE_REGION', 'us-central1'),
    storageBucket: env(
      'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
      `${prodFirebaseProjectId}.appspot.com`
    ),
    privateBucket: env(
      'NEXT_PUBLIC_FIREBASE_PRIVATE_BUCKET',
      `${prodFirebaseProjectId}-private`
    ),
    messagingSenderId: env('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', ''),
    appId: env('NEXT_PUBLIC_FIREBASE_APP_ID', ''),
    measurementId: env('NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID', ''),
  },
  twitchBotEndpoint: env(
    'NEXT_PUBLIC_TWITCH_BOT_ENDPOINT',
    `https://twitch-bot.${prodDomain}`
  ),
  apiEndpoint: env('NEXT_PUBLIC_API_ENDPOINT', `api.${prodDomain}`),
  cloudRunId: env('NEXT_PUBLIC_CLOUD_RUN_ID', ''),
  cloudRunRegion: env('NEXT_PUBLIC_CLOUD_RUN_REGION', 'uc'),

  adminIds: listEnv('STARTUPSHELL_ADMIN_IDS', []),
  visibility: 'PRIVATE',

  moneyMoniker: 'Ṁ',
  spiceMoniker: 'P',
  bettor: 'trader',
  verbPastBet: 'traded',
  nounBet: 'trade',
  faviconPath: '/favicon.ico',
  newQuestionPlaceholders: [
    'Will we hit this quarter revenue target?',
    'Will we ship the roadmap feature by the target date?',
    'Will we close the next enterprise customer this month?',
    'Will our next demo day result in a signed pilot?',
  ],
  expoConfig: {
    iosClientId: process.env.EXPO_IOS_CLIENT_ID,
    iosClientId2: process.env.EXPO_IOS_CLIENT_ID_2,
    expoClientId: process.env.EXPO_CLIENT_ID,
    androidClientId: process.env.EXPO_ANDROID_CLIENT_ID,
    androidClientId2: process.env.EXPO_ANDROID_CLIENT_ID_2,
  },
}
