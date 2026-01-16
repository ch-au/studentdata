import { useEffect, useMemo, useState } from 'react'
import type { DataRow } from '../types'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; rows: DataRow[] }

export function useData() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const res = await fetch('/data/data.json', { cache: 'no-cache' })
        if (!res.ok) throw new Error(`Failed to load data.json (${res.status})`)
        const raw = (await res.json()) as unknown
        if (!Array.isArray(raw)) throw new Error('data.json is not an array')
        const rows = raw as DataRow[]
        if (!cancelled) setState({ status: 'ready', rows })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (!cancelled) setState({ status: 'error', error: msg })
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  const meta = useMemo(() => {
    if (state.status !== 'ready') return null
    const years = new Set<number>()
    const fachbereiche = new Set<string>()
    const studienfaecher = new Set<string>()
    const hochschulen = new Set<string>()
    for (const r of state.rows) {
      years.add(r.jahr)
      fachbereiche.add(r.fachbereich)
      studienfaecher.add(r.studienfach)
      hochschulen.add(r.hochschule)
    }
    const yearList = [...years].sort((a, b) => a - b)
    return {
      yearMin: yearList[0] ?? 2015,
      yearMax: yearList[yearList.length - 1] ?? 2024,
      fachbereiche: [...fachbereiche].sort(),
      studienfaecher: [...studienfaecher].sort(),
      hochschulen: [...hochschulen].sort(),
    }
  }, [state])

  return { state, meta }
}

