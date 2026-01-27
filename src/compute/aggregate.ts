import type { DataRow, DegreePanel, Filters, LineKey, Point, Series } from '../types'
import { getLineStyle } from '../style/seriesStyle'

export type ScaleMode = 'index' | 'absolute' | 'share'

function computeIndex(valuesByYear: Map<number, number>, baselineYear: number): Point[] {
  const years = [...valuesByYear.keys()].sort((a, b) => a - b)
  if (years.length === 0) return []

  const findBaseYear = () => {
    const baseVal = valuesByYear.get(baselineYear)
    if (baseVal != null && baseVal !== 0) return baselineYear
    for (const y of years) {
      const v = valuesByYear.get(y) ?? 0
      if (v !== 0) return y
    }
    return years[0]
  }

  const usedBaseline = findBaseYear()
  const base = valuesByYear.get(usedBaseline) ?? 0
  return years.map((year) => {
    const value = valuesByYear.get(year) ?? 0
    const index = base === 0 ? 0 : (value / base) * 100
    return { year, value, index }
  })
}

function computeAbsolute(valuesByYear: Map<number, number>): Point[] {
  const years = [...valuesByYear.keys()].sort((a, b) => a - b)
  return years.map((year) => {
    const value = valuesByYear.get(year) ?? 0
    return { year, value, index: value } // index stores absolute value for unified rendering
  })
}

function computeShare(valuesByYear: Map<number, number>, totalsByYear: Map<number, number>): Point[] {
  const years = [...valuesByYear.keys()].sort((a, b) => a - b)
  return years.map((year) => {
    const value = valuesByYear.get(year) ?? 0
    const total = totalsByYear.get(year) ?? 0
    const share = total === 0 ? 0 : (value / total) * 100
    return { year, value, index: share } // index stores share percentage for unified rendering
  })
}

function inRange(year: number, from: number, to: number) {
  return year >= from && year <= to
}

export function buildPanels(
  rows: DataRow[],
  filters: Filters,
  scaleMode: ScaleMode = 'index',
  compareUniversities: string[] = [],
  degreeFilter: 'Alle' | 'Bachelor' | 'Master' = 'Alle',
): DegreePanel[] {
  // Determine which degrees to process
  const degrees: Array<'Bachelor' | 'Master' | 'Alle'> = 
    degreeFilter === 'Alle' ? ['Alle'] : [degreeFilter]

  const filtered = rows.filter((r) => {
    if (filters.fachbereich && r.fachbereich !== filters.fachbereich) return false
    if (filters.studienfach !== 'ALL' && r.studienfach !== filters.studienfach) return false
    if (!inRange(r.jahr, filters.yearFrom, filters.yearTo)) return false
    // Kirchlich is intentionally excluded from the 4-category lines; keep it only for HSMZ highlight if applicable.
    return true
  })

  const panels: DegreePanel[] = []

  for (const degree of degrees) {
    // For 'Alle', use all rows; otherwise filter by specific degree
    const byDegree = degree === 'Alle' 
      ? filtered 
      : filtered.filter((r) => r.abschluss === degree)

    // Compute total per year for market share calculation
    const totalsByYear = new Map<number, number>()
    for (const r of byDegree) {
      if (r.traeger !== 'Public' && r.traeger !== 'Privat') continue
      totalsByYear.set(r.jahr, (totalsByYear.get(r.jahr) ?? 0) + r.insgesamt)
    }

    const seriesList: Series[] = []
    const lineDefs: Array<{ key: LineKey; pick: (r: DataRow) => boolean }> = [
      { key: 'HAW_Public', pick: (r) => r.typ === 'HAW' && r.traeger === 'Public' },
      { key: 'HAW_Privat', pick: (r) => r.typ === 'HAW' && r.traeger === 'Privat' },
      { key: 'Uni_Public', pick: (r) => r.typ === 'Uni' && r.traeger === 'Public' },
      { key: 'Uni_Privat', pick: (r) => r.typ === 'Uni' && r.traeger === 'Privat' },
    ]

    const computePoints = (m: Map<number, number>) => {
      if (scaleMode === 'index') return computeIndex(m, filters.baselineYear)
      if (scaleMode === 'share') return computeShare(m, totalsByYear)
      return computeAbsolute(m)
    }

    for (const def of lineDefs) {
      if (!filters.show[def.key]) continue
      const m = new Map<number, number>()
      for (const r of byDegree) {
        if (!def.pick(r)) continue
        m.set(r.jahr, (m.get(r.jahr) ?? 0) + r.insgesamt)
      }
      const points = computePoints(m)
      const style = getLineStyle(def.key)
      seriesList.push({ key: def.key, label: style.label, color: style.color, points })
    }

    // Add comparison universities (before HSMZ so highlight is always on top)
    const compareColors = ['#8b5cf6', '#14b8a6', '#f97316'] // purple, teal, orange
    for (let i = 0; i < compareUniversities.length && i < 3; i++) {
      const uniName = compareUniversities[i]
      if (uniName === filters.highlightUniversity) continue // skip if same as highlight
      const m = new Map<number, number>()
      for (const r of byDegree) {
        if (r.hochschule !== uniName) continue
        m.set(r.jahr, (m.get(r.jahr) ?? 0) + r.insgesamt)
      }
      if (m.size === 0) continue
      const points = computePoints(m)
      const shortName = uniName.length > 25 ? uniName.substring(0, 22) + '...' : uniName
      seriesList.push({
        key: `compare_${i}` as LineKey,
        label: shortName,
        color: compareColors[i],
        points,
      })
    }

    if (filters.show.HSMZ) {
      const m = new Map<number, number>()
      for (const r of byDegree) {
        if (r.hochschule !== filters.highlightUniversity) continue
        m.set(r.jahr, (m.get(r.jahr) ?? 0) + r.insgesamt)
      }
      const points = computePoints(m)
      // Use fachbereich-specific color for HSMZ
      const style = getLineStyle('HSMZ', filters.fachbereich)
      seriesList.push({ key: 'HSMZ', label: style.label, color: style.color, points })
    }

    panels.push({ degree, series: seriesList })
  }

  return panels
}

export function buildHoveredUniversitySeries(
  rows: DataRow[],
  filters: Filters,
  hoveredUniversity: string | null,
  scaleMode: ScaleMode = 'index',
  degreeFilter: 'Alle' | 'Bachelor' | 'Master' = 'Alle',
): Series | null {
  if (!hoveredUniversity) return null
  if (hoveredUniversity === filters.highlightUniversity) return null

  const filtered = rows.filter((r) => {
    if (filters.fachbereich && r.fachbereich !== filters.fachbereich) return false
    if (filters.studienfach !== 'ALL' && r.studienfach !== filters.studienfach) return false
    if (r.jahr < filters.yearFrom || r.jahr > filters.yearTo) return false
    if (degreeFilter !== 'Alle' && r.abschluss !== degreeFilter) return false
    return r.hochschule === hoveredUniversity
  })

  if (filtered.length === 0) return null

  const m = new Map<number, number>()
  for (const r of filtered) {
    m.set(r.jahr, (m.get(r.jahr) ?? 0) + r.insgesamt)
  }

  const totalsByYear = new Map<number, number>()
  for (const r of rows) {
    if (filters.fachbereich && r.fachbereich !== filters.fachbereich) continue
    if (filters.studienfach !== 'ALL' && r.studienfach !== filters.studienfach) continue
    if (r.jahr < filters.yearFrom || r.jahr > filters.yearTo) continue
    if (degreeFilter !== 'Alle' && r.abschluss !== degreeFilter) continue
    if (r.traeger !== 'Public' && r.traeger !== 'Privat') continue
    totalsByYear.set(r.jahr, (totalsByYear.get(r.jahr) ?? 0) + r.insgesamt)
  }

  let points: Point[]
  if (scaleMode === 'index') {
    const years = [...m.keys()].sort((a, b) => a - b)
    const baseVal = m.get(filters.baselineYear) ?? m.get(years[0]) ?? 0
    points = years.map((year) => {
      const value = m.get(year) ?? 0
      const index = baseVal === 0 ? 0 : (value / baseVal) * 100
      return { year, value, index }
    })
  } else if (scaleMode === 'share') {
    const years = [...m.keys()].sort((a, b) => a - b)
    points = years.map((year) => {
      const value = m.get(year) ?? 0
      const total = totalsByYear.get(year) ?? 0
      const share = total === 0 ? 0 : (value / total) * 100
      return { year, value, index: share }
    })
  } else {
    const years = [...m.keys()].sort((a, b) => a - b)
    points = years.map((year) => {
      const value = m.get(year) ?? 0
      return { year, value, index: value }
    })
  }

  const shortName = hoveredUniversity.length > 25 
    ? hoveredUniversity.substring(0, 22) + '...' 
    : hoveredUniversity

  return {
    key: 'compare_0' as LineKey,
    label: shortName,
    color: '#059669',
    points,
  }
}

export function buildOverviewIndex(
  rows: DataRow[],
  opts: {
    degree: 'Bachelor' | 'Master'
    baselineYear: number
    yearFrom: number
    yearTo: number
  },
): Array<{ fachbereich: string; points: Point[] }> {
  const { degree, baselineYear, yearFrom, yearTo } = opts
  const byFb = new Map<string, Map<number, number>>()
  for (const r of rows) {
    if (r.abschluss !== degree) continue
    if (r.traeger !== 'Public' && r.traeger !== 'Privat') continue
    if (r.jahr < yearFrom || r.jahr > yearTo) continue
    const fb = r.fachbereich
    const m = byFb.get(fb) ?? new Map<number, number>()
    m.set(r.jahr, (m.get(r.jahr) ?? 0) + r.insgesamt)
    byFb.set(fb, m)
  }
  const out: Array<{ fachbereich: string; points: Point[] }> = []
  for (const [fachbereich, m] of byFb.entries()) {
    out.push({ fachbereich, points: computeIndex(m, baselineYear) })
  }
  out.sort((a, b) => a.fachbereich.localeCompare(b.fachbereich))
  return out
}

export function buildOverviewFachbereichLines(
  rows: DataRow[],
  opts: {
    degree: 'Bachelor' | 'Master'
    baselineYear: number
    yearFrom: number
    yearTo: number
    highlightUniversity: string
    show: {
      HAW_Public: boolean
      HAW_Privat: boolean
      Uni_Public: boolean
      Uni_Privat: boolean
    }
  },
): Array<{ fachbereich: string; series: Series[] }> {
  const { degree, baselineYear, yearFrom, yearTo, highlightUniversity, show } = opts

  const years = Array.from({ length: yearTo - yearFrom + 1 }, (_, i) => yearFrom + i)

  const fachbereiche = new Set<string>()
  for (const r of rows) fachbereiche.add(r.fachbereich)

  const lineDefs: Array<{ key: LineKey; pick: (r: DataRow) => boolean }> = [
    { key: 'HAW_Public', pick: (r) => r.typ === 'HAW' && r.traeger === 'Public' },
    { key: 'HAW_Privat', pick: (r) => r.typ === 'HAW' && r.traeger === 'Privat' },
    { key: 'Uni_Public', pick: (r) => r.typ === 'Uni' && r.traeger === 'Public' },
    { key: 'Uni_Privat', pick: (r) => r.typ === 'Uni' && r.traeger === 'Privat' },
  ]

  const out: Array<{ fachbereich: string; series: Series[] }> = []

  for (const fb of Array.from(fachbereiche).sort()) {
    const scoped = rows.filter((r) => {
      if (r.abschluss !== degree) return false
      if (r.fachbereich !== fb) return false
      if (r.jahr < yearFrom || r.jahr > yearTo) return false
      // keep same scope as main lines
      if (r.traeger !== 'Public' && r.traeger !== 'Privat') return false
      return true
    })

    const seriesList: Series[] = []

    for (const def of lineDefs) {
      if (def.key === 'HAW_Public' && !show.HAW_Public) continue
      if (def.key === 'HAW_Privat' && !show.HAW_Privat) continue
      if (def.key === 'Uni_Public' && !show.Uni_Public) continue
      if (def.key === 'Uni_Privat' && !show.Uni_Privat) continue
      const m = new Map<number, number>()
      for (const y of years) m.set(y, 0)
      for (const r of scoped) {
        if (!def.pick(r)) continue
        m.set(r.jahr, (m.get(r.jahr) ?? 0) + r.insgesamt)
      }
      const points = computeIndex(m, baselineYear)
      const style = getLineStyle(def.key)
      seriesList.push({ key: def.key, label: style.label, color: style.color, points })
    }

    // HSMZ always included as comparison (only within the fachbereich)
    {
      const m = new Map<number, number>()
      for (const y of years) m.set(y, 0)
      for (const r of scoped) {
        if (r.hochschule !== highlightUniversity) continue
        m.set(r.jahr, (m.get(r.jahr) ?? 0) + r.insgesamt)
      }
      const points = computeIndex(m, baselineYear)
      // Use fachbereich-specific color for HSMZ
      const style = getLineStyle('HSMZ', fb)
      seriesList.push({ key: 'HSMZ', label: style.label, color: style.color, points })
    }

    out.push({ fachbereich: fb, series: seriesList })
  }

  return out
}

