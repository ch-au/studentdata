import { memo, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { DegreePanel, LineKey, Series } from '../types'
import type { ScaleMode } from '../compute/aggregate'
import { ChartTooltip, type TooltipRow } from '../components/ChartTooltip'

type Props = {
  title: string
  panels: DegreePanel[]
  scaleMode?: ScaleMode
  compact?: boolean
  onHoverYear?: (year: number | null) => void
  onSelectYear?: (year: number) => void
  onSelectLine?: (key: LineKey) => void
}

type TooltipState = null | {
  x: number
  y: number
  year: number
  rows: TooltipRow[]
  containerWidth: number
}

function lastPoint(s: Series) {
  return s.points[s.points.length - 1]
}

function IndexLineChartComponent({ title, panels, scaleMode = 'index', compact = false, onHoverYear, onSelectYear, onSelectLine }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [tooltip, setTooltip] = useState<TooltipState>(null)
  const [hoveredLine, setHoveredLine] = useState<LineKey | null>(null)

  const isAbsolute = scaleMode === 'absolute'
  const isShare = scaleMode === 'share'

  const allYears = useMemo(() => {
    const years = new Set<number>()
    for (const p of panels) for (const s of p.series) for (const pt of s.points) years.add(pt.year)
    return [...years].sort((a, b) => a - b)
  }, [panels])

  const allIndexValues = useMemo(() => {
    const vals: number[] = []
    for (const p of panels) for (const s of p.series) for (const pt of s.points) vals.push(pt.index)
    return vals
  }, [panels])

  const dims = compact 
    ? { width: 560, heightPerPanel: 220, margin: { top: 16, right: 24, bottom: 28, left: isAbsolute ? 56 : 44 } }
    : { width: 1000, heightPerPanel: 280, margin: { top: 20, right: 40, bottom: 32, left: isAbsolute ? 72 : isShare ? 52 : 56 } }
  const width = dims.width
  const height = dims.heightPerPanel

  const x = d3
    .scaleLinear()
    .domain(d3.extent(allYears) as [number, number])
    .range([dims.margin.left, width - dims.margin.right])

  // Dynamic Y-axis that fits the data with padding
  const yDomain: [number, number] = useMemo(() => {
    const max = d3.max(allIndexValues) ?? 120
    const min = d3.min(allIndexValues) ?? 0
    const range = max - min
    const padding = range * 0.15 // 15% padding
    
    if (isAbsolute) {
      // For absolute, start at 0 but give headroom
      return [0, max + padding]
    }
    if (isShare) {
      // For market share, fit to actual data range
      const bottom = Math.max(0, min - padding)
      const top = Math.min(100, max + padding)
      return [bottom, top]
    }
    // For index, fit to actual data range but ensure 100% baseline is visible if in range
    const bottom = Math.max(0, min - padding)
    const top = max + padding
    return [bottom, top]
  }, [allIndexValues, isAbsolute, isShare])

  const y = d3.scaleLinear().domain(yDomain).nice().range([height - dims.margin.bottom, dims.margin.top])

  const line = d3
    .line<{ year: number; index: number }>()
    .x((d) => x(d.year))
    .y((d) => y(d.index))
    .curve(d3.curveMonotoneX)
    .defined((d) => Number.isFinite(d.index))

  function handleMove(panelIdx: number, ev: React.MouseEvent<SVGElement>) {
    const svg = ev.currentTarget.closest('svg') as SVGSVGElement
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const containerRect = containerRef.current?.getBoundingClientRect()
    const mx = ev.clientX - rect.left
    const my = ev.clientY - rect.top
    const yearFloat = x.invert(mx)
    const nearestYear = d3.least(allYears, (yy) => Math.abs(yy - yearFloat))
    if (nearestYear == null) return

    const prevYear = nearestYear - 1
    const panel = panels[panelIdx]
    const rows: TooltipRow[] = panel.series
      .map((s) => {
        const pt = s.points.find((p) => p.year === nearestYear)
        if (!pt) return null
        const prevPt = s.points.find((p) => p.year === prevYear)
        return { 
          color: s.color, 
          label: s.label, 
          value: pt.index,
          previousValue: prevPt?.index,
          isHighlight: s.key === 'HSMZ',
        } as TooltipRow
      })
      .filter((r): r is TooltipRow => r !== null)

    setTooltip({ 
      x: mx + 16, 
      y: my + 16, 
      year: nearestYear, 
      rows,
      containerWidth: containerRect?.width ?? rect.width
    })
    onHoverYear?.(nearestYear)
  }

  function handleLeave() {
    setTooltip(null)
    setHoveredLine(null)
    onHoverYear?.(null)
  }

  function handleLineClick(key: LineKey) {
    if (key !== 'HSMZ' && !key.startsWith('compare_')) {
      onSelectLine?.(key)
    }
  }

  function handleYearClick() {
    if (tooltip) {
      onSelectYear?.(tooltip.year)
    }
  }

  // Styles
  const gridColor = '#f0f3f6'
  const axisColor = '#e0e5eb'
  const labelColor = '#8b8ba7'

  const formatValue = (val: number) => {
    if (isAbsolute) {
      return Math.round(val).toLocaleString('de-DE')
    }
    if (isShare) {
      return `${val.toFixed(1)}%`
    }
    return `${Math.round(val)}%`
  }

  return (
    <div className="panel" ref={containerRef} style={{ position: 'relative', padding: compact ? 12 : 24 }}>
      <div style={{ marginBottom: compact ? 8 : 16 }}>
        <h3 style={{ fontSize: compact ? 14 : 18, fontWeight: 600, marginBottom: 2 }}>{title}</h3>
        {!compact && (
          <div className="muted">
            {isAbsolute ? 'Absolute Studienanfängerzahlen' : isShare ? 'Marktanteil am Gesamtmarkt (Fachbereich)' : 'Index relativ zum Baseline-Jahr (= 100%)'}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gap: compact ? 12 : 24 }}>
        {panels.map((panel, idx) => (
          <div key={panel.degree}>
            {panels.length > 1 && (
              <div style={{ fontSize: compact ? 11 : 13, fontWeight: 600, color: labelColor, marginBottom: compact ? 4 : 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {panel.degree}
              </div>
            )}
            <svg 
              width="100%" 
              viewBox={`0 0 ${width} ${height}`} 
              role="img" 
              style={{ overflow: 'visible', cursor: 'crosshair' }}
              onMouseMove={(e) => handleMove(idx, e)}
              onMouseLeave={handleLeave}
              onClick={handleYearClick}
            >
              <defs>
                <linearGradient id={`bg-grad-${idx}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fafbfc" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
              </defs>
              
              {/* Background */}
              <rect
                x={dims.margin.left}
                y={dims.margin.top}
                width={width - dims.margin.left - dims.margin.right}
                height={height - dims.margin.top - dims.margin.bottom}
                fill={`url(#bg-grad-${idx})`}
              />

              {/* Horizontal gridlines */}
              <g>
                {y.ticks(compact ? 4 : 5).map((tick) => (
                  <g key={`grid-${tick}`}>
                    <line
                      x1={dims.margin.left}
                      x2={width - dims.margin.right}
                      y1={y(tick)}
                      y2={y(tick)}
                      stroke={gridColor}
                      strokeWidth={1}
                    />
                    <text
                      x={dims.margin.left - 8}
                      y={y(tick)}
                      textAnchor="end"
                      dominantBaseline="middle"
                      fontSize={compact ? 9 : 11}
                      fill={labelColor}
                      fontWeight={500}
                    >
                      {isAbsolute ? Math.round(tick).toLocaleString('de-DE') : isShare ? `${tick.toFixed(0)}%` : `${Math.round(tick)}%`}
                    </text>
                  </g>
                ))}
              </g>

              {/* X axis line */}
              <line
                x1={dims.margin.left}
                x2={width - dims.margin.right}
                y1={height - dims.margin.bottom}
                y2={height - dims.margin.bottom}
                stroke={axisColor}
                strokeWidth={1}
              />

              {/* X axis labels */}
              <g>
                {allYears.map((yr) => (
                  <text
                    key={yr}
                    x={x(yr)}
                    y={height - dims.margin.bottom + (compact ? 14 : 20)}
                    textAnchor="middle"
                    fontSize={compact ? 9 : 11}
                    fill={labelColor}
                    fontWeight={500}
                  >
                    {compact ? String(yr).slice(-2) : yr}
                  </text>
                ))}
              </g>

              {/* Lines - clickable with hover effect */}
              <g>
                {panel.series.map((s) => {
                  const isClickable = s.key !== 'HSMZ' && !s.key.startsWith('compare_')
                  const isHovered = hoveredLine === s.key
                  return (
                    <path
                      key={s.key}
                      d={line(s.points.map((p) => ({ year: p.year, index: p.index }))) ?? undefined}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={s.key === 'HSMZ' ? (compact ? 2.5 : 4) : isHovered ? (compact ? 3 : 4) : (compact ? 1.5 : 2.5)}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={hoveredLine && !isHovered && s.key !== 'HSMZ' ? 0.3 : s.key === 'HSMZ' ? 1 : 0.85}
                      style={{ 
                        cursor: isClickable ? 'pointer' : 'default',
                        transition: 'opacity 0.15s, stroke-width 0.15s',
                        pointerEvents: 'stroke',
                      }}
                      onMouseEnter={() => isClickable && setHoveredLine(s.key)}
                      onMouseLeave={() => setHoveredLine(null)}
                      onClick={(e) => {
                        if (isClickable) {
                          e.stopPropagation()
                          handleLineClick(s.key)
                        }
                      }}
                    />
                  )
                })}
              </g>

              {/* Points - clickable with hover effect */}
              <g>
                {panel.series.flatMap((s) => {
                  const isClickable = s.key !== 'HSMZ' && !s.key.startsWith('compare_')
                  const isHovered = hoveredLine === s.key
                  return s.points.map((p) => (
                    <circle
                      key={`${s.key}-${p.year}`}
                      cx={x(p.year)}
                      cy={y(p.index)}
                      r={s.key === 'HSMZ' ? (compact ? 3.5 : 5) : isHovered ? (compact ? 4 : 5) : (compact ? 2.5 : 4)}
                      fill={s.color}
                      stroke="#fff"
                      strokeWidth={compact ? 1 : 2}
                      opacity={hoveredLine && !isHovered && s.key !== 'HSMZ' ? 0.3 : 1}
                      style={{ 
                        cursor: isClickable ? 'pointer' : 'default',
                        transition: 'opacity 0.15s, r 0.15s',
                      }}
                      onMouseEnter={() => isClickable && setHoveredLine(s.key)}
                      onMouseLeave={() => setHoveredLine(null)}
                      onClick={(e) => {
                        if (isClickable) {
                          e.stopPropagation()
                          handleLineClick(s.key)
                        }
                      }}
                    />
                  ))
                })}
              </g>
            </svg>
            {/* Legend below chart */}
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: compact ? '4px 6px' : '8px 12px', 
              marginTop: compact ? 6 : 10,
              paddingTop: compact ? 6 : 10,
              borderTop: '1px solid var(--border-light)'
            }}>
              {panel.series.map((s) => {
                const lp = lastPoint(s)
                const isClickable = s.key !== 'HSMZ' && !s.key.startsWith('compare_')
                const isHovered = hoveredLine === s.key
                return (
                  <div 
                    key={s.key}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: compact ? 4 : 6,
                      cursor: isClickable ? 'pointer' : 'default',
                      padding: compact ? '2px 6px' : '4px 8px',
                      borderRadius: 4,
                      background: s.key === 'HSMZ' ? 'var(--accent-light)' : isHovered ? 'var(--bg)' : 'transparent',
                      border: isClickable ? '1px solid transparent' : 'none',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={() => isClickable && setHoveredLine(s.key)}
                    onMouseLeave={() => setHoveredLine(null)}
                    onClick={() => {
                      if (isClickable) handleLineClick(s.key)
                    }}
                  >
                    <span 
                      style={{ 
                        width: compact ? 8 : 10, 
                        height: compact ? 8 : 10, 
                        borderRadius: '50%', 
                        background: s.color,
                        flexShrink: 0,
                      }} 
                    />
                    <span style={{ 
                      fontSize: compact ? 10 : 12, 
                      fontWeight: s.key === 'HSMZ' ? 600 : 500,
                      color: isHovered ? 'var(--text)' : 'var(--text-secondary)',
                    }}>
                      {compact ? s.label.replace(' (Public)', '').replace(' (Privat)', ' Priv.') : s.label}
                    </span>
                    {lp && (
                      <span style={{ 
                        fontSize: compact ? 10 : 12, 
                        fontWeight: 600,
                        color: 'var(--text)',
                      }}>
                        {formatValue(lp.index)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {tooltip && (
        <ChartTooltip
          year={tooltip.year}
          rows={tooltip.rows}
          formatValue={formatValue}
          showDelta={true}
          style={{ 
            // Position tooltip on left side if near right edge
            ...(tooltip.x > tooltip.containerWidth * 0.65 
              ? { right: tooltip.containerWidth - tooltip.x + 16, left: 'auto' }
              : { left: tooltip.x + 16 }
            ),
            top: tooltip.y 
          }}
        />
      )}
    </div>
  )
}

export const IndexLineChart = memo(IndexLineChartComponent)
