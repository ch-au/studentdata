import { useState, useRef, useEffect, useMemo } from 'react'

type Props = {
  value: string
  options: string[]
  onChange: (value: string) => void
  placeholder?: string
}

export function UniversitySearch({ value, options, onChange, placeholder = 'Hochschule suchen...' }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options
    const query = search.toLowerCase()
    return options.filter(opt => opt.toLowerCase().includes(query))
  }, [options, search])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on escape
  useEffect(() => {
    if (!open) return
    
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setSearch('')
      }
    }
    
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  // Focus input when opening
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  const displayValue = value
    .replace(' (FH)', '')
    .replace('Hochschule ', 'HS ')
    .replace('Universität ', 'Uni ')

  const handleSelect = (opt: string) => {
    onChange(opt)
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={containerRef} className="universitySearch">
      <button 
        className={`universitySearchTrigger ${open ? 'active' : ''}`}
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span className="universitySearchValue">{displayValue}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      
      {open && (
        <div className="universitySearchDropdown">
          <div className="universitySearchInputWrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={placeholder}
              className="universitySearchInput"
            />
            {search && (
              <button 
                className="universitySearchClear"
                onClick={() => setSearch('')}
                type="button"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
          
          <div className="universitySearchList">
            {filteredOptions.length === 0 ? (
              <div className="universitySearchEmpty">Keine Treffer</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt === value
                const displayOpt = opt
                  .replace(' (FH)', '')
                  .replace('Hochschule ', 'HS ')
                
                return (
                  <button
                    key={opt}
                    className={`universitySearchOption ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(opt)}
                    type="button"
                  >
                    {displayOpt}
                    {isSelected && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
