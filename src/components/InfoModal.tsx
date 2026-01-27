import { useState, useEffect, useCallback, useRef } from 'react'
import Markdown from 'react-markdown'

type Props = {
  university: string
  studiengang: string | null
  niveau: string | null
  onClose: () => void
}

const loadingSteps = [
  'Recherchiere Informationen im Netz...',
  'Analysiere Informationen...',
  'Fasse Informationen zusammen...'
]

export function InfoModal({ university, studiengang, niveau, onClose }: Props) {
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingStep, setLoadingStep] = useState(0)
  const hasFetched = useRef(false)

  const fetchInfo = useCallback(async () => {
    if (hasFetched.current) return
    hasFetched.current = true
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/university-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ university, studiengang, niveau }),
      })
      
      if (!response.ok) {
        throw new Error('Fehler beim Abrufen der Informationen')
      }
      
      const data = await response.json()
      setInfo(data.info)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
      hasFetched.current = false
    } finally {
      setLoading(false)
    }
  }, [university, studiengang, niveau])

  useEffect(() => {
    fetchInfo()
  }, [fetchInfo])

  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setLoadingStep(prev => (prev + 1) % loadingSteps.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [loading])

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalContent" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <h2 className="modalTitle">{university}</h2>
            {studiengang && <p className="modalSubtitle">{studiengang}{niveau && niveau !== 'Alle' ? ` (${niveau})` : ''}</p>}
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
              <div className="loadingSteps">
                {loadingSteps.map((step, i) => (
                  <div key={i} className={`loadingStepItem ${i === loadingStep ? 'active' : ''} ${i < loadingStep ? 'done' : ''}`}>
                    <div className="loadingStepIcon">
                      {i < loadingStep ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      ) : i === loadingStep ? (
                        <div className="stepSpinner" />
                      ) : (
                        <div className="stepCircle" />
                      )}
                    </div>
                    <span>{step.replace('...', '')}</span>
                  </div>
                ))}
              </div>
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
