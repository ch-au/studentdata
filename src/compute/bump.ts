import type { DataRow, Filters } from '../types'

export type BumpPoint = {
  year: number
  rank: number
  value: number
}

export type BumpSeries = {
  name: string
  points: BumpPoint[]
  isHighlight: boolean
}

type Opts = {
  degree: 'Alle' | 'Bachelor' | 'Master'
  topN: number // number of universities to show around highlight
  highlightUniversity: string
}

export function buildBumpSeries(rows: DataRow[], filters: Filters, opts: Opts): { 
  years: number[]
  series: BumpSeries[]
  highlightMaxRank: number
  highlightMinRank: number
  totalUniversities: number
  displayMode: 'top' | 'context' // 'top' = show top N, 'context' = show window around HSMZ
} {
  const { degree, topN, highlightUniversity } = opts

  // Filter scope (same as timeline filters; keep only Public/Privat for now)
  const scoped = rows.filter((r) => {
    // 'Alle' includes both Bachelor and Master
    if (degree !== 'Alle' && r.abschluss !== degree) return false
    if (r.fachbereich !== filters.fachbereich) return false
    if (filters.studienfach !== 'ALL' && r.studienfach !== filters.studienfach) return false
    if (r.jahr < filters.yearFrom || r.jahr > filters.yearTo) return false
    if (r.traeger !== 'Public' && r.traeger !== 'Privat') return false
    return true
  })

  const years = Array.from(new Set(scoped.map((r) => r.jahr))).sort((a, b) => a - b)

  // Aggregate value per (uni, year)
  const byUniYear = new Map<string, Map<number, number>>()
  for (const r of scoped) {
    const m = byUniYear.get(r.hochschule) ?? new Map<number, number>()
    m.set(r.jahr, (m.get(r.jahr) ?? 0) + r.insgesamt)
    byUniYear.set(r.hochschule, m)
  }

  const totalUniversities = byUniYear.size

  // Compute TRUE global ranks for ALL universities per year
  const globalRanksByYear = new Map<number, Map<string, number>>()
  for (const y of years) {
    const values: Array<{ uni: string; value: number }> = []
    for (const [uni, m] of byUniYear.entries()) {
      const v = m.get(y) ?? 0
      values.push({ uni, value: v })
    }
    values.sort((a, b) => b.value - a.value)
    const ranks = new Map<string, number>()
    values.forEach((v, idx) => ranks.set(v.uni, idx + 1))
    globalRanksByYear.set(y, ranks)
  }

  // Find the rank range of the highlight university across all years
  let highlightMaxRank = 1
  let highlightMinRank = totalUniversities
  for (const y of years) {
    const rank = globalRanksByYear.get(y)?.get(highlightUniversity) ?? totalUniversities
    highlightMaxRank = Math.max(highlightMaxRank, rank)
    highlightMinRank = Math.min(highlightMinRank, rank)
  }

  // Sort all universities by their average rank
  const uniAvgRanks: Array<{ uni: string; avgRank: number }> = []
  for (const [uni] of byUniYear.entries()) {
    let sum = 0
    for (const y of years) {
      sum += globalRanksByYear.get(y)?.get(uni) ?? totalUniversities
    }
    uniAvgRanks.push({ uni, avgRank: sum / years.length })
  }
  uniAvgRanks.sort((a, b) => a.avgRank - b.avgRank)

  // Decide display mode: if highlight is within topN, show "top" mode
  // Otherwise show "context" mode (window around HSMZ)
  const displayMode = highlightMinRank <= topN + 2 ? 'top' : 'context'

  const picked = new Set<string>()

  if (displayMode === 'top') {
    // Show top N universities (HSMZ is among them)
    for (let i = 0; i < Math.min(topN, uniAvgRanks.length); i++) {
      picked.add(uniAvgRanks[i].uni)
    }
    // Always include highlight
    if (byUniYear.has(highlightUniversity)) {
      picked.add(highlightUniversity)
    }
  } else {
    // Context mode: show ONLY universities with similar AVERAGE rank
    // This ensures a tight, readable group around HSMZ
    const contextSize = 5 // show ±5 universities by average rank
    
    // Find HSMZ's position in the sorted list
    const highlightIdx = uniAvgRanks.findIndex(u => u.uni === highlightUniversity)
    if (highlightIdx >= 0) {
      // Pick universities around HSMZ in the sorted average rank list
      const startIdx = Math.max(0, highlightIdx - contextSize)
      const endIdx = Math.min(uniAvgRanks.length - 1, highlightIdx + contextSize)
      
      for (let i = startIdx; i <= endIdx; i++) {
        picked.add(uniAvgRanks[i].uni)
      }
    }
    
    // Always include highlight
    if (byUniYear.has(highlightUniversity)) {
      picked.add(highlightUniversity)
    }
  }

  // Build series with true global ranks
  const series: BumpSeries[] = []
  for (const uni of picked) {
    const m = byUniYear.get(uni) ?? new Map<number, number>()
    const points: BumpPoint[] = years.map((y) => ({
      year: y,
      value: m.get(y) ?? 0,
      rank: globalRanksByYear.get(y)?.get(uni) ?? 1,
    }))
    series.push({ name: uni, points, isHighlight: uni === highlightUniversity })
  }

  // Keep highlight last so it draws on top in chart
  series.sort((a, b) => Number(a.isHighlight) - Number(b.isHighlight))

  return { years, series, highlightMaxRank, highlightMinRank, totalUniversities, displayMode }
}

