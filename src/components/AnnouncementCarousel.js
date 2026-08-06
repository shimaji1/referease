'use client'
import { useState, useEffect, useRef } from 'react'
import { fetchApprovedAnnouncements } from '@/lib/announcements'
import AnnouncementSlide from './AnnouncementSlide'

const ROTATE_MS = 6000

// Shown when there's nothing approved yet, so the section still reserves its spot on the
// homepage instead of the layout jumping around as slides get added/removed.
const FALLBACK_SLIDE = {
  id: 'fallback', template: 'text-card',
  headline: 'Get seen by referring physicians', body: 'Featured listings get a rotating spot right here on the homepage.',
  cta_label: 'List your practice', cta_url: '/pricing', providers: null,
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

  const slides = items.length ? items : [FALLBACK_SLIDE]

  return (
    <section className="py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative h-72 sm:h-64" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          {slides.map((item, i) => (
            <div key={item.id} className="absolute inset-0 transition-opacity duration-500" style={{ opacity: i === index ? 1 : 0, pointerEvents: i === index ? 'auto' : 'none' }}>
              <AnnouncementSlide item={item} />
            </div>
          ))}
        </div>
        {slides.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-4">
            {slides.map((item, i) => (
              <button key={item.id} onClick={() => setIndex(i)} aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-brand' : 'w-1.5 bg-gray-300'}`} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
