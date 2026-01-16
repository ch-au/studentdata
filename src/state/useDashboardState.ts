import { useEffect, useMemo, useState } from 'react'
import type { Filters, LineKey } from '../types'

type UseDashboardStateArgs = {
  defaultFilters: Filters | null
}

function parseBool(value: string | null, fallback: boolean) {
  if (value == null) return fallback
  return value === '1' || value === 'true'
}

function parseFiltersFromUrl(defaults: Filters): Filters {
  const params = new URLSearchParams(window.location.search)
  const show: Record<LineKey, boolean> = {
    HAW_Public: parseBool(params.get('hawPublic'), defaults.show.HAW_Public),
    HAW_Privat: parseBool(params.get('hawPrivat'), defaults.show.HAW_Privat),
    Uni_Public: parseBool(params.get('uniPublic'), defaults.show.Uni_Public),
    Uni_Privat: parseBool(params.get('uniPrivat'), defaults.show.Uni_Privat),
    HSMZ: parseBool(params.get('hsmz'), defaults.show.HSMZ),
  }

  return {
    fachbereich: params.get('fb') ?? defaults.fachbereich,
    studienfach: (params.get('sf') as Filters['studienfach']) ?? defaults.studienfach,
    baselineYear: Number(params.get('base') ?? defaults.baselineYear),
    yearFrom: Number(params.get('from') ?? defaults.yearFrom),
    yearTo: Number(params.get('to') ?? defaults.yearTo),
    highlightUniversity: params.get('hi') ?? defaults.highlightUniversity,
    show,
  }
}

function writeFiltersToUrl(filters: Filters) {
  const params = new URLSearchParams()
  params.set('fb', filters.fachbereich)
  params.set('sf', filters.studienfach)
  params.set('base', String(filters.baselineYear))
  params.set('from', String(filters.yearFrom))
  params.set('to', String(filters.yearTo))
  params.set('hi', filters.highlightUniversity)
  params.set('hawPublic', String(Number(filters.show.HAW_Public)))
  params.set('hawPrivat', String(Number(filters.show.HAW_Privat)))
  params.set('uniPublic', String(Number(filters.show.Uni_Public)))
  params.set('uniPrivat', String(Number(filters.show.Uni_Privat)))
  params.set('hsmz', String(Number(filters.show.HSMZ)))
  const url = `${window.location.pathname}?${params.toString()}`
  window.history.replaceState({}, '', url)
}

export function useDashboardState({ defaultFilters }: UseDashboardStateArgs) {
  const [filters, setFilters] = useState<Filters | null>(null)

  const effectiveDefault = useMemo(() => defaultFilters, [defaultFilters])

  useEffect(() => {
    if (!effectiveDefault) return
    if (filters == null) {
      const fromUrl = parseFiltersFromUrl(effectiveDefault)
      setFilters(fromUrl)
    }
  }, [filters, effectiveDefault])

  useEffect(() => {
    if (!filters) return
    writeFiltersToUrl(filters)
  }, [filters])

  const reset = () => {
    if (effectiveDefault) setFilters(effectiveDefault)
  }

  return { filters, setFilters, reset }
}
