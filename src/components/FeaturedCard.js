'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

// One card design for every featured slot, navy banner top, white body
export default function FeaturedCard({ item, size = 'md' }) {
  const router = useRouter()
  const pathname = usePathname()
  const isDoctor = item._kind === 'doctor'
  const href = isDoctor ? `/doctors/${item.id}` : `/search?id=${item.id}`
  const alreadyOnSearch = pathname === '/search'
  const openIt = (e) => {
    if (isDoctor) return  // let the Link do its thing
    e.preventDefault()
    // Update URL + fire a custom event so the Find Care page can react without a full remount
    const u = new URL(window.location.href); u.searchParams.set('id', String(item.id)); window.history.pushState({}, '', u.toString())
    window.dispatchEvent(new CustomEvent('re-open-listing', { detail: { id: item.id } }))
  }
  const specialty = (isDoctor ? item.specialty : item.type) || item.category || 'Provider'
  const category = item.category || (isDoctor ? 'Specialist' : 'Clinic')

  const dims = size === 'lg'
    ? { w: 'w-full', banner: 'py-4 px-5', title: 'text-lg', body: 'p-5', min: 'min-h-[220px]' }
    : { w: 'w-full', banner: 'py-3 px-4', title: 'text-base', body: 'p-4', min: 'min-h-[200px]' }

  return (
    <Link href={href} onClick={alreadyOnSearch ? openIt : undefined} className={`${dims.w} bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 hover:border-brand/40 transition group ${dims.min} flex flex-col`}>
      <div className={`bg-gradient-to-r from-brand to-[#2c4f7c] ${dims.banner} flex items-center justify-between gap-2`}>
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/95 truncate">{specialty}</span>
        <span className="text-[9px] font-bold text-amber-300 bg-white/10 border border-white/25 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">Featured</span>
      </div>
      <div className={`${dims.body} flex-1 flex flex-col`}>
        <h3 className={`font-bold text-gray-900 ${dims.title} leading-snug line-clamp-2 inline-flex items-center gap-1.5`}>{item.name}{item.verified && <img src="/img/icon.png" alt="Verified" title="Verified on ReferEasy" className="w-5 h-5 rounded shrink-0" />}</h3>
        {!isDoctor && item.address && <p className="text-xs text-gray-500 mt-1 line-clamp-1">📍 {item.address}</p>}
        {isDoctor && item.category && <p className="text-xs text-brand/70 font-medium mt-1">{item.category}</p>}
        <div className="flex items-center gap-1.5 flex-wrap mt-auto pt-3">
          {item.verified && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand bg-brand/5 px-1.5 py-0.5 rounded-full border border-brand/15"><img src="/img/icon.png" alt="" className="w-4 h-4 rounded" />Verified</span>}
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
