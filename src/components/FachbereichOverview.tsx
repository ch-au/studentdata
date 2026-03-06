import { useMemo } from 'react'
import type { DataRow, Point } from '../types'
import { getLineStyle } from '../style/seriesStyle'
import { getFachbereichColor, CORPORATE_BLUE } from '../style/fachbereichColors'
import { computeIndex } from '../compute/aggregate'

type Props = {
  rows: DataRow[]
  baselineYear: number
  yearFrom: number
  yearTo: number
  highlightUniversity: string
  onSelectFachbereich: (fb: string, degree: 'Bachelor' | 'Master' | 'Gesamt') => void
}

type DegreeData = {
  HAW_Public: Point[]
  HAW_Privat: Point[]
  Uni_Public: Point[]
  Uni_Privat: Point[]
  HSMZ: Point[]
}

type FachbereichData = {
  fachbereich: string
  bachelor: DegreeData
  master: DegreeData
  gesamt: DegreeData
}

function buildDegreeData(
  rows: DataRow[],
  fachbereich: string,
  degree: 'Bachelor' | 'Master' | 'Gesamt',
  yearFrom: number,
  yearTo: number,
  baselineYear: number,
  highlightUniversity: string
): DegreeData {
  const scoped = rows.filter((r) => {
    if (degree !== 'Gesamt' && r.abschluss !== degree) return false
    if (r.fachbereich !== fachbereich) return false
    if (r.jahr < yearFrom || r.jahr > yearTo) return false
    if (r.traeger !== 'Public' && r.traeger !== 'Privat') return false
    return true
  })

  const categories = {
    HAW_Public: new Map<number, number>(),
    HAW_Privat: new Map<number, number>(),
    Uni_Public: new Map<number, number>(),
    Uni_Privat: new Map<number, number>(),
    HSMZ: new Map<number, number>(),
  }

  for (const r of scoped) {
    if (r.typ === 'HAW' && r.traeger === 'Public') {
      categories.HAW_Public.set(r.jahr, (categories.HAW_Public.get(r.jahr) ?? 0) + r.insgesamt)
    }
    if (r.typ === 'HAW' && r.traeger === 'Privat') {
      categories.HAW_Privat.set(r.jahr, (categories.HAW_Privat.get(r.jahr) ?? 0) + r.insgesamt)
    }
    if (r.typ === 'Uni' && r.traeger === 'Public') {
      categories.Uni_Public.set(r.jahr, (categories.Uni_Public.get(r.jahr) ?? 0) + r.insgesamt)
    }
    if (r.typ === 'Uni' && r.traeger === 'Privat') {
      categories.Uni_Privat.set(r.jahr, (categories.Uni_Privat.get(r.jahr) ?? 0) + r.insgesamt)
    }
    if (r.hochschule === highlightUniversity) {
      categories.HSMZ.set(r.jahr, (categories.HSMZ.get(r.jahr) ?? 0) + r.insgesamt)
    }
  }

  return {
    HAW_Public: computeIndex(categories.HAW_Public, baselineYear),
    HAW_Privat: computeIndex(categories.HAW_Privat, baselineYear),
    Uni_Public: computeIndex(categories.Uni_Public, baselineYear),
    Uni_Privat: computeIndex(categories.Uni_Privat, baselineYear),
    HSMZ: computeIndex(categories.HSMZ, baselineYear),
  }
}

type SparklineProps = {
  data: DegreeData
  accentColor: string
  width?: number
  height?: number
}

function Sparkline({ data, accentColor, width = 200, height = 56 }: SparklineProps) {
  const pad = { top: 6, right: 8, bottom: 6, left: 8 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom

  const allPoints = [
    ...data.HAW_Public,
    ...data.HAW_Privat,
    ...data.Uni_Public,
    ...data.Uni_Privat,
    ...data.HSMZ,
  ]

  if (allPoints.length === 0) {
    return (
      <div 
        style={{ 
          width, 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          color: 'var(--muted)', 
          fontSize: 10,
        }}
      >
        —
      </div>
    )
  }

  const years = allPoints.map((p) => p.year)
  const vals = allPoints.map((p) => p.index)
  const minYear = Math.min(...years)
  const maxYear = Math.max(...years)
  
  // Independent Y-axis per row
  const dataMin = Math.min(...vals)
  const dataMax = Math.max(...vals)
  const range = dataMax - dataMin || 20
  const minVal = Math.max(0, dataMin - range * 0.1)
  const maxVal = dataMax + range * 0.1

  const xScale = (year: number) => pad.left + ((year - minYear) / Math.max(1, maxYear - minYear)) * innerW
  const yScale = (val: number) => pad.top + innerH - ((val - minVal) / Math.max(1, maxVal - minVal)) * innerH

  const toPath = (points: Point[]) => {
    if (points.length === 0) return ''
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(p.year)},${yScale(p.index)}`).join(' ')
  }

  const categories = [
    { key: 'HAW_Public', points: data.HAW_Public, style: getLineStyle('HAW_Public') },
    { key: 'HAW_Privat', points: data.HAW_Privat, style: getLineStyle('HAW_Privat') },
    { key: 'Uni_Public', points: data.Uni_Public, style: getLineStyle('Uni_Public') },
    { key: 'Uni_Privat', points: data.Uni_Privat, style: getLineStyle('Uni_Privat') },
  ]

  // HSMZ stats
  const hsmzFirst = data.HSMZ[0]
  const hsmzLast = data.HSMZ[data.HSMZ.length - 1]
  const hsmzChange = hsmzFirst && hsmzLast ? Math.round(hsmzLast.index - hsmzFirst.index) : null
  const hsmzValue = hsmzLast ? Math.round(hsmzLast.index) : null
  const isPositive = hsmzChange !== null && hsmzChange >= 0

  // Gradient for area fill
  const gradientId = `hsmz-g-${Math.random().toString(36).substr(2, 9)}`
  const areaPath = data.HSMZ.length > 0 
    ? toPath(data.HSMZ) + ` L${xScale(data.HSMZ[data.HSMZ.length - 1].year)},${height - pad.bottom} L${xScale(data.HSMZ[0].year)},${height - pad.bottom} Z`
    : ''

  // Check if 100% is in view
  const show100Line = minVal <= 100 && maxVal >= 100

  return (
    <div style={{ position: 'relative', width, height }}>
      <svg width={width} height={height}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.2" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 100% baseline if in view */}
        {show100Line && (
          <line
            x1={pad.left}
            y1={yScale(100)}
            x2={width - pad.right}
            y2={yScale(100)}
            stroke="var(--border)"
            strokeWidth={1}
            strokeDasharray="2,2"
            opacity={0.5}
          />
        )}

        {/* Background lines */}
        {categories.map((c) => (
          <path
            key={c.key}
            d={toPath(c.points)}
            fill="none"
            stroke={c.style.color}
            strokeWidth={1.2}
            strokeLinecap="round"
            opacity={0.3}
          />
        ))}

        {/* HSMZ area */}
        <path d={areaPath} fill={`url(#${gradientId})`} />

        {/* HSMZ line - uses faculty color */}
        <path
          d={toPath(data.HSMZ)}
          fill="none"
          stroke={accentColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* HSMZ endpoint */}
        {hsmzLast && (
          <circle
            cx={xScale(hsmzLast.year)}
            cy={yScale(hsmzLast.index)}
            r={3.5}
            fill="white"
            stroke={accentColor}
            strokeWidth={1.5}
          />
        )}
      </svg>

      {/* Value badge */}
      {hsmzValue !== null && (
        <div className="fbSparkValue">
          <span className="fbSparkNum" style={{ color: accentColor }}>{hsmzValue}%</span>
          {hsmzChange !== null && (
            <span className={`fbSparkChange ${isPositive ? 'positive' : 'negative'}`}>
              {isPositive ? '+' : ''}{hsmzChange}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export function FachbereichOverview({
  rows,
  baselineYear,
  yearFrom,
  yearTo,
  highlightUniversity,
  onSelectFachbereich,
}: Props) {
  const fachbereiche = useMemo(() => {
    const fbSet = new Set<string>()
    for (const r of rows) fbSet.add(r.fachbereich)

    const result: FachbereichData[] = []

    for (const fb of Array.from(fbSet).sort((a, b) => a.localeCompare(b, 'de'))) {
      result.push({
        fachbereich: fb,
        bachelor: buildDegreeData(rows, fb, 'Bachelor', yearFrom, yearTo, baselineYear, highlightUniversity),
        master: buildDegreeData(rows, fb, 'Master', yearFrom, yearTo, baselineYear, highlightUniversity),
        gesamt: buildDegreeData(rows, fb, 'Gesamt', yearFrom, yearTo, baselineYear, highlightUniversity),
      })
    }

    return result
  }, [rows, baselineYear, yearFrom, yearTo, highlightUniversity])

  const hsmzShort = highlightUniversity
    .replace(' (FH)', '')
    .replace('Hochschule ', 'HS ')

  return (
    <div className="fbOverview">
      {/* Compact legend bar - corporate blue */}
      <div className="fbLegendBar" style={{ background: CORPORATE_BLUE }}>
        <div className="fbLegendMain">
          <span className="fbLegendDot" style={{ background: 'white' }} />
          <span>{hsmzShort}</span>
        </div>
        <div className="fbLegendOthers">
          <span><span className="fbLegendDot" style={{ background: getLineStyle('HAW_Public').color }} />HAW</span>
          <span><span className="fbLegendDot" style={{ background: getLineStyle('HAW_Privat').color }} />HAW Priv.</span>
          <span><span className="fbLegendDot" style={{ background: getLineStyle('Uni_Public').color }} />Uni</span>
          <span><span className="fbLegendDot" style={{ background: getLineStyle('Uni_Privat').color }} />Uni Priv.</span>
        </div>
      </div>

      {/* Grid */}
      <div className="fbGrid">
        {/* Header row */}
        <div className="fbGridHeader">
          <div></div>
          <div>Gesamt</div>
          <div>Bachelor</div>
          <div>Master</div>
        </div>

        {/* Data rows */}
        {fachbereiche.map((fb, idx) => {
          const fbColor = getFachbereichColor(fb.fachbereich)
          
          return (
            <div key={fb.fachbereich} className={`fbGridRow ${idx % 2 === 1 ? 'alt' : ''}`}>
              <div className="fbGridLabel">
                <span 
                  className="fbColorBar" 
                  style={{ background: fbColor }}
                />
                {fb.fachbereich}
              </div>
              <button className="fbGridCell" onClick={() => onSelectFachbereich(fb.fachbereich, 'Gesamt')}>
                <Sparkline data={fb.gesamt} accentColor={fbColor} />
              </button>
              <button className="fbGridCell" onClick={() => onSelectFachbereich(fb.fachbereich, 'Bachelor')}>
                <Sparkline data={fb.bachelor} accentColor={fbColor} />
              </button>
              <button className="fbGridCell" onClick={() => onSelectFachbereich(fb.fachbereich, 'Master')}>
                <Sparkline data={fb.master} accentColor={fbColor} />
              </button>
            </div>
          )
        })}
      </div>

      {/* Faculty color legend */}
      <div className="fbColorLegend">
        <span className="fbColorLegendItem">
          <span className="fbColorSwatch" style={{ background: getFachbereichColor('BWL') }} />
          Wirtschaft
        </span>
        <span className="fbColorLegendItem">
          <span className="fbColorSwatch" style={{ background: getFachbereichColor('Gestaltung') }} />
          Gestaltung
        </span>
        <span className="fbColorLegendItem">
          <span className="fbColorSwatch" style={{ background: getFachbereichColor('Technik') }} />
          Technik
        </span>
      </div>
    </div>
  )
}
