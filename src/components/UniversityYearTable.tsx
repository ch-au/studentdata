import { useMemo, useState } from 'react'
import type { DataRow, Filters } from '../types'
import { getTraegerBadge, getTypeBadge } from '../style/seriesStyle'

type Props = {
  rows: DataRow[]
  filters: Filters
  degree: 'Alle' | 'Bachelor' | 'Master'
  focusYear: number | null
  institutionFilter?: null | { typ: 'HAW' | 'Uni'; traeger: 'Public' | 'Privat' }
  onHoverUniversity?: (university: string | null) => void
  onShowInfo?: (university: string) => void
}

type Row = {
  hochschule: string
  typ: string
  traeger: string
  byYear: Record<number, number>
  total: number
  trend: number
}

type SortKey = 'hochschule' | 'typ' | 'traeger' | 'total' | 'trend' | { year: number }
type SortDir = 'asc' | 'desc'
type SortMode = 'auto' | 'manual'

function isYearKey(k: SortKey): k is { year: number } {
  return typeof k === 'object' && k != null && 'year' in k
}

function sortKeyToId(k: SortKey) {
  return isYearKey(k) ? `year:${k.year}` : k
}

function sameKey(a: SortKey, b: SortKey) {
  return sortKeyToId(a) === sortKeyToId(b)
}

function computeSlope(values: number[]): { slope: number; color: string; arrow: string } {
  const nonzero = values.filter((v) => Number.isFinite(v) && v > 0)
  if (nonzero.length < 2) return { slope: 0, color: '#9ca3af', arrow: '→' }
  const first = nonzero[0]
  const last = nonzero[nonzero.length - 1]
  const change = ((last - first) / first) * 100
  if (change > 5) return { slope: change, color: '#16a34a', arrow: '↑' }
  if (change < -5) return { slope: change, color: '#dc2626', arrow: '↓' }
  return { slope: change, color: '#9ca3af', arrow: '→' }
}

function Sparkline({ values }: { values: number[] }) {
  const w = 56
  const h = 18
  const pad = 2
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
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <svg width={w} height={h} role="img" aria-label="trend">
        <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {/* End dot */}
        {vals.length > 0 && (
          <circle
            cx={w - pad}
            cy={h - pad - ((vals[vals.length - 1] - min) / denom) * (h - 2 * pad)}
            r={3}
            fill={color}
          />
        )}
      </svg>
      <span style={{ color, fontWeight: 600, fontSize: 10, minWidth: 16 }}>
        {arrow}
      </span>
    </div>
  )
}

function BarCell({ value, maxValue }: { value: number; maxValue: number }) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 70 }}>
      <div style={{ 
        flex: 1, 
        height: 5, 
        background: 'var(--border-light)', 
        borderRadius: 3,
        overflow: 'hidden'
      }}>
        <div style={{ 
          width: `${Math.min(100, pct)}%`, 
          height: '100%', 
          background: 'var(--accent)',
          opacity: 0.7,
          borderRadius: 3
        }} />
      </div>
      <span style={{ fontVariantNumeric: 'tabular-nums', minWidth: 42, textAlign: 'right', fontSize: 11 }}>
        {value > 0 ? value.toLocaleString('de-DE') : '—'}
      </span>
    </div>
  )
}

export function UniversityYearTable({ rows, filters, degree, focusYear, institutionFilter, onHoverUniversity, onShowInfo }: Props) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const years = useMemo(() => {
    const ys: number[] = []
    for (let y = filters.yearFrom; y <= filters.yearTo; y++) ys.push(y)
    return ys
  }, [filters.yearFrom, filters.yearTo])

  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir; mode: SortMode }>({
    key: 'total',
    dir: 'desc',
    mode: 'auto',
  })

  const autoKey: SortKey = useMemo(() => {
    const y = focusYear && focusYear >= filters.yearFrom && focusYear <= filters.yearTo ? focusYear : null
    return y ? { year: y } : 'total'
  }, [focusYear, filters.yearFrom, filters.yearTo])

  const effectiveSort = useMemo(() => {
    return sort.mode === 'auto' ? { ...sort, key: autoKey } : sort
  }, [sort, autoKey])

  const { table, maxByYear, maxTotal } = useMemo(() => {
    const map = new Map<string, Row>()
    const maxByYear: Record<number, number> = {}
    let maxTotal = 0

    for (const r of rows) {
      // Filter by degree: 'Alle' shows both Bachelor and Master
      if (degree !== 'Alle' && r.abschluss !== degree) continue
      if (r.fachbereich !== filters.fachbereich) continue
      if (filters.studienfach !== 'ALL' && r.studienfach !== filters.studienfach) continue
      if (r.jahr < filters.yearFrom || r.jahr > filters.yearTo) continue
      if (r.traeger !== 'Public' && r.traeger !== 'Privat') continue
      if (institutionFilter) {
        if (r.typ !== institutionFilter.typ) continue
        if (r.traeger !== institutionFilter.traeger) continue
      }

      const key = `${r.hochschule}|||${r.typ}|||${r.traeger}`
      const existing = map.get(key)
      if (!existing) {
        map.set(key, { hochschule: r.hochschule, typ: r.typ, traeger: r.traeger, byYear: {}, total: 0, trend: 0 })
      }
      const row = map.get(key)!
      row.byYear[r.jahr] = (row.byYear[r.jahr] ?? 0) + r.insgesamt
      row.total += r.insgesamt
    }

    const list = [...map.values()]
    
    // Calculate trend (slope) for each row
    for (const row of list) {
      const values = years.map((y) => row.byYear[y] ?? 0)
      const { slope } = computeSlope(values)
      row.trend = slope
    }
    
    // Compute max values for bar scaling
    for (const row of list) {
      for (const y of years) {
        const val = row.byYear[y] ?? 0
        maxByYear[y] = Math.max(maxByYear[y] ?? 0, val)
      }
      maxTotal = Math.max(maxTotal, row.total)
    }

    const dirMul = effectiveSort.dir === 'asc' ? 1 : -1
    const key = effectiveSort.key
    list.sort((a, b) => {
      if (key === 'hochschule') return dirMul * a.hochschule.localeCompare(b.hochschule)
      if (key === 'typ') return dirMul * a.typ.localeCompare(b.typ)
      if (key === 'traeger') return dirMul * a.traeger.localeCompare(b.traeger)
      if (key === 'total') return dirMul * (a.total - b.total)
      if (key === 'trend') return dirMul * (a.trend - b.trend)
      if (isYearKey(key)) return dirMul * ((a.byYear[key.year] ?? 0) - (b.byYear[key.year] ?? 0))
      return 0
    })
    return { table: { list }, maxByYear, maxTotal }
  }, [
    rows,
    degree,
    filters.fachbereich,
    filters.studienfach,
    filters.yearFrom,
    filters.yearTo,
    institutionFilter?.typ,
    institutionFilter?.traeger,
    effectiveSort.key,
    effectiveSort.dir,
    years,
  ])

  function clickHeader(nextKey: SortKey) {
    setSort((prev) => {
      const isSame = sameKey(prev.mode === 'auto' ? autoKey : prev.key, nextKey)
      const nextDir: SortDir =
        isSame ? (prev.dir === 'asc' ? 'desc' : 'asc') : isYearKey(nextKey) || nextKey === 'total' ? 'desc' : 'asc'
      return { key: nextKey, dir: nextDir, mode: 'manual' }
    })
  }

  const focusColYear = isYearKey(autoKey) ? autoKey.year : null
  const sortYear = isYearKey(effectiveSort.key) ? effectiveSort.key.year : null

  return (
    <div className="tableWrap">
      <table className="dataTable">
        <thead>
          <tr>
            <th style={{ width: 40 }}>Rang</th>
            <th className="sortable" style={{ width: 80 }} onClick={() => clickHeader('trend')}>
              Trend {sameKey(effectiveSort.key, 'trend') ? (effectiveSort.dir === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th className="sortable stickyCol" style={{ maxWidth: 220 }} onClick={() => clickHeader('hochschule')}>
              Hochschule {sameKey(effectiveSort.key, 'hochschule') ? (effectiveSort.dir === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th className="sortable" style={{ width: 56 }} onClick={() => clickHeader('typ')}>
              Typ {sameKey(effectiveSort.key, 'typ') ? (effectiveSort.dir === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th className="sortable" style={{ width: 72 }} onClick={() => clickHeader('traeger')}>
              Träger {sameKey(effectiveSort.key, 'traeger') ? (effectiveSort.dir === 'asc' ? '▲' : '▼') : ''}
            </th>
            {years.map((y) => (
              <th
                key={y}
                className={[
                  'sortable',
                  focusColYear === y ? 'focusCol' : '',
                  sortYear === y ? 'sortCol' : '',
                ].join(' ')}
                onClick={() => clickHeader({ year: y })}
                style={{ minWidth: 90 }}
              >
                {y} {sortYear === y ? (effectiveSort.dir === 'asc' ? '▲' : '▼') : ''}
              </th>
            ))}
            <th className="sortable" style={{ minWidth: 110 }} onClick={() => clickHeader('total')}>
              Summe {sameKey(effectiveSort.key, 'total') ? (effectiveSort.dir === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th style={{ minWidth: 90 }}>Details</th>
          </tr>
        </thead>
        <tbody>
          {table.list.map((r, idx) => {
            const isHighlight = r.hochschule === filters.highlightUniversity
            const isHovered = hoveredRow === r.hochschule
            const rowKey = `${r.hochschule}|||${r.typ}|||${r.traeger}`
            
            return (
              <tr 
                key={rowKey}
                style={{
                  background: isHighlight 
                    ? 'var(--accent-light)' 
                    : isHovered 
                      ? 'var(--bg)' 
                      : undefined,
                  transition: 'background 0.1s',
                  cursor: 'pointer',
                }}
                onMouseEnter={() => {
                  setHoveredRow(r.hochschule)
                  onHoverUniversity?.(r.hochschule)
                }}
                onMouseLeave={() => {
                  setHoveredRow(null)
                  onHoverUniversity?.(null)
                }}
              >
                <td style={{ 
                  fontWeight: 700, 
                  color: isHighlight ? 'var(--accent)' : 'var(--muted)',
                  textAlign: 'center',
                }}>
                  {idx + 1}
                </td>
                <td>
                  <Sparkline values={years.map((y) => r.byYear[y] ?? 0)} />
                </td>
                <td 
                  className="stickyCol" 
                  style={{ 
                    background: isHighlight 
                      ? 'var(--accent-light)' 
                      : isHovered 
                        ? 'var(--bg)' 
                        : undefined,
                    fontWeight: isHighlight ? 700 : 500,
                    color: isHighlight ? 'var(--accent)' : 'var(--text)',
                    maxWidth: 220,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textAlign: 'left',
                  }}
                  title={r.hochschule}
                >
                  {isHighlight && (
                    <span style={{ 
                      display: 'inline-block',
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      marginRight: 6,
                      verticalAlign: 'middle',
                    }} />
                  )}
                  {r.hochschule.length > 32 ? r.hochschule.slice(0, 29) + '...' : r.hochschule}
                </td>
                <td>
                  {(() => {
                    const b = getTypeBadge(r.typ as 'HAW' | 'Uni')
                    return (
                      <span className="badge" style={{ background: b.bg, color: b.fg, borderColor: b.border }}>
                        {b.text}
                      </span>
                    )
                  })()}
                </td>
                <td>
                  {(() => {
                    const b = getTraegerBadge(r.traeger as 'Public' | 'Privat')
                    return (
                      <span className="badge" style={{ background: b.bg, color: b.fg, borderColor: b.border }}>
                        {b.text}
                      </span>
                    )
                  })()}
                </td>
                {years.map((y) => (
                  <td 
                    key={y} 
                    className={focusColYear === y ? 'focusCol' : undefined}
                    style={isHighlight && focusColYear === y ? { background: 'var(--accent-light)' } : undefined}
                  >
                    <BarCell value={r.byYear[y] ?? 0} maxValue={maxByYear[y] ?? 1} />
                  </td>
                ))}
                <td>
                  <BarCell value={Math.round(r.total)} maxValue={maxTotal} />
                </td>
                <td>
                  <button 
                    className="infoButton"
                    onClick={(e) => {
                      e.stopPropagation()
                      onShowInfo?.(r.hochschule)
                    }}
                  >
                    Mehr erfahren
                  </button>
                </td>
              </tr>
            )
          })}
          {table.list.length === 0 && (
            <tr>
              <td colSpan={7 + years.length} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                Keine Daten für diese Filter gefunden.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
