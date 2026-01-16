export const designTokens = {
  color: {
    text: '#1a1a2e',
    muted: '#8b8ba7',
    bg: '#f8f9fb',
    panel: '#ffffff',
    border: '#e2e5e9',
    grid: '#eef1f4',
    accent: '#1e3a5f',        // HS Mainz corporate blue
    accentLight: '#e8eef5',
  },
  chart: {
    hawPublic: '#3b82f6',     // Bright blue
    hawPrivat: '#93c5fd',     // Light blue
    uniPublic: '#374151',     // Dark gray
    uniPrivat: '#9ca3af',     // Medium gray
    highlight: '#1e3a5f',     // HS Mainz blue (for HSMZ)
    mutedLine: '#d1d5db',
  },
  font: {
    base: 'Inter, system-ui, -apple-system, sans-serif',
    size: {
      xs: 10,
      sm: 11,
      md: 12,
      lg: 14,
      xl: 18,
    },
  },
  radius: {
    sm: 6,
    md: 12,
    lg: 16,
  },
  space: {
    xs: 4,
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
  },
} as const
