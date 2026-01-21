import { useMemo, useState, useCallback } from 'react'
import { useData } from './data/useData'
import type { Filters, LineKey } from './types'
import { buildPanels, type ScaleMode } from './compute/aggregate'
import { IndexLineChart } from './charts/IndexLineChart'
import { UniversityYearTable } from './components/UniversityYearTable'
import { buildBumpSeries } from './compute/bump'
import { BumpChart } from './charts/BumpChart'
import { useDashboardState } from './state/useDashboardState'
import { KpiPanel } from './components/KpiPanel'
import { DataQualityHints } from './components/DataQualityHints'
import { CommandBar } from './components/CommandBar'
import { FachbereichOverview } from './components/FachbereichOverview'
import { FilterBadge } from './components/FilterBadge'

type InstitutionFilter = null | { typ: 'HAW' | 'Uni'; traeger: 'Public' | 'Privat' }

function getFilterKey(filter: InstitutionFilter): LineKey {
  if (!filter) return 'HAW_Public'
  if (filter.typ === 'HAW' && filter.traeger === 'Public') return 'HAW_Public'
  if (filter.typ === 'HAW' && filter.traeger === 'Privat') return 'HAW_Privat'
  if (filter.typ === 'Uni' && filter.traeger === 'Public') return 'Uni_Public'
  return 'Uni_Privat'
}

function App() {
  const { state, meta } = useData()

  const defaultFilters: Filters | null = useMemo(() => {
    if (state.status !== 'ready' || !meta) return null

    const defaultFb = meta.fachbereiche[0] ?? ''
    const defaultHighlight =
      meta.hochschulen.find((h) => h === 'Hochschule Mainz (FH)') ?? meta.hochschulen[0] ?? ''

    const show: Record<LineKey, boolean> = {
      HAW_Public: true,
      HAW_Privat: true,
      Uni_Public: true,
      Uni_Privat: true,
      HSMZ: true,
    }

    const defaultYearFrom = Math.max(meta.yearMin, meta.yearMax - 4)
    
    return {
      fachbereich: defaultFb,
      studienfach: 'ALL',
      baselineYear: defaultYearFrom,
      yearFrom: defaultYearFrom,
      yearTo: meta.yearMax,
      highlightUniversity: defaultHighlight,
      show,
    }
  }, [state.status, meta])

  const { filters, setFilters, reset } = useDashboardState({ defaultFilters })
  const [view, setView] = useState<'detail' | 'overview'>('detail')
  const [scaleMode, setScaleMode] = useState<ScaleMode>('index')
  const [topN, setTopN] = useState<number>(10)
  const [hoverYear, setHoverYear] = useState<number | null>(null)
  const [pinnedYear, setPinnedYear] = useState<number | null>(null)
  const [tableDegree, setTableDegree] = useState<'Alle' | 'Bachelor' | 'Master'>('Alle')
  const [tableInstitutionFilter, setTableInstitutionFilter] = useState<InstitutionFilter>(null)
  const [compareUniversities] = useState<string[]>([])
  const [hoveredUniversity, setHoveredUniversity] = useState<string | null>(null)

  const effectiveFilters = filters ?? defaultFilters
  const rows = state.status === 'ready' ? state.rows : []
  const focusYear = pinnedYear ?? hoverYear

  const handleLineSelect = useCallback((key: LineKey) => {
    if (key === 'HAW_Public') setTableInstitutionFilter({ typ: 'HAW', traeger: 'Public' })
    else if (key === 'HAW_Privat') setTableInstitutionFilter({ typ: 'HAW', traeger: 'Privat' })
    else if (key === 'Uni_Public') setTableInstitutionFilter({ typ: 'Uni', traeger: 'Public' })
    else if (key === 'Uni_Privat') setTableInstitutionFilter({ typ: 'Uni', traeger: 'Privat' })
  }, [])

  const handleClearFilter = useCallback(() => {
    setTableInstitutionFilter(null)
  }, [])

  const availableStudienfaecher = useMemo(() => {
    const set = new Set<string>()
    if (!effectiveFilters) return []
    for (const r of rows) if (r.fachbereich === effectiveFilters.fachbereich) set.add(r.studienfach)
    return [...set].sort()
  }, [rows, effectiveFilters?.fachbereich])

  const panels = useMemo(() => {
    if (!effectiveFilters)
      return [
        { degree: 'Alle' as const, series: [] },
      ]
    return buildPanels(rows, effectiveFilters, scaleMode, compareUniversities, tableDegree)
  }, [rows, effectiveFilters, scaleMode, compareUniversities, tableDegree])

  const bump = useMemo(() => {
    if (!effectiveFilters) return { 
      years: [] as number[], 
      series: [] as ReturnType<typeof buildBumpSeries>['series'],
      highlightMaxRank: 1,
      highlightMinRank: 1,
      totalUniversities: 0,
      displayMode: 'top' as const,
    }
    return buildBumpSeries(rows, effectiveFilters, {
      degree: tableDegree,
      topN,
      highlightUniversity: effectiveFilters.highlightUniversity,
    })
  }, [
    rows,
    effectiveFilters?.fachbereich,
    effectiveFilters?.studienfach,
    effectiveFilters?.yearFrom,
    effectiveFilters?.yearTo,
    effectiveFilters?.highlightUniversity,
    tableDegree,
    topN,
  ])

  if (state.status === 'loading') {
    return (
      <div className="appShell">
        <div className="panel">
          <div className="loadingState">
            <div className="loadingSpinner" />
            <span>Daten werden geladen...</span>
          </div>
        </div>
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <div className="appShell">
        <div className="panel">
          <h2 className="errorTitle">Fehler beim Laden</h2>
          <pre className="errorContent">{state.error}</pre>
        </div>
      </div>
    )
  }
  if (!effectiveFilters || !meta) {
    return (
      <div className="appShell">
        <div className="panel">
          <div className="loadingState">
            <div className="loadingSpinner" />
            <span>Initialisierung...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="appShell">
      <CommandBar
        view={view}
        setView={setView}
        filters={effectiveFilters}
        setFilters={(next) => setFilters(next)}
        fachbereiche={meta.fachbereiche}
        studienfaecher={availableStudienfaecher}
        hochschulen={meta.hochschulen}
        yearMin={meta.yearMin}
        yearMax={meta.yearMax}
        tableDegree={tableDegree}
        setTableDegree={setTableDegree}
        scaleMode={scaleMode}
        setScaleMode={setScaleMode}
        topN={topN}
        setTopN={setTopN}
        exportContainerId="chartExportRoot"
        panels={panels}
        onReset={reset}
      />

      <main className="mainContent">
        <div id="chartExportRoot">
          {view === 'detail' ? (
            <>
              <div className="panel panelCompact">
                <KpiPanel rows={rows} filters={effectiveFilters} degree={tableDegree} compact={true} />
              </div>
              
              <DataQualityHints 
                panels={panels}
                yearFrom={effectiveFilters.yearFrom}
                yearTo={effectiveFilters.yearTo}
                highlightUniversity={effectiveFilters.highlightUniversity}
              />
              
              {pinnedYear && (
                <div className="pinnedYearBar">
                  <span>Jahr fixiert: <strong>{pinnedYear}</strong></span>
                  <button onClick={() => setPinnedYear(null)} className="pinnedYearClear">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    Aufheben
                  </button>
                </div>
              )}
              
              <div className="chartsGrid">
                <IndexLineChart
                  title={tableDegree === 'Alle' ? 'Timeline – Gesamt' : `Timeline – ${tableDegree}`}
                  panels={panels}
                  scaleMode={scaleMode}
                  compact={true}
                  onHoverYear={setHoverYear}
                  onSelectYear={setPinnedYear}
                  onSelectLine={handleLineSelect}
                />
                <BumpChart
                  title={tableDegree === 'Alle' ? 'Ranking – Gesamt' : `Ranking – ${tableDegree}`}
                  years={bump.years}
                  series={bump.series}
                  compact={true}
                  hoveredUniversity={hoveredUniversity}
                  fachbereich={effectiveFilters.fachbereich}
                  highlightMaxRank={bump.highlightMaxRank}
                  highlightMinRank={bump.highlightMinRank}
                  totalUniversities={bump.totalUniversities}
                  displayMode={bump.displayMode}
                />
              </div>
              
              <div className="panel panelMedium">
                <div className="tableHeader">
                  <div>
                    <h3 className="tableHeaderTitle">Detailtabelle</h3>
                    <p className="muted tableHeaderSubtitle">
                      Studienanfänger pro Hochschule und Jahr
                    </p>
                  </div>
                  {tableInstitutionFilter && (
                    <FilterBadge 
                      filterKey={getFilterKey(tableInstitutionFilter)} 
                      onClear={handleClearFilter} 
                    />
                  )}
                </div>
                <UniversityYearTable
                  rows={rows}
                  filters={effectiveFilters}
                  degree={tableDegree}
                  focusYear={focusYear}
                  institutionFilter={tableInstitutionFilter}
                  onHoverUniversity={setHoveredUniversity}
                />
              </div>
            </>
          ) : (
            <div className="panel panelLarge">
              <div className="overviewHeader">
                <h2 className="overviewTitle">Fachbereiche im Vergleich</h2>
                <p className="muted overviewSubtitle">
                  Index-Entwicklung ({effectiveFilters.yearFrom}–{effectiveFilters.yearTo}). 
                  Klick öffnet Detailansicht.
                </p>
              </div>
              
              <FachbereichOverview
                rows={rows}
                baselineYear={effectiveFilters.baselineYear}
                yearFrom={effectiveFilters.yearFrom}
                yearTo={effectiveFilters.yearTo}
                highlightUniversity={effectiveFilters.highlightUniversity}
                onSelectFachbereich={(fb, degree) => {
                  setFilters({ ...effectiveFilters, fachbereich: fb, studienfach: 'ALL' })
                  setTableDegree(degree === 'Gesamt' ? 'Alle' : degree)
                  setView('detail')
                }}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
