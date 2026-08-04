'use client'

// Minimal dependency-free bar chart for a daily count series — no charting library needed
// for a single 30-bar trend.
export default function TrendChart({ data, height = 140 }) {
  const max = Math.max(1, ...data.map(d => d.count))
  const barWidth = 100 / data.length

  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
        {data.map((d, i) => {
          const barHeight = (d.count / max) * (height - 20)
          return (
            <rect key={d.date} x={i * barWidth + barWidth * 0.15} y={height - 20 - barHeight}
              width={barWidth * 0.7} height={barHeight} rx="1" className="fill-brand/70" />
          )
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>{data[0]?.date && new Date(data[0].date + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</span>
        <span>{data[data.length - 1]?.date && new Date(data[data.length - 1].date + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  )
}
