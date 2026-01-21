import { memo } from 'react'
import type { LineKey } from '../types'
import { getLineStyle } from '../style/seriesStyle'

type Props = {
  filterKey: LineKey
  onClear: () => void
}

function FilterBadgeComponent({ filterKey, onClear }: Props) {
  const style = getLineStyle(filterKey)
  
  return (
    <div className="filterBadgeContainer">
      <span 
        className="badge" 
        style={{ 
          borderColor: style.color, 
          color: style.color, 
          background: `${style.color}10` 
        }}
      >
        <span className="dot" style={{ background: style.color, marginRight: 6 }} />
        {style.label}
      </span>
      <button onClick={onClear} className="filterBadgeClear">
        ×
      </button>
    </div>
  )
}

export const FilterBadge = memo(FilterBadgeComponent)
