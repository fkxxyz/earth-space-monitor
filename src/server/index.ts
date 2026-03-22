import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { checkGeomagStorm, fetchNoaaData } from './monitor'
import { readMonitorState, writeMonitorState } from './state'

const PORT = Number(Bun.env.PORT ?? 8787)
const POLL_INTERVAL_MS = Number(Bun.env.GEOMAG_POLL_INTERVAL_MS ?? 3 * 60 * 60 * 1000)
const THRESHOLD_KP = Number(Bun.env.GEOMAG_THRESHOLD_KP ?? 5)
const STATE_FILE = Bun.env.GEOMAG_STATE_FILE ?? join(process.cwd(), 'data', 'monitor-state.json')

let latestStatus: Record<string, unknown> = {
  ok: true,
  message: 'monitor not started yet',
}

async function runMonitorCycle() {
  const state = await readMonitorState(STATE_FILE)
  const result = await checkGeomagStorm({
    lastTriggeredTimestamp: state.lastTriggeredTimestamp,
    thresholdKp: THRESHOLD_KP,
  })

  const nextState = {
    lastTriggeredTimestamp: result.triggered ? result.latestPoint.timestamp : state.lastTriggeredTimestamp,
    lastCheckedAt: new Date().toISOString(),
  }

  await writeMonitorState(STATE_FILE, nextState)

  latestStatus = {
    ok: true,
    checkedAt: nextState.lastCheckedAt,
    stateFile: STATE_FILE,
    thresholdKp: THRESHOLD_KP,
    triggered: result.triggered,
    reason: result.reason,
    latestPoint: result.latestPoint,
  }

  return latestStatus
}

async function loadChartData() {
  return fetchNoaaData()
}

setInterval(() => {
  void runMonitorCycle().catch((error) => {
    latestStatus = {
      ok: false,
      checkedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown monitor error',
    }
    console.error('[earth-space-monitor]', error)
  })
}, POLL_INTERVAL_MS)

void runMonitorCycle().catch((error) => {
  latestStatus = {
    ok: false,
    checkedAt: new Date().toISOString(),
    error: error instanceof Error ? error.message : 'Unknown monitor error',
  }
  console.error('[earth-space-monitor]', error)
})

const frontendDistPath = join(process.cwd(), 'dist')

Bun.serve({
  port: PORT,
  routes: {
    '/api/kp': async () => Response.json(await loadChartData()),
    '/api/monitor/status': () => Response.json(latestStatus),
    '/api/monitor/check-now': async () => Response.json(await runMonitorCycle()),
  },
  fetch(req) {
    const url = new URL(req.url)
    if (url.pathname.startsWith('/api/')) {
      return new Response('Not found', { status: 404 })
    }

    if (existsSync(frontendDistPath)) {
      const filePath = url.pathname === '/' ? join(frontendDistPath, 'index.html') : join(frontendDistPath, url.pathname)
      const file = Bun.file(filePath)
      return file.exists().then((exists) => (exists ? new Response(file) : new Response(Bun.file(join(frontendDistPath, 'index.html')))))
    }

    return new Response('Frontend not built yet. Run bun run build first.', { status: 503 })
  },
})

console.log(`[earth-space-monitor] server listening on http://localhost:${PORT}`)
console.log(`[earth-space-monitor] polling every ${POLL_INTERVAL_MS}ms, threshold Kp >= ${THRESHOLD_KP}`)
