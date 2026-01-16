// Hochschule Mainz Corporate Design Colors
// Based on official brand guidelines

export const CORPORATE_BLUE = '#1e3a5f'

// Faculty colors from corporate design
export const FACHBEREICH_COLORS: Record<string, string> = {
  // Wirtschaft (BWL variants) - Red
  'BWL': '#dc372d',
  'BWL-WI': '#dc372d',
  'BWL-WR': '#dc372d',
  
  // Gestaltung - Magenta/Purple
  'Gestaltung': '#870064',
  
  // Technik - Green
  'Technik': '#00823c',
}

// Default color for unknown Fachbereiche
export const DEFAULT_FB_COLOR = CORPORATE_BLUE

export function getFachbereichColor(fachbereich: string): string {
  return FACHBEREICH_COLORS[fachbereich] ?? DEFAULT_FB_COLOR
}

// Lighter versions for backgrounds
export function getFachbereichBgColor(fachbereich: string): string {
  const color = getFachbereichColor(fachbereich)
  // Return a very light tint
  return `${color}10`
}
