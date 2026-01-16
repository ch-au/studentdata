import type { LineKey } from '../types'
import { getLineStyle } from '../style/seriesStyle'

type Props = {
  show: Record<LineKey, boolean>
  onChange: (key: LineKey, value: boolean) => void
}

const CATEGORIES: LineKey[] = ['HAW_Public', 'HAW_Privat', 'Uni_Public', 'Uni_Privat', 'HSMZ']

export function CategoryChips({ show, onChange }: Props) {
  return (
    <div className="categoryChips">
      {CATEGORIES.map((key) => {
        const style = getLineStyle(key)
        const active = show[key]
        
        return (
          <button
            key={key}
            type="button"
            className={`categoryChip ${active ? 'active' : ''}`}
            onClick={() => onChange(key, !active)}
            style={{
              '--chip-color': style.color,
              '--chip-bg': active ? `${style.color}15` : 'transparent',
              '--chip-border': active ? style.color : 'var(--border)',
            } as React.CSSProperties}
          >
            <span 
              className="chipDot" 
              style={{ 
                background: active ? style.color : 'var(--border)',
                boxShadow: active ? `0 0 0 2px ${style.color}30` : 'none'
              }} 
            />
            <span className="chipLabel">{style.label}</span>
          </button>
        )
      })}
    </div>
  )
}
