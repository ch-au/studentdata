import { memo, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { DegreePanel, LineKey, Series } from '../types'
import type { ScaleMode } from '../compute/aggregate'

type Props = {
  title: string
  subtitle?: string
  panels: DegreePanel[]
  scaleMode?: ScaleMode
  compact?: boolean
  onSelectLine?: (key: LineKey) => void
  hoveredUniversitySeries?: Series | null
}

function lastPoint(s: Series) {
  return s.points[s.points.length - 1]
}

function IndexLineChartComponent({ title, subtitle, panels, scaleMode = 'index', compact = false, onSelectLine, hoveredUniversitySeries }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
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
    ? { width: 560, heightPerPanel: 220, margin: { top: 16, right: 120, bottom: 28, left: isAbsolute ? 56 : 44 } }
    : { width: 1000, heightPerPanel: 280, margin: { top: 20, right: 160, bottom: 32, left: isAbsolute ? 72 : isShare ? 52 : 56 } }
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

  function handleLineClick(key: LineKey) {
    if (key !== 'HSMZ' && !key.startsWith('compare_')) {
      onSelectLine?.(key)
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
        {subtitle && (
          <p className="muted chartSubtitle">{subtitle}</p>
        )}
        {!compact && !subtitle && (
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
              style={{ overflow: 'visible' }}
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
                {/* Hovered university reference line */}
                {hoveredUniversitySeries && hoveredUniversitySeries.points.length > 0 && (
                  <path
                    d={line(hoveredUniversitySeries.points.map((p) => ({ year: p.year, index: p.index }))) ?? undefined}
                    fill="none"
                    stroke={hoveredUniversitySeries.color}
                    strokeWidth={compact ? 2.5 : 3.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={compact ? "4 3" : "6 4"}
                    opacity={0.9}
                    style={{ 
                      pointerEvents: 'none',
                      transition: 'opacity 0.15s',
                    }}
                  />
                )}
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
                {/* Hovered university reference points */}
                {hoveredUniversitySeries && hoveredUniversitySeries.points.map((p) => (
                  <circle
                    key={`hovered-${p.year}`}
                    cx={x(p.year)}
                    cy={y(p.index)}
                    r={compact ? 3 : 4}
                    fill={hoveredUniversitySeries.color}
                    stroke="#fff"
                    strokeWidth={compact ? 1 : 1.5}
                    opacity={0.9}
                    style={{ 
                      pointerEvents: 'none',
                      transition: 'opacity 0.15s',
                    }}
                  />
                ))}
              </g>

              {/* Right-side line labels */}
              <g>
                {panel.series.map((s) => {
                  const lp = lastPoint(s)
                  if (!lp) return null
                  const shortLabel = s.key === 'HSMZ' ? 'HS Mainz' : s.label.length > 12 ? s.label.slice(0, 10) + '…' : s.label
                  const valueText = formatValue(lp.index)
                  const isHovered = hoveredLine === s.key
                  const isClickable = s.key !== 'HSMZ' && !s.key.startsWith('compare_')
                  return (
                    <text
                      key={`label-${s.key}`}
                      x={width - dims.margin.right + 8}
                      y={y(lp.index)}
                      fontSize={compact ? 11 : 13}
                      fontWeight={s.key === 'HSMZ' ? 600 : isHovered ? 600 : 500}
                      fill={s.color}
                      dominantBaseline="middle"
                      opacity={hoveredLine && !isHovered && s.key !== 'HSMZ' ? 0.4 : 1}
                      style={{ 
                        transition: 'opacity 0.15s',
                        cursor: isClickable ? 'pointer' : 'default',
                      }}
                      onMouseEnter={() => isClickable && setHoveredLine(s.key)}
                      onMouseLeave={() => setHoveredLine(null)}
                      onClick={() => isClickable && handleLineClick(s.key)}
                    >
                      {shortLabel} {valueText}
                    </text>
                  )
                })}
                {/* Hovered university label */}
                {hoveredUniversitySeries && hoveredUniversitySeries.points.length > 0 && (() => {
                  const lp = hoveredUniversitySeries.points[hoveredUniversitySeries.points.length - 1]
                  const shortLabel = hoveredUniversitySeries.label.length > 12 ? hoveredUniversitySeries.label.slice(0, 10) + '…' : hoveredUniversitySeries.label
                  const valueText = formatValue(lp.index)
                  return (
                    <text
                      x={width - dims.margin.right + 8}
                      y={y(lp.index)}
                      fontSize={compact ? 11 : 13}
                      fontWeight={600}
                      fill={hoveredUniversitySeries.color}
                      dominantBaseline="middle"
                    >
                      {shortLabel} {valueText}
                    </text>
                  )
                })()}
              </g>
            </svg>
          </div>
        ))}
      </div>

    </div>
  )
}

export const IndexLineChart = memo(IndexLineChartComponent)
