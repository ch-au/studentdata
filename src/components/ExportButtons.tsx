import type { DegreePanel, Filters } from '../types'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function svgToPngDataUrl(svgEl: SVGSVGElement, scale = 2): Promise<string> {
  const serializer = new XMLSerializer()
  const svgString = serializer.serializeToString(svgEl)
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const width = (svgEl.viewBox.baseVal?.width || svgEl.clientWidth || 1000) * scale
      const height = (svgEl.viewBox.baseVal?.height || svgEl.clientHeight || 300) * scale
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('No canvas context'))
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to render SVG'))
    }
    img.src = url
  })
}

type Props = {
  containerId: string
  filenamePrefix: string
  filters: Filters
  panels: DegreePanel[]
}

export function ExportButtons({ containerId, filenamePrefix, filters, panels }: Props) {
  const exportSvg = () => {
    const root = document.getElementById(containerId)
    if (!root) return
    const svgs = Array.from(root.querySelectorAll('svg')) as SVGSVGElement[]
    if (svgs.length === 0) return
    const serializer = new XMLSerializer()
    svgs.forEach((svg, i) => {
      const txt = serializer.serializeToString(svg)
      downloadBlob(new Blob([txt], { type: 'image/svg+xml;charset=utf-8' }), `${filenamePrefix}_${i + 1}.svg`)
    })
  }

  const exportPng = async () => {
    const root = document.getElementById(containerId)
    if (!root) return
    const svgs = Array.from(root.querySelectorAll('svg')) as SVGSVGElement[]
    if (svgs.length === 0) return
    for (let i = 0; i < svgs.length; i++) {
      const dataUrl = await svgToPngDataUrl(svgs[i], 2)
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      downloadBlob(blob, `${filenamePrefix}_${i + 1}.png`)
    }
  }

  const exportCsv = () => {
    // Export aggregated index series (year/degree/line/index/value)
    const lines: string[] = ['fachbereich,studienfach,baselineYear,highlightUniversity,degree,line,label,year,value,index']
    for (const p of panels) {
      for (const s of p.series) {
        for (const pt of s.points) {
          lines.push(
            [
              filters.fachbereich,
              filters.studienfach,
              String(filters.baselineYear),
              filters.highlightUniversity,
              p.degree,
              s.key,
              s.label,
              String(pt.year),
              String(pt.value),
              String(pt.index),
            ]
              .map((x) => `"${String(x).replaceAll('"', '""')}"`)
              .join(','),
          )
        }
      }
    }
    downloadBlob(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }), `${filenamePrefix}.csv`)
  }

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <button onClick={exportSvg} className="exportButton" title="Als SVG exportieren">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        SVG
      </button>
      <button onClick={exportPng} className="exportButton" title="Als PNG exportieren">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        PNG
      </button>
      <button onClick={exportCsv} className="exportButton" title="Als CSV exportieren">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        CSV
      </button>
    </div>
  )
}

