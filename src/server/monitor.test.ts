import { afterEach, describe, expect, it, vi } from 'vitest'

import { checkGeomagStorm } from './monitor'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('checkGeomagStorm', () => {
  it('triggers webhook/script execution when the latest 3-hour Kp reaches G1', async () => {
    const fetchNoaaData = vi.fn().mockResolvedValue([
      { time_tag: '2026-03-21 00:00:00.000', Kp: 4.67, a_running: 31, station_count: 8 },
      { time_tag: '2026-03-21 03:00:00.000', Kp: 5.33, a_running: 56, station_count: 8 },
    ])
    const dispatchAlert = vi.fn().mockResolvedValue(undefined)

    const result = await checkGeomagStorm({
      fetchNoaaData,
      dispatchAlert,
      lastTriggeredTimestamp: null,
      thresholdKp: 5,
    })

    expect(dispatchAlert).toHaveBeenCalledTimes(1)
    expect(dispatchAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamp: '2026-03-21T03:00:00.000Z',
        kp: 5.33,
        level: 'G1',
      }),
    )
    expect(result.triggered).toBe(true)
    expect(result.latestPoint.level).toBe('G1')
  })

  it('does not trigger twice for the same Kp interval', async () => {
    const fetchNoaaData = vi.fn().mockResolvedValue([
      { time_tag: '2026-03-21 03:00:00.000', Kp: 5.33, a_running: 56, station_count: 8 },
    ])
    const dispatchAlert = vi.fn().mockResolvedValue(undefined)

    const result = await checkGeomagStorm({
      fetchNoaaData,
      dispatchAlert,
      lastTriggeredTimestamp: '2026-03-21T03:00:00.000Z',
      thresholdKp: 5,
    })

    expect(dispatchAlert).not.toHaveBeenCalled()
    expect(result.triggered).toBe(false)
    expect(result.reason).toBe('already-triggered')
  })
})
