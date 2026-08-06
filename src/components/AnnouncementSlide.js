'use client'
import Link from 'next/link'
import { FONT_OPTIONS, mergeStyle } from '@/lib/announcements'

const fontFamily = (key) => FONT_OPTIONS.find(f => f.key === key)?.family
const justifyFor = (align) => (align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start')
const VJUSTIFY = { top: 'flex-start', middle: 'center', bottom: 'flex-end' }
const IMAGE_WIDTH = { sm: '30%', md: '40%', lg: '55%' }
const IMAGE_ZOOM = { sm: 1, md: 1.1, lg: 1.25 }
// Corner position for the logo badge — kept out of the main text stack so it never gets
// clipped when a user cranks up headline/body font sizes and the stack overflows the card.
const LOGO_POS = { left: { left: 12 }, center: { left: '50%', transform: 'translateX(-50%)' }, right: { right: 12 } }

function StyledText({ as: Tag = 'p', text, section, defaultColor, className = '' }) {
  if (!text) return null
  return (
    <Tag className={className} style={{
      width: '100%', fontSize: `${section.size}px`, fontFamily: fontFamily(section.font),
      color: section.color || defaultColor, textAlign: section.align,
      fontWeight: section.bold ? 700 : 400,
      fontStyle: section.italic ? 'italic' : 'normal',
      textDecoration: section.underline ? 'underline' : 'none',
    }}>
      {text}
    </Tag>
  )
}

function LogoBadge({ url, section }) {
  if (!url) return null
  return (
    <img src={url} alt="" style={{ position: 'absolute', top: 12, height: `${section.size}px`, width: 'auto', borderRadius: 6, objectFit: 'contain', zIndex: 2, ...LOGO_POS[section.align] }} />
  )
}

function CtaButton({ href, label, section, defaultBg, defaultColor }) {
  return (
    <div style={{ display: 'flex', justifyContent: justifyFor(section.align), width: '100%' }}>
      <Link href={href}
        style={{ fontSize: `${section.size}px`, padding: '0.6em 1.2em', borderRadius: '8px', fontWeight: 700, background: section.bg || defaultBg, color: section.color || defaultColor, display: 'inline-block' }}
        className="hover:opacity-90 transition">
        {label} →
      </Link>
    </div>
  )
}

// Renders one announcement slide from a DB-row-shaped `item`. Shared between the live
// homepage carousel and the edit-form live preview so what you design is what ships.
export default function AnnouncementSlide({ item }) {
  const href = item.cta_url || (item.providers?.id ? `/search?id=${item.providers.id}` : '#')
  const ctaLabel = item.cta_label || 'Learn more'
  const style = mergeStyle(item.style)
  const vJustify = VJUSTIFY[style.layout.v] || 'center'

  if (item.template === 'full-banner' && item.image_url) {
    const zoom = IMAGE_ZOOM[style.image.size] || 1
    return (
      <div className="relative block w-full h-full rounded-2xl overflow-hidden">
        <img src={item.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <LogoBadge url={item.logo_url} section={style.logo} />
        <div className="relative h-full flex flex-col gap-1 p-6 sm:p-8 overflow-hidden" style={{ justifyContent: vJustify }}>
          <StyledText as="h3" text={item.headline} section={style.headline} defaultColor="#ffffff" />
          <StyledText as="h4" text={item.subheadline} section={style.subheadline} defaultColor="#ffffff" />
          <StyledText as="p" text={item.body} section={style.body} defaultColor="rgba(255,255,255,0.85)" />
          <div className="mt-2"><CtaButton href={href} label={ctaLabel} section={style.button} defaultBg="#ffffff" defaultColor="#1e3a5f" /></div>
        </div>
      </div>
    )
  }

  if (item.template === 'text-card' || !item.image_url) {
    return (
      <div className="relative block w-full h-full rounded-2xl bg-gradient-to-br from-brand to-[#2c4f7c] overflow-hidden">
        <LogoBadge url={item.logo_url} section={style.logo} />
        <div className="h-full flex flex-col gap-1 p-6 sm:p-8 overflow-hidden" style={{ justifyContent: vJustify }}>
          <StyledText as="h3" text={item.headline} section={style.headline} defaultColor="#ffffff" />
          <StyledText as="h4" text={item.subheadline} section={style.subheadline} defaultColor="#ffffff" />
          <StyledText as="p" text={item.body} section={style.body} defaultColor="rgba(255,255,255,0.8)" />
          <div className="mt-2"><CtaButton href={href} label={ctaLabel} section={style.button} defaultBg="#ffffff" defaultColor="#1e3a5f" /></div>
        </div>
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
      <div className="relative flex-1 min-w-0 overflow-hidden">
        <LogoBadge url={item.logo_url} section={style.logo} />
        <div className="h-full flex flex-col gap-1 p-6" style={{ justifyContent: vJustify }}>
          <StyledText as="h3" text={item.headline} section={style.headline} defaultColor="#111827" />
          <StyledText as="h4" text={item.subheadline} section={style.subheadline} defaultColor="#374151" />
          <StyledText as="p" text={item.body} section={style.body} defaultColor="#4b5563" />
          <div className="mt-2"><CtaButton href={href} label={ctaLabel} section={style.button} defaultBg="transparent" defaultColor="#1e3a5f" /></div>
        </div>
      </div>
    </div>
  )
}
