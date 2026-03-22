export type GeomagPoint = {
  timestamp: string
  kp: number
  aRunning: number
  stationCount: number
  level: 'Quiet' | 'Active' | 'G1' | 'G2' | 'G3' | 'G4' | 'G5'
}

type KpRow = [string, string, string, string]

const TAIPEI_FORMATTER = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'Asia/Taipei',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function normalizeTimestamp(rawTimestamp: string) {
  return rawTimestamp.replace(' ', 'T') + 'Z'
}

export function getStormLevel(kp: number): GeomagPoint['level'] {
  if (kp >= 9) return 'G5'
  if (kp >= 8) return 'G4'
  if (kp >= 7) return 'G3'
  if (kp >= 6) return 'G2'
  if (kp >= 5) return 'G1'
  if (kp >= 4) return 'Active'
  return 'Quiet'
}

export function parseKpResponse(response: string[][]): GeomagPoint[] {
  const [, ...dataRows] = response as [string[], ...KpRow[]]

  const parsed = dataRows
    .map(([time_tag, Kp, a_running, station_count]) => ({
      timestamp: normalizeTimestamp(time_tag),
      kp: Number.parseFloat(Kp),
      aRunning: Number.parseInt(a_running, 10),
      stationCount: Number.parseInt(station_count, 10),
      level: getStormLevel(Number.parseFloat(Kp)),
    }))
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp))

  return parsed.slice(-56)
}

export function parseLatestKpPoint(response: string[][]): GeomagPoint | null {
  const points = parseKpResponse(response)
  return points.at(-1) ?? null
}

export function formatKpPoint(point: GeomagPoint) {
  const localTime = TAIPEI_FORMATTER
    .format(new Date(point.timestamp))
    .replace(/\//g, '/')
    .replace(/\s+/g, ' ')

  return {
    localTime,
    summary: `${point.level} · Kp ${point.kp.toFixed(2)} · a=${point.aRunning} · stations=${point.stationCount}`,
  }
}
