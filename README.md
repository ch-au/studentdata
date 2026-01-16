# Studienanfänger Analyse-Tool

Ein interaktives Dashboard zur Analyse von Studienanfängerzahlen für die Hochschule Mainz im Vergleich zu anderen deutschen Hochschulen.

![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Vite](https://img.shields.io/badge/Vite-7-purple)
![D3.js](https://img.shields.io/badge/D3.js-7-orange)

## Features

### 📊 Zwei Ansichten

- **Detail-Ansicht**: Tiefgehende Analyse eines Fachbereichs/Studiengangs
  - Timeline-Chart (Index/Absolut/Marktanteil)
  - Ranking-Chart (Bump-Chart mit dynamischer Skalierung)
  - Detail-Tabelle aller Hochschulen
  - KPI-Panel mit wichtigen Kennzahlen

- **Übersicht**: Vergleich aller Fachbereiche
  - Kompakte Sparklines für Bachelor/Master/Gesamt
  - Schneller Überblick über Entwicklungen

### 🎯 Filter & Steuerung

- Fachbereich & Studienfach-Auswahl
- Zeitraum (Von/Bis/Basisjahr)
- Highlight-Hochschule (Suchfeld)
- Kategorie-Filter (HAW/Uni, Öffentlich/Privat)
- Bachelor/Master-Toggle
- Skalierungsmodus (Index/Absolut/Marktanteil)

### 📤 Export

- SVG-Export (Vektorgrafik)
- PNG-Export (Rastergrafik)
- CSV-Export (Rohdaten)

## Installation

```bash
# Dependencies installieren
npm install

# Entwicklungsserver starten
npm run dev

# Produktions-Build
npm run build

# Build-Vorschau
npm run preview
```

## Datenformat

Die Anwendung erwartet eine `data.json` Datei unter `public/data/data.json` mit folgendem Format:

```typescript
type DataRow = {
  jahr: number           // z.B. 2020
  abschluss: string      // "Bachelor" | "Master"
  fachbereich: string    // z.B. "BWL", "Technik", "Gestaltung"
  studienfach: string    // z.B. "Wirtschaftsinformatik"
  typ: "HAW" | "Uni"     // Hochschultyp
  traeger: string        // "Public" | "Privat" | "Kirchlich"
  hochschule: string     // z.B. "Hochschule Mainz (FH)"
  insgesamt: number      // Anzahl Studienanfänger
}
```

### Beispiel

```json
[
  {
    "jahr": 2023,
    "abschluss": "Bachelor",
    "fachbereich": "BWL",
    "studienfach": "Betriebswirtschaft",
    "typ": "HAW",
    "traeger": "Public",
    "hochschule": "Hochschule Mainz (FH)",
    "insgesamt": 245
  }
]
```

## Projektstruktur

```
src/
├── charts/                 # D3-basierte Visualisierungen
│   ├── BumpChart.tsx       # Ranking-Chart
│   ├── IndexLineChart.tsx  # Timeline-Chart
│   └── MiniMultiLineChart.tsx  # Sparklines für Übersicht
│
├── components/             # React UI-Komponenten
│   ├── CommandBar.tsx      # Hauptsteuerungsleiste
│   ├── CategoryChips.tsx   # Kategorie-Filter-Buttons
│   ├── DataQualityHints.tsx# Datenqualitäts-Warnungen
│   ├── ExportButtons.tsx   # Export-Funktionen
│   ├── FachbereichOverview.tsx # Übersichts-Grid
│   ├── KpiPanel.tsx        # KPI-Kennzahlen
│   ├── TimeRangePopover.tsx# Zeitraum-Auswahl
│   ├── UniversitySearch.tsx# Hochschul-Suchfeld
│   └── UniversityYearTable.tsx # Detail-Tabelle
│
├── compute/                # Datenverarbeitung
│   ├── aggregate.ts        # Index/Absolut/Marktanteil-Berechnung
│   └── bump.ts             # Ranking-Berechnung
│
├── data/
│   └── useData.ts          # Data-Loading Hook
│
├── state/
│   └── useDashboardState.ts # URL-persistierter State
│
├── style/                  # Design-System
│   ├── designTokens.ts     # Design-Variablen
│   ├── fachbereichColors.ts# Fachbereich-Farbschema
│   └── seriesStyle.ts      # Chart-Linien-Styles
│
├── types.ts                # TypeScript-Definitionen
├── App.tsx                 # Haupt-Komponente
├── main.tsx                # Entry Point
└── index.css               # Globale Styles
```

## Corporate Design

### Farbschema

Das Tool verwendet das offizielle Corporate Design der Hochschule Mainz:

| Element | Farbe | Hex |
|---------|-------|-----|
| **Akzentfarbe** | Dunkelblau | `#1e3a5f` |
| **FB Wirtschaft** (BWL, BWL-WI, BWL-WR) | Rot | `#dc372d` |
| **FB Gestaltung** | Magenta | `#870064` |
| **FB Technik** | Grün | `#00823c` |

### Chart-Farben

| Linie | Farbe | Beschreibung |
|-------|-------|--------------|
| HAW Öffentlich | `#3b82f6` | Helles Blau |
| HAW Privat | `#93c5fd` | Blasses Blau |
| Uni Öffentlich | `#374151` | Dunkelgrau |
| Uni Privat | `#9ca3af` | Mittelgrau |
| HSMZ | *Fachbereich-Farbe* | Dynamisch nach Fachbereich |

## Technologie-Stack

- **React 19** - UI Framework
- **TypeScript 5.9** - Type Safety
- **Vite 7** - Build Tool
- **D3.js 7** - Datenvisualisierung
- **CSS Variables** - Theming

## URL-Parameter

Filter werden automatisch in der URL gespeichert und können geteilt werden:

```
?fb=BWL&sf=ALL&from=2020&to=2024&base=2020&hl=Hochschule+Mainz+(FH)
```

| Parameter | Beschreibung |
|-----------|--------------|
| `fb` | Fachbereich |
| `sf` | Studienfach (oder "ALL") |
| `from` | Jahr von |
| `to` | Jahr bis |
| `base` | Basisjahr für Index |
| `hl` | Highlight-Hochschule |

## Deployment

### Replit

Das Projekt ist Replit-ready! Einfach:

1. **Von Git importieren**: Gehe auf [replit.com/~](https://replit.com/~) → "Import from GitHub"
2. **Repository URL eingeben** und importieren
3. **Run** drücken → Der Dev-Server startet automatisch

Für Deployment klicke auf "Deploy" → "Static" → Replit baut und hosted die App.

Die Konfiguration ist bereits in `.replit` und `replit.nix` enthalten.

### Andere Optionen

```bash
# Build für statisches Hosting
npm run build

# Output: dist/ Ordner
# Kann auf Netlify, Vercel, GitHub Pages etc. deployed werden
```

## Lizenz

Internes Tool der Hochschule Mainz.

---

Entwickelt für die Hochschule Mainz zur Analyse von Studierendenentwicklungen.
