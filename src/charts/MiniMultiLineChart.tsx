import * as d3 from 'd3'
import type { Point } from '../types'

export type MiniSeries = {
  key: string
  color: string
  points: Point[]
}

type Props = {
  series: MiniSeries[]
  width?: number
  height?: number
}

export function MiniMultiLineChart({ series, width = 240, height = 64 }: Props) {
  const margin = { top: 6, right: 6, bottom: 6, left: 6 }
  const innerW = width - margin.left - margin.right
  const innerH = height - margin.top - margin.bottom

  const allPoints = series.flatMap((s) => s.points)
  const years = allPoints.map((p) => p.year)
  const vals = allPoints.map((p) => p.index)

  const x = d3
    .scaleLinear()
    .domain(d3.extent(years) as [number, number])
    .range([0, innerW])
  const y = d3
    .scaleLinear()
    .domain([Math.min(0, d3.min(vals) ?? 0), d3.max(vals) ?? 120])
    .nice()
    .range([innerH, 0])

  const line = d3
    .line<Point>()
    .x((d) => x(d.year))
    .y((d) => y(d.index))

  return (
    <svg width={width} height={height} role="img">
      <g transform={`translate(${margin.left},${margin.top})`}>
        {series.map((s) => (
          <path key={s.key} d={line(s.points) ?? undefined} fill="none" stroke={s.color} strokeWidth={2.4} />
        ))}
      </g>
    </svg>
  )
}

