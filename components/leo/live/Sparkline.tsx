export default function Sparkline({ values, width = 72, height = 24 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return <svg width={width} height={height} aria-hidden="true" />
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const pts = values
    .map((v, i) => `${((i / (values.length - 1)) * width).toFixed(1)},${(height - 2 - ((v - min) / range) * (height - 4)).toFixed(1)}`)
    .join(' ')
  const up = values[values.length - 1] >= values[0]
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={up ? '#34d399' : '#f87171'} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}
