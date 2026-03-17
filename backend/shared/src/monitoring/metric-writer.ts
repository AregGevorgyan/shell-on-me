import { log } from 'shared/utils'
import { MetricStore } from './metrics'

// how often metrics are logged
export const METRICS_INTERVAL_MS = 60_000

/** Logs fresh metric entries as structured JSON to stdout. */
export class MetricWriter {
  store: MetricStore
  intervalMs: number
  runInterval?: NodeJS.Timeout

  constructor(store: MetricStore, intervalMs: number) {
    this.store = store
    this.intervalMs = intervalMs
  }

  async write() {
    const freshEntries = this.store.freshEntries()
    if (freshEntries.length > 0) {
      for (const entry of freshEntries) {
        entry.fresh = false
      }
      this.store.clearDistributionGauges()
      log.debug('Metrics snapshot', { entries: freshEntries })
    }
  }

  start() {
    if (!this.runInterval) {
      this.runInterval = setInterval(async () => {
        try {
          await this.write()
        } catch (error) {
          log.error('Failed to write metrics.', { error })
        }
      }, this.intervalMs)
    }
  }

  stop() {
    clearTimeout(this.runInterval)
  }
}

import { metrics } from './metrics'
export const METRIC_WRITER = new MetricWriter(metrics, METRICS_INTERVAL_MS)
