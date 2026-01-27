# Studienanfänger Analyse-Tool

## Overview

This is a React-based data visualization dashboard for analyzing student enrollment numbers ("Studienanfänger") at Hochschule Mainz compared to other German universities. The application provides interactive charts and tables for comparing enrollment trends across different institutions, degree types (Bachelor/Master), and academic fields.

Key capabilities:
- **Detail View**: Deep analysis of specific academic fields with timeline charts, ranking (bump) charts, and data tables
- **Overview Mode**: Compact sparkline comparison across all academic areas
- **Multiple visualization modes**: Index-based, absolute numbers, and market share views
- **Data export**: SVG, PNG, and CSV export functionality
- **URL-based state persistence**: Filter configurations are stored in URL parameters

## Recent Changes (January 2026)

### Visual Improvements to Data Table
- **Enhanced Sparklines**: Larger (80x28px) with gradient fill area and improved trend arrows
- **Improved Data Bars**: 12px height with gradient fill and smooth transitions
- **Delta Badges**: Colored pill badges with trend icons (up/down/neutral) replacing plain text
- **Zebra Striping**: Alternating row backgrounds for better readability
- **Stronger Hover States**: Accent-colored hover with subtle box shadow
- **Year Column Separators**: Visual grouping between metadata and year data columns
- **Highlight Row Styling**: Accent border for highlighted university rows

### Chart Panel Polish
- **Updated Legend**: Pill-badge style with rounded corners and hover effects
- **Panel Hover Effects**: Subtle shadow enhancement on hover
- **Improved Transitions**: Smooth 150-250ms transitions throughout

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Framework
- **React 19** with TypeScript for type-safe component development
- **Vite 7** as the build tool and dev server (configured on port 5000 with external access)
- No UI component library - custom components with vanilla CSS

### Data Visualization
- **D3.js v7** for all chart rendering (line charts, bump charts, sparklines)
- Charts are SVG-based for high-quality exports
- Custom tooltip components with consistent styling

### State Management
- **React hooks** for local component state
- **URL query parameters** for shareable filter state (via `useDashboardState` hook)
- No external state management library (Redux, Zustand, etc.)

### Data Layer
- **Static JSON data** served from `/public/data/data.json`
- Data fetched client-side via `useData` hook
- No backend API or database - purely frontend application

### Styling Approach
- **Modular CSS** with 8 scoped files imported via `/src/styles/index.css`:
  - `variables.css` - CSS custom properties (colors, spacing, typography)
  - `base.css` - Reset, typography, form elements
  - `layout.css` - App shell, grid, panels
  - `commandbar.css` - Command bar component
  - `components.css` - UI components (chips, search, popovers)
  - `charts.css` - Chart-specific styling
  - `table.css` - Data table styling
  - `overview.css` - Fachbereich overview grid
- **Inter font** from Google Fonts
- Corporate design colors from Hochschule Mainz brand guidelines
- Faculty-specific color coding (Wirtschaft=red, Gestaltung=magenta, Technik=green)

### Component Structure
- `/src/charts/` - D3-based chart components (IndexLineChart, BumpChart, MiniMultiLineChart) - wrapped with React.memo for performance
- `/src/components/` - UI components (filters, tables, export buttons, FilterBadge)
- `/src/compute/` - Data transformation logic (aggregation, ranking calculations)
- `/src/style/` - Line style utilities
- `/src/styles/` - Modular CSS files
- `/src/state/` - State management hooks (useDashboardState for URL-synced filters)
- `/src/data/` - Data fetching hooks

### Key Data Types
- `DataRow`: Raw data record with year, degree type, field, institution type, and enrollment count
- `Filters`: User-selected filter configuration
- `DegreePanel` / `Series`: Aggregated data for chart rendering
- `BumpSeries`: Ranking data for bump chart visualization

## External Dependencies

### Runtime Dependencies
- **React 19.2** - UI framework
- **React DOM 19.2** - React DOM renderer
- **D3.js 7.9** - Data visualization library

### Development Dependencies
- **TypeScript 5.9** - Type checking
- **Vite 7.2** - Build tool and dev server
- **ESLint 9** - Code linting with React hooks and refresh plugins

### External Services
- **Google Fonts** - Inter font family loaded via CDN
- No backend services, databases, or third-party APIs

### Data Source
- Static JSON file (`/public/data/data.json`) containing university enrollment data
- Data appears to cover German universities with fields: year, degree type, academic field, institution type (HAW/Uni), funding type (Public/Private), and enrollment numbers