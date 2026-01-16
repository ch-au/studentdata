import type { ReactNode } from 'react'

export type TooltipRow = {
  color: string
  label: string
  value: number
  previousValue?: number
  rank?: number
  isHighlight?: boolean
}

type Props = {
  year: number
  rows: TooltipRow[]
  formatValue?: (val: number) => string
  showDelta?: boolean
  showRank?: boolean
  style?: React.CSSProperties
}

function formatDelta(current: number, previous: number): ReactNode {
  if (!previous || previous === 0) return null
  const delta = ((current - previous) / previous) * 100
  const color = delta > 0 ? '#4ade80' : delta < 0 ? '#f87171' : '#9ca3af'
  const prefix = delta > 0 ? '+' : ''
  return (
    <span style={{ color, fontSize: 10, fontWeight: 500 }}>
      {prefix}{delta.toFixed(1)}%
    </span>
  )
}

export function ChartTooltip({ 
  year, 
  rows, 
  formatValue = (v) => Math.round(v).toLocaleString('de-DE'),
  showDelta = false,
  showRank = false,
  style,
}: Props) {
  return (
    <div className="tooltip" style={style}>
      <div style={{ 
        fontSize: 14, 
        fontWeight: 700, 
        marginBottom: 10, 
        borderBottom: '1px solid rgba(255,255,255,0.15)', 
        paddingBottom: 8,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline'
      }}>
        <span>{year}</span>
        {showRank && <span style={{ fontSize: 10, fontWeight: 500, opacity: 0.7 }}>Ranking</span>}
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {rows.map((r, i) => (
          <div 
            key={`${r.label}-${i}`} 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: showRank ? '28px 10px 1fr auto auto' : '10px 1fr auto auto',
              gap: 8, 
              alignItems: 'center',
              opacity: r.isHighlight ? 1 : 0.9,
            }}
          >
            {showRank && r.rank != null && (
              <span style={{ 
                fontWeight: 600, 
                fontSize: 11,
                color: r.isHighlight ? r.color : 'inherit' 
              }}>
                #{r.rank}
              </span>
            )}
            <span 
              style={{ 
                width: 10, 
                height: 10, 
                borderRadius: '50%', 
                background: r.color,
                flexShrink: 0,
              }} 
            />
            <span style={{ 
              fontWeight: r.isHighlight ? 600 : 400,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {r.label}
            </span>
            <span style={{ 
              fontWeight: 600, 
              fontVariantNumeric: 'tabular-nums',
              textAlign: 'right',
            }}>
              {formatValue(r.value)}
            </span>
            {showDelta && r.previousValue != null && (
              <span style={{ minWidth: 48, textAlign: 'right' }}>
                {formatDelta(r.value, r.previousValue)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
