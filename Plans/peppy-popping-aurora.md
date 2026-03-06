# Plan: Extract `useChartData` hook from App.tsx

## Context

App.tsx is flagged as a "monster function" (>150 LOC) by desloppify. The component mixes state declarations, 5 derived-data `useMemo` blocks, and JSX rendering in a single ~300 line function. Extracting the compute logic into a custom hook will reduce App.tsx by ~50 lines and cleanly separate concerns.

## New file: `src/data/useChartData.ts`

**Params** (single options object):
```typescript
type UseChartDataParams = {
  rows: DataRow[]
  effectiveFilters: Filters | null
  scaleMode: ScaleMode
  tableDegree: 'Alle' | 'Bachelor' | 'Master'
  topN: number
  hoveredUniversity: string | null
  compareUniversities: string[]
}
```

**Returns:** `{ availableStudienfaecher, panels, bump, hoveredUniversitySeries, hoveredUniversityBumpSeries }`

**Contains** the 5 `useMemo` blocks moved verbatim from App.tsx:
1. `availableStudienfaecher` — filters rows by fachbereich
2. `panels` — calls `buildPanels()`
3. `bump` — calls `buildBumpSeries()`
4. `hoveredUniversitySeries` — calls `buildHoveredUniversitySeries()`
5. `hoveredUniversityBumpSeries` — calls `buildHoveredUniversityBumpSeries()`

**Key detail:** Destructure params at the top of the hook so dependency arrays stay identical to the originals (e.g., `bump` uses granular `effectiveFilters?.fachbereich` etc. to avoid re-renders on unrelated filter changes).

## Changes to `src/App.tsx`

1. Add import: `import { useChartData } from './data/useChartData'`
2. Remove now-unused imports: `buildPanels`, `buildHoveredUniversitySeries`, `buildBumpSeries`, `buildHoveredUniversityBumpSeries` (keep `ScaleMode` type — used by useState)
3. Replace the 5 useMemo blocks with:
```typescript
const { availableStudienfaecher, panels, bump, hoveredUniversitySeries, hoveredUniversityBumpSeries } = useChartData({
  rows, effectiveFilters, scaleMode, tableDegree, topN, hoveredUniversity, compareUniversities,
})
```
4. No JSX changes needed — all variable names stay the same.

## Files touched
- `src/data/useChartData.ts` — **create** (~80 lines)
- `src/App.tsx` — **edit** (remove ~50 lines of useMemo, add ~5 lines for hook call + import)

## Verification
1. `npx tsc -b` — must compile clean
2. `npx eslint src/App.tsx src/data/useChartData.ts` — no new warnings
3. `desloppify scan` — App.tsx monster function finding should resolve
4. Manual: `npm run dev` and verify dashboard renders identically (charts, table, filters all work)
