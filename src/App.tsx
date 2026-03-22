import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import './App.css'
import { formatKpPoint, parseKpResponse, type GeomagPoint } from './lib/geomag'

const NOAA_KP_URL = '/api/kp'

type FetchState =
  | { status: 'loading' }
  | { status: 'success'; points: GeomagPoint[] }
  | { status: 'error'; message: string }

function formatAxisLabel(timestamp: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  })
    .format(new Date(timestamp))
    .replace(/\//g, '/')
    .replace(/\s+/g, ' ')
}

function summarizePeak(points: GeomagPoint[]) {
  const peak = points.reduce((best, point) => (point.kp > best.kp ? point : best), points[0])
  const details = formatKpPoint(peak)

  return {
    peak,
    details,
  }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: GeomagPoint }> }) {
  if (!active || !payload?.length) {
    return null
  }

  const point = payload[0].payload
  const details = formatKpPoint(point)

  return (
    <div className="tooltip-card">
      <div className="tooltip-time">{details.localTime}</div>
      <div className="tooltip-kp">Kp {point.kp.toFixed(2)}</div>
      <div className="tooltip-level">地磁等級：{point.level}</div>
      <div className="tooltip-meta">a 指數：{point.aRunning}</div>
      <div className="tooltip-meta">站數：{point.stationCount}</div>
    </div>
  )
}

function App() {
  const [state, setState] = useState<FetchState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      try {
        const response = await fetch(NOAA_KP_URL)
        if (!response.ok) {
          throw new Error(`NOAA API error: ${response.status}`)
        }

        const rawData = (await response.json()) as string[][]
        const points = parseKpResponse(rawData)

        if (!cancelled) {
          setState({ status: 'success', points })
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : '資料載入失敗',
          })
        }
      }
    }

    void loadData()

    return () => {
      cancelled = true
    }
  }, [])

  const peakSummary = useMemo(() => {
    if (state.status !== 'success' || state.points.length === 0) {
      return null
    }

    return summarizePeak(state.points)
  }, [state])

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <p className="eyebrow">NOAA SWPC / 台北時間</p>
        <h1>過去 7 天地磁暴趨勢</h1>
        <p className="lead">最近 7 天每 3 小時 Kp 指數（台北時間）</p>
      </section>

      {state.status === 'loading' && <section className="status-card">正在載入 NOAA 即時 Kp 資料…</section>}

      {state.status === 'error' && (
        <section className="status-card error-card">
          無法取得 NOAA 資料：{state.message}
        </section>
      )}

      {state.status === 'success' && peakSummary && (
        <>
          <section className="summary-grid">
            <article className="summary-card highlight-card">
              <span className="summary-label">最近峰值</span>
              <strong>{peakSummary.peak.level}</strong>
              <p>Kp {peakSummary.peak.kp.toFixed(2)}</p>
              <small>{peakSummary.details.localTime}</small>
            </article>

            <article className="summary-card">
              <span className="summary-label">最近資料點</span>
              <strong>{state.points.at(-1)?.kp.toFixed(2)}</strong>
              <p>{state.points.at(-1)?.level}</p>
              <small>{state.points.at(-1) ? formatKpPoint(state.points.at(-1)!).localTime : ''}</small>
            </article>

            <article className="summary-card">
              <span className="summary-label">資料筆數</span>
              <strong>{state.points.length}</strong>
              <p>每 3 小時一筆</p>
              <small>共 7 天</small>
            </article>
          </section>

          <section className="chart-card">
            <div className="chart-header">
              <div>
                <h2>地磁 Kp 折線圖</h2>
                <p>滑鼠移到曲線上即可查看該時刻的 Kp、等級、a 指數與站數。</p>
              </div>
            </div>

            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={420}>
                <LineChart data={state.points} margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
                  <CartesianGrid stroke="rgba(148, 163, 184, 0.18)" vertical={false} />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatAxisLabel}
                    minTickGap={32}
                    stroke="#94a3b8"
                  />
                  <YAxis domain={[0, 9]} ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]} stroke="#94a3b8" />
                  <Tooltip content={<CustomTooltip />} isAnimationActive={false} animationDuration={0} />
                  <ReferenceLine y={5} stroke="#f59e0b" strokeDasharray="6 6" label="G1 門檻" />
                  <ReferenceLine y={7} stroke="#ef4444" strokeDasharray="6 6" label="G3 門檻" />
                  <Line
                    type="monotone"
                    dataKey="kp"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    isAnimationActive={false}
                    dot={{ r: 3, fill: '#c4b5fd', strokeWidth: 0 }}
                    activeDot={{ r: 7, fill: '#f8fafc', stroke: '#8b5cf6', strokeWidth: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}
    </main>
  )
}

export default App
