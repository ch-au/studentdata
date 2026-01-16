import type { DegreePanel, Filters, LineKey } from '../types'
import type { ScaleMode } from '../compute/aggregate'
import { CategoryChips } from './CategoryChips'
import { TimeRangePopover } from './TimeRangePopover'
import { ExportButtons } from './ExportButtons'
import { UniversitySearch } from './UniversitySearch'

type Props = {
  // View state
  view: 'detail' | 'overview'
  setView: (view: 'detail' | 'overview') => void
  
  // Filters
  filters: Filters
  setFilters: (filters: Filters) => void
  
  // Data options
  fachbereiche: string[]
  studienfaecher: string[]
  hochschulen: string[]
  yearMin: number
  yearMax: number
  
  // Display options (detail view only)
  tableDegree: 'Alle' | 'Bachelor' | 'Master'
  setTableDegree: (degree: 'Alle' | 'Bachelor' | 'Master') => void
  scaleMode: ScaleMode
  setScaleMode: (mode: ScaleMode) => void
  topN: number
  setTopN: (n: number) => void
  
  // Export
  exportContainerId: string
  panels: DegreePanel[]
  
  // Reset
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
  topN,
  setTopN,
  exportContainerId,
  panels,
  onReset,
}: Props) {
  
  const handleCategoryChange = (key: LineKey, value: boolean) => {
    setFilters({ ...filters, show: { ...filters.show, [key]: value } })
  }

  const handleTimeChange = (values: { yearFrom?: number; yearTo?: number; baselineYear?: number }) => {
    setFilters({ ...filters, ...values })
  }

  return (
    <div className="commandBar">
      {/* Row 1: Data Scope - What am I looking at? */}
      <div className="commandBarRow commandBarPrimary">
        <div className="commandBarGroup">
          <h1 className="appTitle">Studienanfänger Analyse</h1>
          <div className="commandBarDivider" />
          {/* Fachbereich */}
          <select
            value={filters.fachbereich}
            onChange={(e) => setFilters({ ...filters, fachbereich: e.target.value, studienfach: 'ALL' })}
            className="commandSelect primary"
          >
            {fachbereiche.map((fb) => (
              <option key={fb} value={fb}>{fb}</option>
            ))}
          </select>
          {/* Studiengang */}
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
          {/* Highlight University */}
          <UniversitySearch
            value={filters.highlightUniversity}
            options={hochschulen}
            onChange={(value) => setFilters({ ...filters, highlightUniversity: value })}
            placeholder="Fokus-HS..."
          />
          {/* Degree toggle - Alle/Bachelor/Master */}
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
        </div>

        {/* Right: Time range */}
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

      {/* Row 2: Display Options - How do I see it? */}
      <div className="commandBarRow commandBarSecondary">
        <div className="commandBarGroup">
          {/* View toggle */}
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
              {/* Scale mode */}
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

        {/* Center: Category chips */}
        <div className="commandBarGroup commandBarCenter">
          <CategoryChips
            show={filters.show}
            onChange={handleCategoryChange}
          />
        </div>

        {/* Right: Top N + Export */}
        <div className="commandBarGroup commandBarRight">
          {view === 'detail' && (
            <div className="topNControl">
              <span className="commandLabel">Top</span>
              <input
                type="number"
                min={3}
                max={30}
                value={topN}
                onChange={(e) => setTopN(Math.min(30, Math.max(3, Number(e.target.value))))}
                className="topNInput"
              />
            </div>
          )}
          <ExportButtons
            containerId={exportContainerId}
            filenamePrefix={`studienanfaenger_${filters.fachbereich}`}
            filters={filters}
            panels={panels}
          />
        </div>
      </div>
    </div>
  )
}
