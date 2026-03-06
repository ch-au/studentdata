import { useMemo } from 'react'
import type { DataRow, Filters } from '../types'
import { buildPanels, buildHoveredUniversitySeries, type ScaleMode } from '../compute/aggregate'
import { buildBumpSeries, buildHoveredUniversityBumpSeries } from '../compute/bump'

type UseChartDataParams = {
  rows: DataRow[]
  effectiveFilters: Filters | null
  scaleMode: ScaleMode
  tableDegree: 'Alle' | 'Bachelor' | 'Master'
  topN: number
  hoveredUniversity: string | null
  compareUniversities: string[]
}

export function useChartData({
  rows,
  effectiveFilters,
  scaleMode,
  tableDegree,
  topN,
  hoveredUniversity,
  compareUniversities,
}: UseChartDataParams) {
  const availableStudienfaecher = useMemo(() => {
    const set = new Set<string>()
    if (!effectiveFilters) return []
    for (const r of rows) if (r.fachbereich === effectiveFilters.fachbereich) set.add(r.studienfach)
    return [...set].sort((a, b) => a.localeCompare(b, 'de'))
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

  const hoveredUniversitySeries = useMemo(() => {
    if (!effectiveFilters || !hoveredUniversity) return null
    return buildHoveredUniversitySeries(rows, effectiveFilters, hoveredUniversity, scaleMode, tableDegree)
  }, [rows, effectiveFilters, hoveredUniversity, scaleMode, tableDegree])

  const hoveredUniversityBumpSeries = useMemo(() => {
    if (!effectiveFilters || !hoveredUniversity) return null
    return buildHoveredUniversityBumpSeries(rows, effectiveFilters, hoveredUniversity, tableDegree)
  }, [rows, effectiveFilters, hoveredUniversity, tableDegree])

  return { availableStudienfaecher, panels, bump, hoveredUniversitySeries, hoveredUniversityBumpSeries }
}
