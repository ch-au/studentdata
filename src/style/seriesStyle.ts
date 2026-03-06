import type { LineKey, Traeger, Typ } from '../types'
import { getFachbereichColor, CORPORATE_BLUE } from './fachbereichColors'

// Shared chart styling constants
export const CHART_COLORS = {
  grid: '#f0f3f6',
  label: '#8b8ba7',
  axis: '#e0e5eb',
  nonHighlight: '#cbd5e1',
  hoveredUniversity: '#059669',
} as const

export type Badge = {
  text: string
  bg: string
  fg: string
  border: string
}

export type SeriesStyle = {
  key: LineKey
  label: string
  color: string
  badge?: Badge
}

// Base colors for comparison lines
const BASE_COLORS: Record<LineKey, string> = {
  HAW_Public: '#3b82f6',      // Brighter blue for public HAW
  HAW_Privat: '#93c5fd',      // Lighter blue for private HAW
  Uni_Public: '#374151',      // Dark gray for public Uni
  Uni_Privat: '#9ca3af',      // Medium gray for private Uni
  HSMZ: CORPORATE_BLUE,       // Default - will be overridden per fachbereich
}

const LABELS: Record<LineKey, string> = {
  HAW_Public: 'HAW',
  HAW_Privat: 'HAW Priv.',
  Uni_Public: 'Uni',
  Uni_Privat: 'Uni Priv.',
  HSMZ: 'HSMZ',
}

// Get line style - optionally with fachbereich for dynamic HSMZ color
export function getLineStyle(key: LineKey, fachbereich?: string): SeriesStyle {
  let color = BASE_COLORS[key]
  
  // For HSMZ, use faculty color if fachbereich is provided
  if (key === 'HSMZ' && fachbereich) {
    color = getFachbereichColor(fachbereich)
  }
  
  return { key, label: LABELS[key], color }
}

// Get HSMZ color for a specific fachbereich
export function getHSMZColor(fachbereich: string): string {
  return getFachbereichColor(fachbereich)
}

export function getTypeBadge(typ: Typ): Badge {
  if (typ === 'Uni') return { text: 'UNI', bg: '#f3f4f6', fg: '#374151', border: '#d1d5db' }
  return { text: 'HAW', bg: '#eff6ff', fg: '#1d4ed8', border: '#bfdbfe' }
}

export function getTraegerBadge(traeger: Traeger): Badge {
  if (traeger === 'Public') return { text: 'ÖFFENTLICH', bg: '#ecfdf5', fg: '#065f46', border: '#a7f3d0' }
  if (traeger === 'Privat') return { text: 'PRIVAT', bg: '#fef3c7', fg: '#92400e', border: '#fcd34d' }
  return { text: 'KIRCHLICH', bg: '#fdf2f8', fg: '#9d174d', border: '#fbcfe8' }
}

export function getLineKeyFor(typ: Typ, traeger: Traeger): LineKey | null {
  if (typ === 'HAW' && traeger === 'Public') return 'HAW_Public'
  if (typ === 'HAW' && traeger === 'Privat') return 'HAW_Privat'
  if (typ === 'Uni' && traeger === 'Public') return 'Uni_Public'
  if (typ === 'Uni' && traeger === 'Privat') return 'Uni_Privat'
  return null
}

export function getLineBadge(typ: Typ, traeger: Traeger): Badge | null {
  const key = getLineKeyFor(typ, traeger)
  if (!key) return null
  const color = BASE_COLORS[key]
  return { text: LABELS[key], bg: '#ffffff', fg: '#111827', border: color }
}
