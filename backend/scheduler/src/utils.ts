import * as admin from 'firebase-admin'
import { initAdmin } from 'shared/init-admin'
import { loadSecretsToEnv } from 'common/secrets'
import { LOCAL_DEV, log } from 'shared/utils'

export function initFirebase() {
  if (LOCAL_DEV) {
    initAdmin()
    log.info('Initialized Firebase using local credentials.')
  } else {
    const projectId = process.env.FIREBASE_PROJECT_ID
    admin.initializeApp({
      projectId,
      storageBucket: `${projectId}.appspot.com`,
      credential: admin.credential.cert(
        JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!)
      ),
    })
    log.info(`Initialized Firebase for project ${projectId}.`)
  }
}

export async function initSecrets() {
  await loadSecretsToEnv()
  log.info('Secrets ready.')
}
