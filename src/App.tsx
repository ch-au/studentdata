import { useMemo, useState } from 'react'
import { useData } from './data/useData'
import type { Filters, LineKey } from './types'
import { buildPanels, type ScaleMode } from './compute/aggregate'
import { IndexLineChart } from './charts/IndexLineChart'
import { UniversityYearTable } from './components/UniversityYearTable'
import { buildBumpSeries } from './compute/bump'
import { BumpChart } from './charts/BumpChart'
import { getLineStyle } from './style/seriesStyle'
import { useDashboardState } from './state/useDashboardState'
import { KpiPanel } from './components/KpiPanel'
import { DataQualityHints } from './components/DataQualityHints'
import { CommandBar } from './components/CommandBar'
import { FachbereichOverview } from './components/FachbereichOverview'

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

    // Default to last 5 years for compact view
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
  const [tableInstitutionFilter, setTableInstitutionFilter] = useState<null | { typ: 'HAW' | 'Uni'; traeger: 'Public' | 'Privat' }>(null)
  const [compareUniversities] = useState<string[]>([])
  const [hoveredUniversity, setHoveredUniversity] = useState<string | null>(null)

  const effectiveFilters = filters ?? defaultFilters
  const rows = state.status === 'ready' ? state.rows : []
  const focusYear = pinnedYear ?? hoverYear

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

  // Early returns AFTER hooks (to satisfy Rules of Hooks)
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
      <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
        <div className="panel">
          <h2 style={{ color: '#dc2626', marginBottom: 12 }}>Fehler beim Laden</h2>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#fef2f2', padding: 16, borderRadius: 8 }}>{state.error}</pre>
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
      {/* Command Bar - replaces sidebar + toolbar */}
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


      {/* Main content - now full width */}
      <main className="mainContent">
        <div id="chartExportRoot">
          {view === 'detail' ? (
            <>
              {/* KPI Panel */}
              <div className="panel" style={{ padding: 12 }}>
                <KpiPanel rows={rows} filters={effectiveFilters} degree={tableDegree} compact={true} />
              </div>
              
              {/* Data Quality Hints */}
              <DataQualityHints 
                panels={panels}
                yearFrom={effectiveFilters.yearFrom}
                yearTo={effectiveFilters.yearTo}
                highlightUniversity={effectiveFilters.highlightUniversity}
              />
              
              {/* Pinned year indicator */}
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
              
              {/* Charts */}
              <div className="chartsGrid">
                <IndexLineChart
                  title={tableDegree === 'Alle' ? 'Timeline – Gesamt' : `Timeline – ${tableDegree}`}
                  panels={panels}
                  scaleMode={scaleMode}
                  compact={true}
                  onHoverYear={(y) => setHoverYear(y)}
                  onSelectYear={(y) => setPinnedYear(y)}
                  onSelectLine={(k) => {
                    if (k === 'HAW_Public') setTableInstitutionFilter({ typ: 'HAW', traeger: 'Public' })
                    if (k === 'HAW_Privat') setTableInstitutionFilter({ typ: 'HAW', traeger: 'Privat' })
                    if (k === 'Uni_Public') setTableInstitutionFilter({ typ: 'Uni', traeger: 'Public' })
                    if (k === 'Uni_Privat') setTableInstitutionFilter({ typ: 'Uni', traeger: 'Privat' })
                  }}
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
              
              {/* Table section */}
              <div className="panel" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ marginBottom: 2, fontSize: 14 }}>Detailtabelle</h3>
                    <p className="muted" style={{ margin: 0, fontSize: 11 }}>
                      Studienanfänger pro Hochschule und Jahr
                    </p>
                  </div>
                  {tableInstitutionFilter && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {(() => {
                        const key =
                          tableInstitutionFilter.typ === 'HAW' && tableInstitutionFilter.traeger === 'Public'
                            ? ('HAW_Public' as const)
                            : tableInstitutionFilter.typ === 'HAW' && tableInstitutionFilter.traeger === 'Privat'
                              ? ('HAW_Privat' as const)
                              : tableInstitutionFilter.typ === 'Uni' && tableInstitutionFilter.traeger === 'Public'
                                ? ('Uni_Public' as const)
                                : ('Uni_Privat' as const)
                        const style = getLineStyle(key)
                        return (
                          <>
                            <span className="badge" style={{ borderColor: style.color, color: style.color, background: `${style.color}10` }}>
                              <span className="dot" style={{ background: style.color, marginRight: 6 }} />
                              {style.label}
                            </span>
                            <button onClick={() => setTableInstitutionFilter(null)} style={{ padding: '4px 8px', fontSize: 11 }}>
                              ×
                            </button>
                          </>
                        )
                      })()}
                    </div>
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
            /* Overview view - Bachelor/Master side by side */
            <div className="panel" style={{ padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ marginBottom: 4 }}>Fachbereiche im Vergleich</h2>
                <p className="muted" style={{ margin: 0 }}>
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
                  // For Gesamt, use 'Alle' in detail view
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
