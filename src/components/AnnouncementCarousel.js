'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { fetchApprovedAnnouncements, FONT_OPTIONS, mergeStyle } from '@/lib/announcements'

const ROTATE_MS = 6000

// Shown when there's nothing approved yet, so the section still reserves its spot on the
// homepage instead of the layout jumping around as slides get added/removed.
const FALLBACK_SLIDE = {
  id: 'fallback', template: 'text-card',
  headline: 'Get seen by referring physicians', body: 'Featured listings get a rotating spot right here on the homepage.',
  cta_label: 'List your practice', cta_url: '/pricing', providers: null,
}

const fontFamily = (key) => FONT_OPTIONS.find(f => f.key === key)?.family
const justifyFor = (align) => (align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start')
const IMAGE_WIDTH = { sm: '30%', md: '40%', lg: '55%' }
const IMAGE_ZOOM = { sm: 1, md: 1.1, lg: 1.25 }

function StyledText({ as: Tag = 'p', text, section, defaultColor, weight, className = '' }) {
  if (!text) return null
  return (
    <Tag className={className} style={{ fontSize: `${section.size}px`, fontFamily: fontFamily(section.font), color: section.color || defaultColor, textAlign: section.align, fontWeight: weight }}>
      {text}
    </Tag>
  )
}

function LogoBadge({ url, section }) {
  if (!url) return null
  return (
    <div style={{ display: 'flex', justifyContent: justifyFor(section.align), marginBottom: 8 }}>
      <img src={url} alt="" style={{ height: `${section.size}px`, width: 'auto', borderRadius: 6, objectFit: 'contain' }} />
    </div>
  )
}

function CtaButton({ href, label, section, defaultBg, defaultColor }) {
  return (
    <div style={{ display: 'flex', justifyContent: justifyFor(section.align) }}>
      <Link href={href}
        style={{ fontSize: `${section.size}px`, padding: '0.6em 1.2em', borderRadius: '8px', fontWeight: 700, background: section.bg || defaultBg, color: section.color || defaultColor, display: 'inline-block' }}
        className="hover:opacity-90 transition">
        {label} →
      </Link>
    </div>
  )
}

function Slide({ item }) {
  const href = item.cta_url || (item.providers?.id ? `/search?id=${item.providers.id}` : '#')
  const ctaLabel = item.cta_label || 'Learn more'
  const style = mergeStyle(item.style)

  if (item.template === 'full-banner' && item.image_url) {
    const zoom = IMAGE_ZOOM[style.image.size] || 1
    return (
      <div className="relative block w-full h-full rounded-2xl overflow-hidden">
        <img src={item.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="relative h-full flex flex-col justify-end p-6 sm:p-8 overflow-hidden">
          <LogoBadge url={item.logo_url} section={style.logo} />
          <StyledText as="h3" text={item.headline} section={style.headline} defaultColor="#ffffff" weight={700} className="mb-1" />
          <StyledText as="h4" text={item.subheadline} section={style.subheadline} defaultColor="#ffffff" weight={600} className="mb-1" />
          <StyledText as="p" text={item.body} section={style.body} defaultColor="rgba(255,255,255,0.85)" className="mb-3 max-w-lg" />
          <CtaButton href={href} label={ctaLabel} section={style.button} defaultBg="#ffffff" defaultColor="#1e3a5f" />
        </div>
      </div>
    )
  }

  if (item.template === 'text-card' || !item.image_url) {
    return (
      <div className="block w-full h-full rounded-2xl bg-gradient-to-br from-brand to-[#2c4f7c] p-6 sm:p-8 flex flex-col justify-center overflow-hidden">
        <LogoBadge url={item.logo_url} section={style.logo} />
        <StyledText as="h3" text={item.headline} section={style.headline} defaultColor="#ffffff" weight={700} className="mb-2" />
        <StyledText as="h4" text={item.subheadline} section={style.subheadline} defaultColor="#ffffff" weight={600} className="mb-2" />
        <StyledText as="p" text={item.body} section={style.body} defaultColor="rgba(255,255,255,0.8)" className="mb-4 max-w-lg" />
        <CtaButton href={href} label={ctaLabel} section={style.button} defaultBg="#ffffff" defaultColor="#1e3a5f" />
      </div>
    )
  }

  // image-left
  const imgWidth = IMAGE_WIDTH[style.image.size] || IMAGE_WIDTH.md
  return (
    <div className="flex flex-col sm:flex-row w-full h-full rounded-2xl bg-white border border-gray-200 overflow-hidden">
      <div className="h-40 sm:h-full shrink-0 sm:w-[var(--img-w)]" style={{ '--img-w': imgWidth }}>
        <img src={item.image_url} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 p-6 flex flex-col justify-center min-w-0 overflow-hidden">
        <LogoBadge url={item.logo_url} section={style.logo} />
        <StyledText as="h3" text={item.headline} section={style.headline} defaultColor="#111827" weight={700} className="mb-1.5" />
        <StyledText as="h4" text={item.subheadline} section={style.subheadline} defaultColor="#374151" weight={600} className="mb-1.5" />
        <StyledText as="p" text={item.body} section={style.body} defaultColor="#4b5563" className="mb-3" />
        <CtaButton href={href} label={ctaLabel} section={style.button} defaultBg="transparent" defaultColor="#1e3a5f" />
      </div>
    </div>
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

  const slides = items.length ? items : [FALLBACK_SLIDE]

  return (
    <section className="py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative h-56 sm:h-48" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          {slides.map((item, i) => (
            <div key={item.id} className="absolute inset-0 transition-opacity duration-500" style={{ opacity: i === index ? 1 : 0, pointerEvents: i === index ? 'auto' : 'none' }}>
              <Slide item={item} />
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
