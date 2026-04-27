import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const lineSpy = vi.fn()
const tooltipSpy = vi.fn()

vi.mock('recharts', () => ({
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Line: (props: Record<string, unknown>) => {
    lineSpy(props)
    return <div data-testid="line-chart-line" />
  },
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  ReferenceLine: () => <div data-testid="reference-line" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  Tooltip: (props: Record<string, unknown>) => {
    tooltipSpy(props)
    return <div data-testid="tooltip" />
  },
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
}))

import App from './App'

const mockKpResponse = [
  { time_tag: '2026-03-20 18:00:00.000', Kp: 5.67, a_running: 67, station_count: 8 },
  { time_tag: '2026-03-20 21:00:00.000', Kp: 6.67, a_running: 111, station_count: 8 },
  { time_tag: '2026-03-21 00:00:00.000', Kp: 7.0, a_running: 132, station_count: 8 },
  { time_tag: '2026-03-21 03:00:00.000', Kp: 6.0, a_running: 80, station_count: 8 },
]

beforeEach(() => {
  vi.restoreAllMocks()
  lineSpy.mockClear()
  tooltipSpy.mockClear()
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockKpResponse,
    }),
  )
})

describe('App', () => {
  it('renders the chart title and summary after loading NOAA data', async () => {
    render(<App />)

    expect(screen.getByText('過去 7 天地磁暴趨勢')).toBeInTheDocument()
    expect(await screen.findByText('最近 7 天每 3 小時 Kp 指數（台北時間）')).toBeInTheDocument()
    expect(await screen.findByText('最近峰值')).toBeInTheDocument()
    expect(await screen.findByText('G3')).toBeInTheDocument()
  })

  it('disables chart animations for line and tooltip', async () => {
    render(<App />)

    await screen.findByText('最近峰值')

    expect(lineSpy).toHaveBeenCalled()
    expect(lineSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        isAnimationActive: false,
      }),
    )

    expect(tooltipSpy).toHaveBeenCalled()
    expect(tooltipSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        isAnimationActive: false,
        animationDuration: 0,
      }),
    )
  })
})
