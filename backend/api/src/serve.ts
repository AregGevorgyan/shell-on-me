import * as admin from 'firebase-admin'
import { initAdmin } from 'shared/init-admin'
import { loadSecretsToEnv } from 'common/secrets'
import { LOCAL_DEV, log } from 'shared/utils'
import { METRIC_WRITER } from 'shared/monitoring/metric-writer'
import { initCaches } from 'shared/init-caches'
import { listen as webSocketListen } from 'shared/websockets/server'

log('Api server starting up...')

if (LOCAL_DEV) {
  initAdmin()
} else {
  const projectId = process.env.FIREBASE_PROJECT_ID
  admin.initializeApp({
    projectId,
    storageBucket: `${projectId}.appspot.com`,
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!)
    ),
  })
}

METRIC_WRITER.start()

import { app } from './app'

const DB_RESPONSE_TIMEOUT = 30_000

const startupProcess = async () => {
  await loadSecretsToEnv()
  log('Secrets loaded.')

  log('Starting server <> postgres timeout')
  const timeoutId = setTimeout(() => {
    log.error(
      `Server hasn't heard from postgres in ${DB_RESPONSE_TIMEOUT}ms. Exiting.`
    )
    throw new Error('Server startup timed out')
  }, DB_RESPONSE_TIMEOUT)

  await initCaches(timeoutId)
  log('Caches loaded.')

  const PORT = process.env.PORT ?? 8088
  const httpServer = app.listen(PORT, () => {
    log.info(`Serving API on port ${PORT}.`)
  })

  if (!process.env.READ_ONLY) {
    webSocketListen(httpServer, '/ws')
    log.info('Web socket server listening on /ws')
  }

  log('Server started successfully')
}
startupProcess()
