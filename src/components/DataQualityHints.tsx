import { useMemo, useState } from 'react'
import type { DegreePanel } from '../types'

type Props = {
  panels: DegreePanel[]
  yearFrom: number
  yearTo: number
  highlightUniversity: string
}

type Hint = {
  type: 'warning' | 'info'
  message: string
}

export function DataQualityHints({ panels, yearFrom, yearTo, highlightUniversity }: Props) {
  const [expanded, setExpanded] = useState(false)
  
  const hints = useMemo(() => {
    const result: Hint[] = []
    const expectedYears = Array.from({ length: yearTo - yearFrom + 1 }, (_, i) => yearFrom + i)

    for (const panel of panels) {
      for (const series of panel.series) {
        const seriesYears = new Set(series.points.map((p) => p.year))
        const missingYears = expectedYears.filter((y) => !seriesYears.has(y))
        
        // Check for missing years
        if (missingYears.length > 0 && missingYears.length < expectedYears.length) {
          const label = series.key === 'HSMZ' ? highlightUniversity : series.label
          result.push({
            type: 'warning',
            message: `${panel.degree} – ${label}: Daten fehlen für ${missingYears.join(', ')}`,
          })
        }

        // Check for zero values in available years
        const zeroYears = series.points.filter((p) => p.value === 0).map((p) => p.year)
        if (zeroYears.length > 0 && zeroYears.length < series.points.length) {
          const label = series.key === 'HSMZ' ? highlightUniversity : series.label
          result.push({
            type: 'info',
            message: `${panel.degree} – ${label}: Nullwerte in ${zeroYears.join(', ')}`,
          })
        }

        // Check for very sparse series
        if (series.points.length > 0 && series.points.length < Math.min(3, expectedYears.length)) {
          const label = series.key === 'HSMZ' ? highlightUniversity : series.label
          result.push({
            type: 'warning',
            message: `${panel.degree} – ${label}: Nur ${series.points.length} Datenpunkte verfügbar`,
          })
        }

        // Check if HSMZ has no data at all
        if (series.key === 'HSMZ' && series.points.length === 0) {
          result.push({
            type: 'warning',
            message: `${panel.degree} – ${highlightUniversity}: Keine Daten für diesen Fachbereich`,
          })
        }
      }
    }

    // Deduplicate and limit
    const seen = new Set<string>()
    return result.filter((h) => {
      if (seen.has(h.message)) return false
      seen.add(h.message)
      return true
    }).slice(0, 8)
  }, [panels, yearFrom, yearTo, highlightUniversity])

  if (hints.length === 0) return null

  const warningCount = hints.filter(h => h.type === 'warning').length

  return (
    <div className="dataQualityHints">
      <button 
        className="dataQualityToggle"
        onClick={() => setExpanded(!expanded)}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span>{warningCount} Datenhinweis{warningCount !== 1 ? 'e' : ''}</span>
        <svg 
          width="10" 
          height="10" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          style={{ 
            marginLeft: 'auto',
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s'
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      
      {expanded && (
        <div className="dataQualityList">
          {hints.map((hint, i) => (
            <div 
              key={i} 
              className={`dataQualityItem ${hint.type}`}
            >
              {hint.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
