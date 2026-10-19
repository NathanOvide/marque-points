import { useMemo, useRef, useState } from 'react'
import { totals } from '../logic'
import type { Match } from '../types'
import { Avatar, COLOR_COUNT } from '../ui'

const W = 340
const H = 220
const PAD = { l: 40, r: 16, t: 12, b: 28 }

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) return [min]
  const raw = (max - min) / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  const ticks = []
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(Math.round(v * 1e6) / 1e6)
  return ticks
}

/** Évolution du total de chaque joueur, manche après manche. */
export default function ScoreChart({ match }: { match: Match }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const n = match.rounds.length

  const series = useMemo(() => {
    const steps = Array.from({ length: n + 1 }, (_, i) => totals(match, i))
    return match.players.map((p) => ({ player: p, values: steps.map((t) => t[p.id]) }))
  }, [match, n])

  const all = series.flatMap((s) => s.values)
  const ticks = niceTicks(Math.min(0, ...all), Math.max(0, ...all))
  const yMin = Math.min(ticks[0], ...all)
  const yMax = Math.max(ticks[ticks.length - 1], ...all)
  const x = (i: number) => PAD.l + (n === 0 ? 0 : (i / n) * (W - PAD.l - PAD.r))
  const y = (v: number) => PAD.t + (yMax === yMin ? 0.5 : 1 - (v - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b)
  const xLabelEvery = Math.ceil((n + 1) / 8)
  const directLabels = series.length <= 4

  const pick = (clientX: number) => {
    const r = svgRef.current?.getBoundingClientRect()
    if (!r || n === 0) return
    const sx = ((clientX - r.left) / r.width) * W
    setHover(Math.max(0, Math.min(n, Math.round(((sx - PAD.l) / (W - PAD.l - PAD.r)) * n))))
  }

  const hoverRows = hover === null ? [] : [...series].sort((a, b) => (match.winMode === 'high' ? b.values[hover] - a.values[hover] : a.values[hover] - b.values[hover]))

  return (
    <div className="chart">
      {series.length > 1 && (
        <ul className="legend">
          {series.map((s) => (
            <li key={s.player.id}>
              <span className="legend-line" style={{ background: `var(--p${s.player.color % COLOR_COUNT})` }} />
              {s.player.emoji} {s.player.name}
            </li>
          ))}
        </ul>
      )}
      <div className="chart-box">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Évolution des scores par manche"
          onPointerMove={(e) => pick(e.clientX)}
          onPointerDown={(e) => pick(e.clientX)}
          onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line className={t === 0 ? 'axis' : 'grid'} x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} />
              <text className="tick" x={PAD.l - 6} y={y(t) + 4} textAnchor="end">
                {t}
              </text>
            </g>
          ))}
          {Array.from({ length: n + 1 }, (_, i) =>
            i % xLabelEvery === 0 || i === n ? (
              <text key={i} className="tick" x={x(i)} y={H - 8} textAnchor="middle">
                {i === 0 ? 'Départ' : `M${i}`}
              </text>
            ) : null,
          )}
          {hover !== null && <line className="crosshair" x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} />}
          {series.map((s) => (
            <g key={s.player.id} style={{ color: `var(--p${s.player.color % COLOR_COUNT})` }}>
              <polyline className="series" points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
              {(hover !== null ? [hover] : n <= 12 ? s.values.map((_, i) => i) : [n]).map((i) => (
                <circle key={i} className="marker" cx={x(i)} cy={y(s.values[i])} r={hover === i ? 5 : 4} />
              ))}
            </g>
          ))}
          {directLabels &&
            hover === null &&
            series.map((s) => (
              <text key={s.player.id} className="end-label" x={x(n) - 6} y={y(s.values[n]) - 8} textAnchor="end">
                {s.values[n]}
              </text>
            ))}
        </svg>
        {hover !== null && (
          <div className="tooltip" style={{ left: `${(x(hover) / W) * 100}%` }} data-side={hover > n / 2 ? 'left' : 'right'}>
            <b>{hover === 0 ? 'Départ' : `Après la manche ${hover}`}</b>
            {hoverRows.map((s) => (
              <span key={s.player.id} className="tooltip-row">
                <Avatar emoji={s.player.emoji} color={s.player.color} size={18} />
                <span className="grow">{s.player.name}</span>
                <b>{s.values[hover]}</b>
              </span>
            ))}
          </div>
        )}
      </div>
      <p className="muted small center">Touchez le graphique pour voir les scores à chaque manche.</p>
    </div>
  )
}
