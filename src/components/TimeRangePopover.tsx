import { useState, useRef, useEffect } from 'react'

type Props = {
  yearFrom: number
  yearTo: number
  baselineYear: number
  yearMin: number
  yearMax: number
  onChange: (values: { yearFrom?: number; yearTo?: number; baselineYear?: number }) => void
}

type Preset = {
  label: string
  getRange: (min: number, max: number) => { yearFrom: number; yearTo: number; baselineYear: number }
}

const PRESETS: Preset[] = [
  {
    label: 'Letzte 5 Jahre',
    getRange: (min, max) => ({ yearFrom: Math.max(min, max - 4), yearTo: max, baselineYear: Math.max(min, max - 4) }),
  },
  {
    label: 'Letzte 10 Jahre',
    getRange: (min, max) => ({ yearFrom: Math.max(min, max - 9), yearTo: max, baselineYear: Math.max(min, max - 9) }),
  },
  {
    label: 'Gesamter Zeitraum',
    getRange: (min, max) => ({ yearFrom: min, yearTo: max, baselineYear: min }),
  },
]

export function TimeRangePopover({ yearFrom, yearTo, baselineYear, yearMin, yearMax, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    
    const handleClick = (e: MouseEvent) => {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on escape
  useEffect(() => {
    if (!open) return
    
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  const displayText = `${yearFrom}–${yearTo}`

  return (
    <div className="timeRangeWrapper">
      <button
        ref={buttonRef}
        type="button"
        className={`timeRangeButton ${open ? 'active' : ''}`}
        onClick={() => setOpen(!open)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>{displayText}</span>
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      
      {open && (
        <div ref={popoverRef} className="timeRangePopover">
          <div className="popoverSection">
            <div className="popoverSectionTitle">Schnellauswahl</div>
            <div className="presetButtons">
              {PRESETS.map((preset) => {
                const range = preset.getRange(yearMin, yearMax)
                const isActive = 
                  range.yearFrom === yearFrom && 
                  range.yearTo === yearTo && 
                  range.baselineYear === baselineYear
                
                return (
                  <button
                    key={preset.label}
                    type="button"
                    className={`presetButton ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      onChange(range)
                      setOpen(false)
                    }}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>
          </div>
          
          <div className="popoverDivider" />
          
          <div className="popoverSection">
            <div className="popoverSectionTitle">Zeitraum anpassen</div>
            <div className="timeInputGrid">
              <div className="timeInputField">
                <label>Von</label>
                <input
                  type="number"
                  min={yearMin}
                  max={yearMax}
                  value={yearFrom}
                  onChange={(e) => onChange({ yearFrom: Number(e.target.value) })}
                />
              </div>
              <div className="timeInputField">
                <label>Bis</label>
                <input
                  type="number"
                  min={yearMin}
                  max={yearMax}
                  value={yearTo}
                  onChange={(e) => onChange({ yearTo: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
          
          <div className="popoverDivider" />
          
          <div className="popoverSection">
            <div className="popoverSectionTitle">Baseline (= 100%)</div>
            <div className="timeInputField" style={{ marginTop: 8 }}>
              <input
                type="number"
                min={yearMin}
                max={yearMax}
                value={baselineYear}
                onChange={(e) => onChange({ baselineYear: Number(e.target.value) })}
              />
              <span className="baselineHint">Referenzjahr für Index-Berechnung</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
