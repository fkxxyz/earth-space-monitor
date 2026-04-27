import { spawn } from 'node:child_process'

import { getStormLevel, parseLatestKpPoint, type GeomagPoint } from '../lib/geomag'

const NOAA_KP_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'

type KpDataPoint = {
  time_tag: string
  Kp: number
  a_running: number
  station_count: number
}

export type MonitorOptions = {
  fetchNoaaData?: () => Promise<KpDataPoint[]>
  dispatchAlert?: (point: GeomagPoint) => Promise<void>
  lastTriggeredTimestamp: string | null
  thresholdKp: number
}

export type MonitorResult = {
  triggered: boolean
  latestPoint: GeomagPoint
  reason: 'triggered' | 'below-threshold' | 'already-triggered'
}

export async function fetchNoaaData(): Promise<KpDataPoint[]> {
  const response = await fetch(NOAA_KP_URL)
  if (!response.ok) {
    throw new Error(`NOAA API error: ${response.status}`)
  }

  return (await response.json()) as KpDataPoint[]
}

export async function dispatchWebhook(point: GeomagPoint) {
  const webhookUrl = Bun.env.GEOMAG_WEBHOOK_URL
  const scriptCommand = Bun.env.GEOMAG_SCRIPT_COMMAND
  const payload = {
    source: 'noaa-swpc',
    threshold: 'G1',
    ...point,
    taipeiTime: new Intl.DateTimeFormat('zh-TW', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .format(new Date(point.timestamp))
      .replace(/\s+/g, ' '),
  }

  if (webhookUrl) {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`Webhook request failed: ${response.status}`)
    }
  }

  if (scriptCommand) {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(scriptCommand, {
        shell: true,
        stdio: 'inherit',
        env: {
          ...process.env,
          GEOMAG_ALERT_PAYLOAD: JSON.stringify(payload),
        },
      })

      child.on('exit', (code) => {
        if (code === 0) {
          resolve()
          return
        }

        reject(new Error(`Script exited with code ${code ?? 'unknown'}`))
      })
      child.on('error', reject)
    })
  }
}

export async function checkGeomagStorm({
  fetchNoaaData: fetchNoaaDataImpl = fetchNoaaData,
  dispatchAlert: dispatchAlertImpl = dispatchWebhook,
  lastTriggeredTimestamp,
  thresholdKp,
}: MonitorOptions): Promise<MonitorResult> {
  const rawData = await fetchNoaaDataImpl()
  const latestPoint = parseLatestKpPoint(rawData)

  if (!latestPoint) {
    throw new Error('No NOAA Kp data available')
  }

  if (latestPoint.kp < thresholdKp || getStormLevel(latestPoint.kp) === 'Active' || getStormLevel(latestPoint.kp) === 'Quiet') {
    return {
      triggered: false,
      latestPoint,
      reason: 'below-threshold',
    }
  }

  if (lastTriggeredTimestamp === latestPoint.timestamp) {
    return {
      triggered: false,
      latestPoint,
      reason: 'already-triggered',
    }
  }

  await dispatchAlertImpl(latestPoint)

  return {
    triggered: true,
    latestPoint,
    reason: 'triggered',
  }
}
