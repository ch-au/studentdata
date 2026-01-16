# Studienanfänger Analyse-Tool

## Overview

This is a React-based data visualization dashboard for analyzing student enrollment numbers ("Studienanfänger") at Hochschule Mainz compared to other German universities. The application provides interactive charts and tables for comparing enrollment trends across different institutions, degree types (Bachelor/Master), and academic fields.

Key capabilities:
- **Detail View**: Deep analysis of specific academic fields with timeline charts, ranking (bump) charts, and data tables
- **Overview Mode**: Compact sparkline comparison across all academic areas
- **Multiple visualization modes**: Index-based, absolute numbers, and market share views
- **Data export**: SVG, PNG, and CSV export functionality
- **URL-based state persistence**: Filter configurations are stored in URL parameters

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
- **CSS custom properties** (CSS variables) for theming and design tokens
- **Inter font** from Google Fonts
- Corporate design colors from Hochschule Mainz brand guidelines
- Faculty-specific color coding (Wirtschaft=red, Gestaltung=magenta, Technik=green)

### Component Structure
- `/src/charts/` - D3-based chart components (IndexLineChart, BumpChart, MiniMultiLineChart)
- `/src/components/` - UI components (filters, tables, export buttons)
- `/src/compute/` - Data transformation logic (aggregation, ranking calculations)
- `/src/style/` - Design tokens and styling utilities
- `/src/state/` - State management hooks
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