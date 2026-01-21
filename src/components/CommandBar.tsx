import type { DegreePanel, Filters } from '../types'
import type { ScaleMode } from '../compute/aggregate'
import { TimeRangePopover } from './TimeRangePopover'
import { UniversitySearch } from './UniversitySearch'

type Props = {
  view: 'detail' | 'overview'
  setView: (view: 'detail' | 'overview') => void
  filters: Filters
  setFilters: (filters: Filters) => void
  fachbereiche: string[]
  studienfaecher: string[]
  hochschulen: string[]
  yearMin: number
  yearMax: number
  tableDegree: 'Alle' | 'Bachelor' | 'Master'
  setTableDegree: (degree: 'Alle' | 'Bachelor' | 'Master') => void
  scaleMode: ScaleMode
  setScaleMode: (mode: ScaleMode) => void
  topN: number
  setTopN: (n: number) => void
  exportContainerId: string
  panels: DegreePanel[]
  onReset: () => void
}

export function CommandBar({
  view,
  setView,
  filters,
  setFilters,
  fachbereiche,
  studienfaecher,
  hochschulen,
  yearMin,
  yearMax,
  tableDegree,
  setTableDegree,
  scaleMode,
  setScaleMode,
  onReset,
}: Props) {

  const handleTimeChange = (values: { yearFrom?: number; yearTo?: number; baselineYear?: number }) => {
    setFilters({ ...filters, ...values })
  }

  return (
    <div className="commandBar">
      <div className="commandBarRow commandBarPrimary">
        <div className="commandBarGroup">
          <select
            value={filters.fachbereich}
            onChange={(e) => setFilters({ ...filters, fachbereich: e.target.value, studienfach: 'ALL' })}
            className="commandSelect primary"
          >
            {fachbereiche.map((fb) => (
              <option key={fb} value={fb}>{fb}</option>
            ))}
          </select>
          {studienfaecher.length > 0 && (
            <select
              value={filters.studienfach}
              onChange={(e) => setFilters({ ...filters, studienfach: e.target.value as Filters['studienfach'] })}
              className="commandSelect secondary"
            >
              <option value="ALL">Alle Studiengänge</option>
              {studienfaecher.map((sf) => (
                <option key={sf} value={sf}>{sf}</option>
              ))}
            </select>
          )}
          <UniversitySearch
            value={filters.highlightUniversity}
            options={hochschulen}
            onChange={(value) => setFilters({ ...filters, highlightUniversity: value })}
            placeholder="Fokus-HS..."
          />
          <div className="commandBarDivider" />
          <div className="segmented">
            <button
              className={tableDegree === 'Alle' ? 'segmentedBtn active' : 'segmentedBtn'}
              onClick={() => setTableDegree('Alle')}
            >
              Alle
            </button>
            <button
              className={tableDegree === 'Bachelor' ? 'segmentedBtn active' : 'segmentedBtn'}
              onClick={() => setTableDegree('Bachelor')}
            >
              BA
            </button>
            <button
              className={tableDegree === 'Master' ? 'segmentedBtn active' : 'segmentedBtn'}
              onClick={() => setTableDegree('Master')}
            >
              MA
            </button>
          </div>
          <div className="commandBarDivider" />
          <div className="segmented">
            <button 
              className={view === 'detail' ? 'segmentedBtn active' : 'segmentedBtn'}
              onClick={() => setView('detail')}
            >
              Detail
            </button>
            <button 
              className={view === 'overview' ? 'segmentedBtn active' : 'segmentedBtn'}
              onClick={() => setView('overview')}
            >
              Übersicht
            </button>
          </div>
          {view === 'detail' && (
            <>
              <div className="segmented small">
                <button
                  className={scaleMode === 'index' ? 'segmentedBtn active' : 'segmentedBtn'}
                  onClick={() => setScaleMode('index')}
                  title="Index (Basisjahr = 100)"
                >
                  Index
                </button>
                <button
                  className={scaleMode === 'absolute' ? 'segmentedBtn active' : 'segmentedBtn'}
                  onClick={() => setScaleMode('absolute')}
                  title="Absolute Zahlen"
                >
                  Absolut
                </button>
                <button
                  className={scaleMode === 'share' ? 'segmentedBtn active' : 'segmentedBtn'}
                  onClick={() => setScaleMode('share')}
                  title="Marktanteil in %"
                >
                  Anteil
                </button>
              </div>
            </>
          )}
        </div>

        <div className="commandBarGroup commandBarRight">
          <TimeRangePopover
            yearFrom={filters.yearFrom}
            yearTo={filters.yearTo}
            baselineYear={filters.baselineYear}
            yearMin={yearMin}
            yearMax={yearMax}
            onChange={handleTimeChange}
          />
          <button 
            onClick={onReset} 
            className="resetButton"
            title="Filter zurücksetzen"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
