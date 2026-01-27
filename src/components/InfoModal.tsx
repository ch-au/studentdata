import { useState, useEffect, useCallback } from 'react'
import Markdown from 'react-markdown'

type Props = {
  university: string
  studiengang: string | null
  onClose: () => void
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
          
          {!loading && !error && info && (
            <div className="modalInfo markdown-content">
              <Markdown>{info}</Markdown>
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
