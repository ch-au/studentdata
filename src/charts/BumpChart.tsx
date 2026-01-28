import { memo, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { BumpSeries } from '../compute/bump'
import { getLineStyle } from '../style/seriesStyle'
import { ChartTooltip, type TooltipRow } from '../components/ChartTooltip'

type Props = {
  title: string
  years: number[]
  series: BumpSeries[]
  compact?: boolean
  hoveredUniversity?: string | null
  hoveredBumpSeries?: BumpSeries | null
  fachbereich?: string
}

type TooltipState =
  | null
  | {
      x: number
      y: number
      year: number
      rows: TooltipRow[]
      containerWidth: number
    }

function BumpChartComponent({ title, years, series, compact = false, hoveredUniversity, hoveredBumpSeries, fachbereich }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [tooltip, setTooltip] = useState<TooltipState>(null)
  
  // Find series that matches hovered university in the visible series
  const hoveredSeriesInView = hoveredUniversity 
    ? series.find(s => s.name === hoveredUniversity || (s.isHighlight && s.name.includes(hoveredUniversity.split(' ')[0])))
    : null
  
  // Use the separately computed hoveredBumpSeries if the hovered university isn't in view
  const hoveredSeries = hoveredSeriesInView || hoveredBumpSeries

  // Match IndexLineChart dimensions - use full width with adequate label space
  const dims = compact
    ? { width: 560, height: 220, margin: { top: 16, right: 100, bottom: 28, left: 40 } }
    : { width: 1000, height: 280, margin: { top: 20, right: 140, bottom: 32, left: 56 } }
  const width = dims.width
  const height = dims.height

  // Compute highlight university rank range - this determines the Y-axis
  const highlightRange = useMemo(() => {
    const hs = series.find((s) => s.isHighlight)
    if (!hs || hs.points.length === 0) return { min: 1, max: 10 }
    const ranks = hs.points.map((p) => p.rank)
    return { min: d3.min(ranks) ?? 1, max: d3.max(ranks) ?? 1 }
  }, [series])

  // Y-axis range is based on HSMZ's rank range with padding
  // When a university is hovered, expand to include their rank range too
  const { minRank, maxRank } = useMemo(() => {
    const padding = 3
    let min = highlightRange.min
    let max = highlightRange.max
    
    // If there's a hovered series not in view, expand axis to include it
    if (hoveredBumpSeries && !hoveredSeriesInView) {
      const hoveredRanks = hoveredBumpSeries.points.map(p => p.rank)
      const hoveredMin = d3.min(hoveredRanks) ?? min
      const hoveredMax = d3.max(hoveredRanks) ?? max
      min = Math.min(min, hoveredMin)
      max = Math.max(max, hoveredMax)
    }
    
    return { 
      minRank: Math.max(1, min - padding), 
      maxRank: max + padding
    }
  }, [highlightRange, hoveredBumpSeries, hoveredSeriesInView])

  const x = d3
    .scaleLinear()
    .domain(d3.extent(years) as [number, number])
    .range([dims.margin.left, width - dims.margin.right])

  const y = d3
    .scaleLinear()
    .domain([maxRank + 0.5, minRank - 0.5]) // higher rank numbers at bottom, lower at top
    .range([height - dims.margin.bottom, dims.margin.top])

  const line = d3
    .line<{ year: number; rank: number }>()
    .x((d) => x(d.year))
    .y((d) => y(d.rank))
    .curve(d3.curveMonotoneX)

  const highlightColor = getLineStyle('HSMZ', fachbereich).color
  const gridColor = '#f0f3f6'
  const labelColor = '#8b8ba7'

  function handleMove(ev: React.MouseEvent<SVGElement>) {
    const svg = ev.currentTarget.closest('svg') as SVGSVGElement
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const containerRect = containerRef.current?.getBoundingClientRect()
    const mx = ev.clientX - rect.left
    const my = ev.clientY - rect.top
    const yearFloat = x.invert(mx)
    const nearestYear = d3.least(years, (yy) => Math.abs(yy - yearFloat))
    if (nearestYear == null) return

    const prevYear = nearestYear - 1
    const rows: TooltipRow[] = series
      .map((s) => {
        const p = s.points.find((pt) => pt.year === nearestYear)
        if (!p) return null
        const prevP = s.points.find((pt) => pt.year === prevYear)
        return {
          label: s.isHighlight ? 'HSMZ' : s.name,
          value: p.value,
          previousValue: prevP?.value,
          rank: p.rank,
          color: s.isHighlight ? highlightColor : '#94a3b8',
          isHighlight: s.isHighlight,
        } as TooltipRow
      })
      .filter((r): r is TooltipRow => r !== null)

    rows.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    setTooltip({ 
      x: mx + 16, 
      y: my + 16, 
      year: nearestYear, 
      rows: rows.slice(0, 12),
      containerWidth: containerRect?.width ?? rect.width
    })
  }

  function handleLeave() {
    setTooltip(null)
  }

  return (
    <div className="panel" ref={containerRef} style={{ position: 'relative', padding: compact ? 12 : 24, overflow: 'visible' }}>
      <div style={{ marginBottom: compact ? 8 : 16 }}>
        <h3 style={{ fontSize: compact ? 14 : 18, fontWeight: 600, marginBottom: 2 }}>{title}</h3>
        <div className="muted" style={{ fontSize: compact ? 11 : 13 }}>
          Ranking nach Anzahl an Studienanfänger:innen in der Fächergruppe {fachbereich || 'BWL'}
        </div>
      </div>

      <svg 
        width="100%" 
        viewBox={`0 0 ${width} ${height}`} 
        role="img" 
        style={{ overflow: 'visible', cursor: 'crosshair' }}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
      >
        <defs>
          <linearGradient id="bump-band-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={highlightColor} stopOpacity="0.08" />
            <stop offset="100%" stopColor={highlightColor} stopOpacity="0.03" />
          </linearGradient>
          {/* Clip path to cut off lines outside the Y-axis range */}
          <clipPath id="chart-clip">
            <rect 
              x={dims.margin.left} 
              y={dims.margin.top} 
              width={width - dims.margin.left - dims.margin.right} 
              height={height - dims.margin.top - dims.margin.bottom} 
            />
          </clipPath>
        </defs>

        {/* Rank range band for highlight university */}
        {highlightRange && (
          <rect
            x={dims.margin.left}
            y={y(highlightRange.min - 0.4)}
            width={width - dims.margin.left - dims.margin.right}
            height={y(highlightRange.max + 0.4) - y(highlightRange.min - 0.4)}
            fill="url(#bump-band-grad)"
            rx={4}
          />
        )}

        {/* Horizontal gridlines for visible rank range */}
        <g>
          {Array.from({ length: maxRank - minRank + 1 }, (_, i) => minRank + i)
            .filter((rank) => {
              const rangeSize = maxRank - minRank + 1
              // Show fewer gridlines if range is large
              if (rangeSize > 15) return rank % 5 === 0 || rank === minRank || rank === maxRank
              if (rangeSize > 8) return rank % 2 === 0 || rank === minRank || rank === maxRank
              return true
            })
            .map((rank) => (
            <g key={`rank-${rank}`}>
              <line
                x1={dims.margin.left}
                x2={width - dims.margin.right}
                y1={y(rank)}
                y2={y(rank)}
                stroke={gridColor}
                strokeWidth={1}
              />
              <text
                x={dims.margin.left - 6}
                y={y(rank)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={compact ? 9 : 11}
                fill={labelColor}
                fontWeight={500}
              >
                {rank}
              </text>
            </g>
          ))}
        </g>

        {/* X axis labels */}
        <g>
          {years.map((yr) => (
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

        {/* Clipped chart area - lines and points are clipped to Y-axis range */}
        <g clipPath="url(#chart-clip)">
          {/* Non-highlight lines (background) */}
          <g>
            {series
              .filter((s) => !s.isHighlight)
              .map((s) => {
                const isHovered = hoveredSeries?.name === s.name
                return (
                  <path
                    key={s.name}
                    d={line(s.points.map((p) => ({ year: p.year, rank: p.rank }))) ?? undefined}
                    fill="none"
                    stroke={isHovered ? '#059669' : '#cbd5e1'}
                    strokeWidth={isHovered ? (compact ? 2.5 : 3.5) : (compact ? 1.5 : 2.5)}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={isHovered ? (compact ? "4 3" : "6 4") : undefined}
                    opacity={hoveredSeries && !isHovered ? 0.3 : isHovered ? 1 : 0.6}
                    style={{ transition: 'opacity 0.15s, stroke-width 0.15s, stroke 0.15s' }}
                  />
                )
              })}
          </g>

          {/* Non-highlight points */}
          <g>
            {series
              .filter((s) => !s.isHighlight)
              .flatMap((s) => {
                const isHovered = hoveredSeries?.name === s.name
                return s.points.map((p) => (
                  <circle
                    key={`${s.name}-${p.year}`}
                    cx={x(p.year)}
                    cy={y(p.rank)}
                    r={isHovered ? (compact ? 4 : 5) : (compact ? 2.5 : 4)}
                    fill={isHovered ? '#059669' : '#cbd5e1'}
                    stroke="#fff"
                    strokeWidth={compact ? 1 : 2}
                    opacity={hoveredSeries && !isHovered ? 0.3 : 1}
                    style={{ transition: 'opacity 0.15s, r 0.15s, fill 0.15s' }}
                  />
                ))
              })}
          </g>

          {/* Separately computed hovered university line (when not in visible series) */}
          {hoveredBumpSeries && !hoveredSeriesInView && (
            <g>
              <path
                d={line(hoveredBumpSeries.points.map((p) => ({ year: p.year, rank: p.rank }))) ?? undefined}
                fill="none"
                stroke="#059669"
                strokeWidth={compact ? 2.5 : 3.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={compact ? "4 3" : "6 4"}
                opacity={1}
              />
              {hoveredBumpSeries.points.map((p) => (
                <circle
                  key={`hovered-${p.year}`}
                  cx={x(p.year)}
                  cy={y(p.rank)}
                  r={compact ? 4 : 5}
                  fill="#059669"
                  stroke="#fff"
                  strokeWidth={compact ? 1 : 2}
                />
              ))}
            </g>
          )}

          {/* Highlight line (on top) */}
          <g>
            {series
              .filter((s) => s.isHighlight)
              .map((s) => (
                <path
                  key={s.name}
                  d={line(s.points.map((p) => ({ year: p.year, rank: p.rank }))) ?? undefined}
                  fill="none"
                  stroke={highlightColor}
                  strokeWidth={compact ? 2.5 : 4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={hoveredSeries && !s.isHighlight ? 0.5 : 1}
                  style={{ transition: 'opacity 0.15s' }}
                />
              ))}
          </g>

          {/* Highlight points */}
          <g>
            {series
              .filter((s) => s.isHighlight)
              .flatMap((s) =>
                s.points.map((p) => (
                  <circle
                    key={`${s.name}-${p.year}`}
                    cx={x(p.year)}
                    cy={y(p.rank)}
                    r={compact ? 3.5 : 5}
                    fill={highlightColor}
                    stroke="#fff"
                    strokeWidth={compact ? 1.5 : 2}
                    opacity={hoveredSeries && !s.isHighlight ? 0.5 : 1}
                    style={{ transition: 'opacity 0.15s' }}
                  />
                )),
              )}
          </g>

        </g>

        {/* Left-side start labels - OUTSIDE clipPath so they're visible */}
        <g>
          {series.filter(s => s.isHighlight).map((s) => {
            const fp = s.points[0]
            if (!fp) return null
            return (
              <text
                key={`start-label-${s.name}`}
                x={dims.margin.left - 8}
                y={y(fp.rank)}
                fontSize={compact ? 11 : 13}
                fontWeight={600}
                fill={highlightColor}
                textAnchor="end"
                dominantBaseline="middle"
              >
                #{fp.rank}
              </text>
            )
          })}
          {/* Hovered university start label */}
          {hoveredBumpSeries && !hoveredSeriesInView && (() => {
            const fp = hoveredBumpSeries.points[0]
            if (!fp) return null
            return (
              <text
                x={dims.margin.left - 8}
                y={y(fp.rank)}
                fontSize={compact ? 11 : 13}
                fontWeight={600}
                fill="#059669"
                textAnchor="end"
                dominantBaseline="middle"
              >
                #{fp.rank}
              </text>
            )
          })()}
        </g>

        {/* Right-side line labels - OUTSIDE clipPath so they're visible in the margin */}
        <g>
          {series.filter(s => s.isHighlight).map((s) => {
            const lp = s.points[s.points.length - 1]
            if (!lp) return null
            return (
              <text
                key={`label-${s.name}`}
                x={width - dims.margin.right + 8}
                y={y(lp.rank)}
                fontSize={compact ? 11 : 13}
                fontWeight={600}
                fill={highlightColor}
                dominantBaseline="middle"
              >
                HS Mainz #{lp.rank}
              </text>
            )
          })}
          {/* Hovered university label (when not in visible series) */}
          {hoveredBumpSeries && !hoveredSeriesInView && (() => {
            const lp = hoveredBumpSeries.points[hoveredBumpSeries.points.length - 1]
            if (!lp) return null
            const shortLabel = hoveredBumpSeries.name.length > 12 ? hoveredBumpSeries.name.slice(0, 10) + '…' : hoveredBumpSeries.name
            return (
              <text
                x={width - dims.margin.right + 8}
                y={y(lp.rank)}
                fontSize={compact ? 11 : 13}
                fontWeight={600}
                fill="#059669"
                dominantBaseline="middle"
              >
                {shortLabel} #{lp.rank}
              </text>
            )
          })()}
        </g>
        
      </svg>

      {tooltip && (
        <ChartTooltip
          year={tooltip.year}
          rows={tooltip.rows}
          showRank={true}
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

export const BumpChart = memo(BumpChartComponent)
