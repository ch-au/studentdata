import { useMemo } from 'react'

const TREND_COLORS = {
  positive: '#16a34a',
  negative: '#dc2626',
  neutral: '#9ca3af',
} as const

const STAR_COLORS = {
  filled: '#f59e0b',
  empty: '#d1d5db',
} as const

export function computeSlope(values: number[]): { slope: number; color: string; arrow: string } {
  const nonzero = values.filter((v) => Number.isFinite(v) && v > 0)
  if (nonzero.length < 2) return { slope: 0, color: TREND_COLORS.neutral, arrow: '→' }
  const first = nonzero[0]
  const last = nonzero[nonzero.length - 1]
  const change = ((last - first) / first) * 100
  if (change > 5) return { slope: change, color: TREND_COLORS.positive, arrow: '↑' }
  if (change < -5) return { slope: change, color: TREND_COLORS.negative, arrow: '↓' }
  return { slope: change, color: TREND_COLORS.neutral, arrow: '→' }
}

let sparklineIdCounter = 0

export function Sparkline({ values }: { values: number[] }) {
  const w = 80
  const h = 28
  const pad = 3
  const vals = values.map((v) => (Number.isFinite(v) ? v : 0))
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const denom = max - min || 1
  const pts = vals.map((v, i) => {
    const x = pad + (i / Math.max(1, vals.length - 1)) * (w - 2 * pad)
    const y = h - pad - ((v - min) / denom) * (h - 2 * pad)
    return `${x},${y}`
  })
  const { color, arrow } = computeSlope(vals)

  const areaPath = vals.length > 0
    ? `M ${pad},${h - pad} ` +
      pts.map((pt) => `L ${pt}`).join(' ') +
      ` L ${w - pad},${h - pad} Z`
    : ''

  const gradientId = useMemo(() => `sparkGrad-${++sparklineIdCounter}`, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width={w} height={h} role="img" aria-label="trend" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {vals.length > 0 && (
          <circle
            cx={w - pad}
            cy={h - pad - ((vals[vals.length - 1] - min) / denom) * (h - 2 * pad)}
            r={4}
            fill={color}
            stroke="white"
            strokeWidth={1.5}
          />
        )}
      </svg>
      <span style={{
        color,
        fontWeight: 700,
        fontSize: 12,
        minWidth: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {arrow}
      </span>
    </div>
  )
}

export function BarCell({ value, maxValue }: { value: number; maxValue: number }) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 80 }}>
      <div style={{
        flex: 1,
        height: 12,
        background: 'var(--border-light)',
        borderRadius: 6,
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          width: `${Math.min(100, pct)}%`,
          height: '100%',
          background: 'linear-gradient(90deg, var(--accent) 0%, var(--accent-muted) 100%)',
          borderRadius: 6,
          transition: 'width 0.3s ease-out',
        }} />
      </div>
      <span style={{
        fontVariantNumeric: 'tabular-nums',
        minWidth: 46,
        textAlign: 'right',
        fontSize: 12,
        fontWeight: 500,
        color: value > 0 ? 'var(--text)' : 'var(--muted)',
      }}>
        {value > 0 ? value.toLocaleString('de-DE') : '—'}
      </span>
    </div>
  )
}

export function DeltaBadge({ change }: { change: number }) {
  const isPositive = change > 0
  const isNegative = change < 0

  const bgColor = isPositive ? 'var(--success-light)' : isNegative ? 'var(--danger-light)' : 'var(--border-light)'
  const textColor = isPositive ? 'var(--success)' : isNegative ? 'var(--danger)' : 'var(--muted)'
  const icon = isPositive ? '↑' : isNegative ? '↓' : '→'

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px 8px',
      borderRadius: 6,
      background: bgColor,
      color: textColor,
      fontWeight: 600,
      fontSize: 11,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: 10 }}>{icon}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
        {isPositive ? '+' : ''}{Math.round(change).toLocaleString('de-DE')}
      </span>
    </div>
  )
}

export function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating)
  const hasHalf = rating - fullStars >= 0.3 && rating - fullStars < 0.8
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {[...Array(fullStars)].map((_, i) => (
        <span key={`full-${i}`} style={{ color: STAR_COLORS.filled, fontSize: 12 }}>★</span>
      ))}
      {hasHalf && <span style={{ color: STAR_COLORS.filled, fontSize: 12, opacity: 0.6 }}>★</span>}
      {[...Array(emptyStars)].map((_, i) => (
        <span key={`empty-${i}`} style={{ color: STAR_COLORS.empty, fontSize: 12 }}>★</span>
      ))}
      <span style={{ marginLeft: 4, fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>
        {rating.toFixed(1)}
      </span>
    </div>
  )
}
