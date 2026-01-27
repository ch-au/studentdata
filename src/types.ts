export type Abschluss = 'Bachelor' | 'Master' | string
export type Typ = 'HAW' | 'Uni'
export type Traeger = 'Public' | 'Privat' | 'Kirchlich'

export type DataRow = {
  jahr: number
  abschluss: Abschluss
  fachbereich: string
  studienfach: string
  typ: Typ
  traeger: Traeger
  hochschule: string
  insgesamt: number
}

export type LineKey = 'HAW_Public' | 'HAW_Privat' | 'Uni_Public' | 'Uni_Privat' | 'HSMZ' | `compare_${number}`

export type Point = {
  year: number
  value: number
  index: number
}

export type Series = {
  key: LineKey
  label: string
  color: string
  points: Point[]
}

export type DegreePanel = {
  degree: 'Alle' | 'Bachelor' | 'Master'
  series: Series[]
}

export type Filters = {
  fachbereich: string
  studienfach: string | 'ALL'
  abschluss: Abschluss | 'Alle'
  baselineYear: number
  yearFrom: number
  yearTo: number
  highlightUniversity: string
  show: Record<LineKey, boolean>
}

