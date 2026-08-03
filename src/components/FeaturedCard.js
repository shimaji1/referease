'use client'
import Link from 'next/link'
import { VerifiedPill, FeaturedTag } from '@/components/Badges'

// One card design for every featured slot — navy banner top, white body
export default function FeaturedCard({ item, size = 'md' }) {
  const isDoctor = item._kind === 'doctor'
  const href = isDoctor ? `/search?id=${item.id}` : `/search?id=${item.id}`
  const specialty = (isDoctor ? item.specialty : item.type) || item.category || 'Provider'

  const dims = size === 'lg'
    ? { w: 'w-full', banner: 'py-4 px-5', title: 'text-lg', body: 'p-5', min: 'min-h-[220px]' }
    : { w: 'w-[320px]', banner: 'py-3 px-4', title: 'text-base', body: 'p-4', min: 'min-h-[200px]' }

  return (
    <Link href={href} className={`${dims.w} shrink-0 snap-start relative bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 hover:border-brand/40 transition group ${dims.min} flex flex-col`}>
      <FeaturedTag />
      <div className={`bg-gradient-to-r from-brand to-[#2c4f7c] ${dims.banner} flex items-center gap-2`}>
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/95 truncate min-w-0 flex-1 pr-[84px]">{specialty}</span>
      </div>
      <div className={`${dims.body} flex-1 flex flex-col`}>
        <h3 className={`font-bold text-gray-900 ${dims.title} leading-snug line-clamp-2`}>{item.name}</h3>
        {item.address && <p className="text-xs text-gray-500 mt-1 line-clamp-1">📍 {item.address}</p>}
        <div className="flex items-center gap-1.5 flex-wrap mt-auto pt-3">
          {item.verified && <VerifiedPill />}
          {item.accepting_referrals === true && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Accepting</span>}
          {item.accepting_referrals === false && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">Not accepting</span>}
          {item.accepting_referrals == null && <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">Availability unknown</span>}
          {item.wait_weeks != null && <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">~{item.wait_weeks} wk</span>}
          {item.rating && <span className="text-[10px] font-semibold text-amber-500">★ {Number(item.rating).toFixed(1)}</span>}
        </div>
      </div>
    </Link>
  )
}
