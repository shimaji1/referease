'use client'

// Minimal dependency-free trend chart — no charting library needed for a 30-bar/line series.
// `series`: [{ key, label, color, data: [{date, value}] }]. If only one series is passed with
// event bars (legacy), pass `data` directly instead of `series`.
export default function TrendChart({ data, series, height = 160 }) {
  const resolvedSeries = series || [{ key: 'count', color: '#1e3a5f', data: data.map(d => ({ date: d.date, value: d.count })) }]
  const allValues = resolvedSeries.flatMap(s => s.data.map(d => d.value))
  const max = Math.max(1, ...allValues)
  const points = resolvedSeries[0].data
  const n = points.length
  const stepX = 100 / Math.max(1, n - 1)

  const toPath = (seriesData) => seriesData.map((d, i) => {
    const x = n > 1 ? i * stepX : 50
    const y = height - 20 - (d.value / max) * (height - 30)
    return `${i === 0 ? 'M' : 'L'}${x},${y}`
  }).join(' ')

  return (
    <div>
      {series && (
        <div className="flex gap-4 mb-2">
          {series.map(s => (
            <span key={s.key} className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />{s.label}
            </span>
          ))}
        </div>
      )}
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
        {!series && points.map((d, i) => {
          const barWidth = 100 / n
          const barHeight = (d.value / max) * (height - 20)
          return <rect key={d.date} x={i * barWidth + barWidth * 0.15} y={height - 20 - barHeight} width={barWidth * 0.7} height={barHeight} rx="1" className="fill-brand/70" />
        })}
        {series && resolvedSeries.map(s => (
          <path key={s.key} d={toPath(s.data)} fill="none" stroke={s.color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>{points[0]?.date && new Date(points[0].date + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</span>
        <span>{points[n - 1]?.date && new Date(points[n - 1].date + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  )
}
