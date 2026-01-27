import { useState, useEffect, useCallback } from 'react'

type Props = {
  university: string
  studiengang: string | null
  onClose: () => void
}

function parseContent(text: string) {
  const lines = text.split('\n').filter(line => line.trim())
  const sections: { title: string; items: string[] }[] = []
  let currentSection: { title: string; items: string[] } | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    
    if (trimmed.match(/^(INHALTLICH|METHODISCH|STRUKTURELL|Inhaltlich|Methodisch|Strukturell)/i) || 
        trimmed.endsWith(':') && !trimmed.startsWith('•') && !trimmed.startsWith('-')) {
      if (currentSection) sections.push(currentSection)
      currentSection = { title: trimmed.replace(/:$/, ''), items: [] }
    } else if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
      const item = trimmed.replace(/^[•\-*]\s*/, '')
      if (currentSection) {
        currentSection.items.push(item)
      } else {
        currentSection = { title: '', items: [item] }
      }
    } else if (trimmed && currentSection) {
      currentSection.items.push(trimmed)
    }
  }
  
  if (currentSection) sections.push(currentSection)
  return sections
}

export function InfoModal({ university, studiengang, onClose }: Props) {
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInfo = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/university-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ university, studiengang }),
      })
      
      if (!response.ok) {
        throw new Error('Fehler beim Abrufen der Informationen')
      }
      
      const data = await response.json()
      setInfo(data.info)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }, [university, studiengang])

  useEffect(() => {
    fetchInfo()
  }, [fetchInfo])

  const sections = info ? parseContent(info) : []

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalContent" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <h2 className="modalTitle">{university}</h2>
            {studiengang && <p className="modalSubtitle">{studiengang}</p>}
          </div>
          <button className="modalClose" onClick={onClose} aria-label="Schließen">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="modalBody">
          {loading && (
            <div className="modalLoading">
              <div className="spinner" />
              <p>Informationen werden gesucht...</p>
            </div>
          )}
          
          {error && (
            <div className="modalError">
              <p>{error}</p>
              <div className="modalErrorActions">
                <button className="retryButton" onClick={fetchInfo}>Erneut versuchen</button>
                <button className="closeButton" onClick={onClose}>Schließen</button>
              </div>
            </div>
          )}
          
          {!loading && !error && sections.length > 0 && (
            <div className="modalInfo">
              {sections.map((section, i) => (
                <div key={i} className="infoSection">
                  {section.title && <h4 className="infoSectionTitle">{section.title}</h4>}
                  <ul className="infoBullets">
                    {section.items.map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          
          {!loading && !error && sections.length === 0 && info && (
            <div className="modalInfo">
              <p>{info}</p>
            </div>
          )}
        </div>
        
        <div className="modalFooter">
          <p className="modalDisclaimer">
            Diese Informationen wurden mit KI generiert und können unvollständig oder veraltet sein.
          </p>
        </div>
      </div>
    </div>
  )
}
