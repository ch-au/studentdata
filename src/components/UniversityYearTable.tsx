import { useMemo, useState, useEffect } from 'react'
import type { DataRow, Filters } from '../types'
import { getTraegerBadge, getTypeBadge } from '../style/seriesStyle'
import { computeSlope, Sparkline, BarCell, DeltaBadge, StarRating } from './TableCells'

type Props = {
  rows: DataRow[]
  filters: Filters
  degree: 'Alle' | 'Bachelor' | 'Master'
  focusYear?: number | null
  institutionFilter?: null | { typ: 'HAW' | 'Uni'; traeger: 'Public' | 'Privat' }
  onHoverUniversity?: (university: string | null) => void
  onShowInfo?: (university: string) => void
}

type UniversityMetadata = {
  rating: number
  votes: number
}

type Row = {
  hochschule: string
  typ: string
  traeger: string
  byYear: Record<number, number>
  total: number
  trend: number
  change: number
  rating?: number
  votes?: number
}

type SortKey = 'hochschule' | 'typ' | 'traeger' | 'total' | 'trend' | 'change' | 'rating' | 'votes' | { year: number }
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

export function UniversityYearTable({ rows, filters, degree, focusYear, institutionFilter, onHoverUniversity, onShowInfo }: Props) {
  const [, setHoveredRow] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<Record<string, UniversityMetadata>>({})
  
  useEffect(() => {
    fetch('/data/university-metadata.json')
      .then(res => res.json())
      .then(data => setMetadata(data))
      .catch(() => {})
  }, [])
  
  const allYears = useMemo(() => {
    const ys: number[] = []
    for (let y = filters.yearFrom; y <= filters.yearTo; y++) ys.push(y)
    return ys
  }, [filters.yearFrom, filters.yearTo])
  
  const years = useMemo(() => {
    return allYears.slice(-3)
  }, [allYears])

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
        map.set(key, { hochschule: r.hochschule, typ: r.typ, traeger: r.traeger, byYear: {}, total: 0, trend: 0, change: 0 })
      }
      const row = map.get(key)!
      row.byYear[r.jahr] = (row.byYear[r.jahr] ?? 0) + r.insgesamt
      row.total += r.insgesamt
    }

    const list = [...map.values()]
    
    // Calculate trend (slope) and change for each row using ALL years
    for (const row of list) {
      const values = allYears.map((y) => row.byYear[y] ?? 0)
      const { slope } = computeSlope(values)
      row.trend = slope
      const firstYear = allYears[0]
      const lastYear = allYears[allYears.length - 1]
      row.change = (row.byYear[lastYear] ?? 0) - (row.byYear[firstYear] ?? 0)
      // Add metadata
      const meta = metadata[row.hochschule]
      if (meta) {
        row.rating = meta.rating
        row.votes = meta.votes
      }
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
      if (key === 'change') return dirMul * (a.change - b.change)
      if (key === 'rating') return dirMul * ((a.rating ?? 0) - (b.rating ?? 0))
      if (key === 'votes') return dirMul * ((a.votes ?? 0) - (b.votes ?? 0))
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
    allYears,
    metadata,
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
            <th className="sortable stickyCol" style={{ maxWidth: 260 }} onClick={() => clickHeader('hochschule')}>
              Hochschule {sameKey(effectiveSort.key, 'hochschule') ? (effectiveSort.dir === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th className="sortable" style={{ width: 120 }} onClick={() => clickHeader('rating')}>
              Studycheck {sameKey(effectiveSort.key, 'rating') ? (effectiveSort.dir === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th className="sortable" style={{ width: 70 }} onClick={() => clickHeader('votes')}>
              Stimmen {sameKey(effectiveSort.key, 'votes') ? (effectiveSort.dir === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th className="sortable" style={{ width: 56 }} onClick={() => clickHeader('typ')}>
              Typ {sameKey(effectiveSort.key, 'typ') ? (effectiveSort.dir === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th className="sortable" style={{ width: 72 }} onClick={() => clickHeader('traeger')}>
              Träger {sameKey(effectiveSort.key, 'traeger') ? (effectiveSort.dir === 'asc' ? '▲' : '▼') : ''}
            </th>
            {years.map((y, i) => (
              <th
                key={y}
                className={[
                  'sortable',
                  focusColYear === y ? 'focusCol' : '',
                  sortYear === y ? 'sortCol' : '',
                  i === 0 ? 'yearColSeparator' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => clickHeader({ year: y })}
                style={{ minWidth: 100 }}
              >
                {y} {sortYear === y ? (effectiveSort.dir === 'asc' ? '▲' : '▼') : ''}
              </th>
            ))}
            <th className="sortable" style={{ minWidth: 110 }} onClick={() => clickHeader('total')}>
              Summe {sameKey(effectiveSort.key, 'total') ? (effectiveSort.dir === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th className="sortable" style={{ minWidth: 100 }} onClick={() => clickHeader('change')}>
              Δ {sameKey(effectiveSort.key, 'change') ? (effectiveSort.dir === 'asc' ? '▲' : '▼') : ''}
            </th>
          </tr>
        </thead>
        <tbody>
          {table.list.map((r, idx) => {
            const isHighlight = r.hochschule === filters.highlightUniversity
            const rowKey = `${r.hochschule}|||${r.typ}|||${r.traeger}`
            
            return (
              <tr 
                key={rowKey}
                className={isHighlight ? 'highlightRow' : undefined}
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
                  <Sparkline values={allYears.map((y) => r.byYear[y] ?? 0)} />
                </td>
                <td 
                  className="stickyCol" 
                  style={{ 
                    fontWeight: isHighlight ? 700 : 500,
                    color: isHighlight ? 'var(--accent)' : 'var(--text)',
                    maxWidth: 260,
                    textAlign: 'left',
                  }}
                  title={r.hochschule}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isHighlight && (
                      <span style={{ 
                        display: 'inline-block',
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        flexShrink: 0,
                      }} />
                    )}
                    <span style={{ 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}>
                      {r.hochschule.length > 28 ? r.hochschule.slice(0, 25) + '...' : r.hochschule}
                    </span>
                    {onShowInfo && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onShowInfo(r.hochschule)
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                          padding: '3px 6px',
                          fontSize: 10,
                          fontWeight: 600,
                          background: 'var(--accent-light)',
                          color: 'var(--accent)',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                        title="Mehr über diese Hochschule erfahren"
                      >
                        <span style={{ fontSize: 11 }}>🤖</span>
                        Info
                      </button>
                    )}
                  </div>
                </td>
                <td>
                  {r.rating ? <StarRating rating={r.rating} /> : <span style={{ color: 'var(--muted)' }}>—</span>}
                </td>
                <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--muted)' }}>
                  {r.votes ? r.votes.toLocaleString('de-DE') : '—'}
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
                {years.map((y, i) => (
                  <td 
                    key={y} 
                    className={[
                      focusColYear === y ? 'focusCol' : '',
                      i === 0 ? 'yearColSeparator' : '',
                    ].filter(Boolean).join(' ') || undefined}
                  >
                    <BarCell value={r.byYear[y] ?? 0} maxValue={maxByYear[y] ?? 1} />
                  </td>
                ))}
                <td>
                  <BarCell value={Math.round(r.total)} maxValue={maxTotal} />
                </td>
                <td style={{ textAlign: 'right' }}>
                  <DeltaBadge change={r.change} />
                </td>
              </tr>
            )
          })}
          {table.list.length === 0 && (
            <tr>
              <td colSpan={9 + years.length} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                Keine Daten für diese Filter gefunden.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
