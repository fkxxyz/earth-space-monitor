import { describe, expect, it } from 'vitest'

import { formatKpPoint, parseKpResponse } from './geomag'

describe('parseKpResponse', () => {
  it('keeps the most recent seven days of 3-hour Kp data and sorts ascending', () => {
    const rows = []
    const start = new Date('2026-03-01T00:00:00.000Z')

    for (let index = 0; index < 72; index += 1) {
      const timestamp = new Date(start.getTime() + index * 3 * 60 * 60 * 1000)
      rows.push({
        time_tag: timestamp.toISOString().replace('T', ' ').replace('Z', ''),
        Kp: Number((index % 8).toFixed(2)),
        a_running: index,
        station_count: 8,
      })
    }

    const points = parseKpResponse(rows)

    expect(points).toHaveLength(56)
    expect(points[0].timestamp).toBe('2026-03-03T00:00:00.000Z')
    expect(points.at(-1)?.timestamp).toBe('2026-03-09T21:00:00.000Z')
    expect(points[0].kp).toBe(0)
  })

  it('maps NOAA storm levels and preserves supporting fields', () => {
    const points = parseKpResponse([
      { time_tag: '2026-03-20 18:00:00.000', Kp: 5.67, a_running: 67, station_count: 8 },
      { time_tag: '2026-03-20 21:00:00.000', Kp: 6.67, a_running: 111, station_count: 8 },
      { time_tag: '2026-03-21 00:00:00.000', Kp: 7.0, a_running: 132, station_count: 8 },
    ])

    expect(points.map((point) => point.level)).toEqual(['G1', 'G2', 'G3'])
    expect(points[1]).toMatchObject({
      kp: 6.67,
      aRunning: 111,
      stationCount: 8,
    })
  })
})

describe('formatKpPoint', () => {
  it('formats a tooltip-friendly label in Taipei time', () => {
    const label = formatKpPoint({
      timestamp: '2026-03-21T00:00:00.000Z',
      kp: 7,
      aRunning: 132,
      stationCount: 8,
      level: 'G3',
    })

    expect(label.localTime).toBe('2026/03/21 08:00')
    expect(label.summary).toContain('G3')
    expect(label.summary).toContain('Kp 7.00')
  })
})
