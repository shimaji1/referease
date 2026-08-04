'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { fetchApprovedAnnouncements } from '@/lib/announcements'

const ROTATE_MS = 6000

function Slide({ item }) {
  const href = item.cta_url || (item.providers?.id ? `/search?id=${item.providers.id}` : '#')
  const ctaLabel = item.cta_label || 'Learn more'

  if (item.template === 'full-banner' && item.image_url) {
    return (
      <Link href={href} className="relative block w-full h-full rounded-2xl overflow-hidden group">
        <img src={item.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="relative h-full flex flex-col justify-end p-6 sm:p-8">
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">{item.headline}</h3>
          {item.body && <p className="text-sm text-white/85 mb-3 max-w-lg">{item.body}</p>}
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-brand bg-white w-fit px-4 py-2 rounded-lg group-hover:bg-amber-50 transition">{ctaLabel} →</span>
        </div>
      </Link>
    )
  }

  if (item.template === 'text-card' || !item.image_url) {
    return (
      <Link href={href} className="block w-full h-full rounded-2xl bg-gradient-to-br from-brand to-[#2c4f7c] p-6 sm:p-8 flex flex-col justify-center group">
        <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">{item.headline}</h3>
        {item.body && <p className="text-sm text-white/80 mb-4 max-w-lg">{item.body}</p>}
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-brand bg-white w-fit px-4 py-2 rounded-lg group-hover:bg-amber-50 transition">{ctaLabel} →</span>
      </Link>
    )
  }

  // image-left
  return (
    <Link href={href} className="flex flex-col sm:flex-row w-full h-full rounded-2xl bg-white border border-gray-200 overflow-hidden group">
      <div className="sm:w-2/5 h-40 sm:h-full shrink-0">
        <img src={item.image_url} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 p-6 flex flex-col justify-center min-w-0">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1.5">{item.headline}</h3>
        {item.body && <p className="text-sm text-gray-600 mb-3">{item.body}</p>}
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-brand w-fit group-hover:underline">{ctaLabel} →</span>
      </div>
    </Link>
  )
}

export default function AnnouncementCarousel() {
  const [items, setItems] = useState([])
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => { fetchApprovedAnnouncements().then(setItems) }, [])

  useEffect(() => {
    if (items.length < 2 || paused) return
    timerRef.current = setInterval(() => setIndex(i => (i + 1) % items.length), ROTATE_MS)
    return () => clearInterval(timerRef.current)
  }, [items.length, paused])

  if (items.length === 0) return null

  return (
    <section className="py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative h-56 sm:h-48" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          {items.map((item, i) => (
            <div key={item.id} className="absolute inset-0 transition-opacity duration-500" style={{ opacity: i === index ? 1 : 0, pointerEvents: i === index ? 'auto' : 'none' }}>
              <Slide item={item} />
            </div>
          ))}
        </div>
        {items.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-4">
            {items.map((item, i) => (
              <button key={item.id} onClick={() => setIndex(i)} aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-brand' : 'w-1.5 bg-gray-300'}`} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
