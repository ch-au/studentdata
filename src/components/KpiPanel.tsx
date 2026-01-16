import { useMemo } from 'react'
import type { DataRow, Filters } from '../types'

type Props = {
  rows: DataRow[]
  filters: Filters
  degree: 'Alle' | 'Bachelor' | 'Master'
  compact?: boolean
}

export function KpiPanel({ rows, filters, degree, compact = false }: Props) {
  const stats = useMemo(() => {
    const scoped = rows.filter((r) => {
      // Filter by degree: 'Alle' shows both Bachelor and Master
      if (degree !== 'Alle' && r.abschluss !== degree) return false
      if (r.fachbereich !== filters.fachbereich) return false
      if (filters.studienfach !== 'ALL' && r.studienfach !== filters.studienfach) return false
      if (r.jahr < filters.yearFrom || r.jahr > filters.yearTo) return false
      return true
    })
    const byYear = new Map<number, number>()
    const byYearHsmz = new Map<number, number>()
    for (const r of scoped) {
      byYear.set(r.jahr, (byYear.get(r.jahr) ?? 0) + r.insgesamt)
      if (r.hochschule === filters.highlightUniversity) {
        byYearHsmz.set(r.jahr, (byYearHsmz.get(r.jahr) ?? 0) + r.insgesamt)
      }
    }
    const years = Array.from(byYear.keys()).sort((a, b) => a - b)
    const last = years[years.length - 1]
    const prev = years[years.length - 2]
    const total = Array.from(byYear.values()).reduce((a, b) => a + b, 0)
    const lastVal = last != null ? byYear.get(last) ?? 0 : 0
    const prevVal = prev != null ? byYear.get(prev) ?? 0 : 0
    const yoy = prevVal ? ((lastVal - prevVal) / prevVal) * 100 : 0
    const hsmzLast = last != null ? byYearHsmz.get(last) ?? 0 : 0
    const hsmzShare = lastVal ? (hsmzLast / lastVal) * 100 : 0
    return { total, last, lastVal, prev, prevVal, yoy, hsmzShare }
  }, [rows, filters.fachbereich, filters.studienfach, filters.yearFrom, filters.yearTo, filters.highlightUniversity, degree])

  const yoyClass = stats.yoy > 0 ? 'positive' : stats.yoy < 0 ? 'negative' : ''

  if (compact) {
    return (
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>Gesamt:</span>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{Math.round(stats.total).toLocaleString('de-DE')}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>{stats.last}:</span>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{Math.round(stats.lastVal).toLocaleString('de-DE')}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>YoY:</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: stats.yoy > 0 ? '#16a34a' : stats.yoy < 0 ? '#dc2626' : 'inherit' }}>
            {stats.prev ? `${stats.yoy > 0 ? '+' : ''}${stats.yoy.toFixed(1)}%` : '—'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>Marktanteil:</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{stats.hsmzShare.toFixed(2)}%</span>
        </div>
      </div>
    )
  }

  return (
    <div className="kpiGrid">
      <div className="kpiCard">
        <div className="kpiLabel">Gesamt (Zeitraum)</div>
        <div className="kpiValue">{Math.round(stats.total).toLocaleString('de-DE')}</div>
      </div>
      <div className="kpiCard">
        <div className="kpiLabel">Letztes Jahr ({stats.last ?? '—'})</div>
        <div className="kpiValue">{Math.round(stats.lastVal).toLocaleString('de-DE')}</div>
      </div>
      <div className="kpiCard">
        <div className="kpiLabel">YoY Veränderung</div>
        <div className={`kpiValue ${yoyClass}`}>
          {stats.prev ? `${stats.yoy > 0 ? '+' : ''}${stats.yoy.toFixed(1)}%` : '—'}
        </div>
      </div>
      <div className="kpiCard">
        <div className="kpiLabel">HSMZ Marktanteil</div>
        <div className="kpiValue accent">{stats.hsmzShare.toFixed(2)}%</div>
      </div>
    </div>
  )
}
