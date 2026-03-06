# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start both Express server (port 3001) and Vite dev server (port 5000)
npm run dev:client   # Vite dev server only
npm run dev:server   # Express server only
npm run build        # TypeScript check + Vite production build
npm run lint         # ESLint
npm run preview      # Preview production build
```

## Architecture

React 19 + TypeScript + Vite 7 dashboard for analyzing German university enrollment data ("Studienanfänger"). Built for Hochschule Mainz to compare their enrollment trends against other institutions.

### Frontend (src/)
- **No UI library** — custom components with vanilla CSS
- **D3.js v7** for all charts (SVG-based): `IndexLineChart`, `BumpChart`, `MiniMultiLineChart`
- **No state library** — React hooks + URL query params for shareable filter state (`useDashboardState`)
- **Data**: static JSON loaded client-side from `/public/data/data.json` via `useData` hook
- **CSS**: modular files in `src/styles/`, imported via `src/styles/index.css` — uses CSS custom properties

### Backend (server/)
- Minimal Express server (`server/index.ts`) run via `tsx`
- Single API endpoint: `POST /api/university-info` — calls OpenRouter API (Gemini) for AI-generated university descriptions
- Requires `OPENROUTER_API_KEY` env var for the AI endpoint
- In production, serves the built `dist/` folder and handles SPA fallback
- Vite proxies `/api` requests to the Express server in development

### Key Data Flow
1. `useData` hook fetches `data.json` → extracts metadata (fachbereiche, hochschulen, year range)
2. `useDashboardState` syncs filters to/from URL params
3. `compute/aggregate.ts` transforms raw data into chart series (index/absolute/market share)
4. `compute/bump.ts` calculates rankings for the bump chart
5. Charts are React.memo-wrapped D3 components rendering to SVG

### Core Types (src/types.ts)
- `DataRow` — raw enrollment record (jahr, abschluss, fachbereich, studienfach, typ, traeger, hochschule, insgesamt)
- `Filters` — all dashboard filter state
- `LineKey` — category identifier: `HAW_Public`, `HAW_Privat`, `Uni_Public`, `Uni_Privat`, `HSMZ`
- `Series` / `DegreePanel` — aggregated chart data

### Views
- **Detail view**: KPI panel + IndexLineChart + BumpChart + UniversityYearTable for a single Fachbereich
- **Overview**: FachbereichOverview with sparklines across all Fachbereiche

## Conventions
- Language in UI and data: German
- Corporate design colors: Wirtschaft=red (#dc372d), Gestaltung=magenta (#870064), Technik=green (#00823c), accent=dark blue (#1e3a5f)
- Color mappings defined in `src/style/fachbereichColors.ts` and `src/style/seriesStyle.ts`
