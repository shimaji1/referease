'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import FeaturedCard from './FeaturedCard'

const DOC_CATS = new Set(['Family Medicine', 'Specialist'])

const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
const km = (a, b, c, d) => { const R = 6371, r = Math.PI / 180, dLat = (c - a) * r, dLng = (d - b) * r; const A = Math.sin(dLat / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dLng / 2) ** 2; return R * 2 * Math.atan2(Math.sqrt(A), Math.sqrt(1 - A)) }

// layout: 'hero-6' (3x2 grid, 6 items), 'row-3' (3x1 grid, 3 items), or 'scroll' (horizontal carousel, default)
export default function FeaturedStrip({ category = null, title = 'Featured providers', subtitle = null, loc = null, tint = false, source = 'featured', layout = 'scroll', sectionKey = 0, excludeIds = null, onLoaded = null }) {
  const [pool, setPool] = useState(null)
  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)
  const scroller = useRef(null)
  const pickedRef = useRef(false)

  // Fetch the raw candidate pool once per category/location — never re-fetches for excludeIds changes.
  useEffect(() => {
    if (!supabase) { setLoaded(true); return }
    let alive = true
    pickedRef.current = false
    const load = async () => {
      const doctorSide = category ? DOC_CATS.has(category) : null
      const results = []
      // 'featured' sections show ONLY providers who are actually featured=true — never
      // backfilled with verified-but-not-featured listings. If there aren't enough, the
      // empty state ("Get Featured →") shows instead, which is the honest outcome.
      // 'verified' sections (e.g. "Recently verified providers") show verified=true only.
      const filterCol = source === 'verified' ? 'verified' : 'featured'

      if (doctorSide !== true) {
        let q = supabase.from('providers').select('id, name, type, category, address, accepting_referrals, verified, rating, wait_weeks, lat, lng, featured').eq('data_status', 'complete')
        if (category && !DOC_CATS.has(category)) q = q.eq('category', category)
        q = q.eq(filterCol, true).limit(24)
        const { data } = await q
        if (data) results.push(...data.map(p => ({ ...p, _kind: 'provider' })))
      }
      if (doctorSide !== false) {
        // Doctors ARE providers now: category IN ('Specialist','Family Medicine')
        let q = supabase.from('providers').select('id, name, type, category, address, accepting_referrals, verified, rating, wait_weeks, lat, lng, featured, clinic_provider_id').eq('data_status', 'complete').in('category', ['Specialist','Family Medicine'])
        if (category && DOC_CATS.has(category)) q = q.eq('category', category)
        q = q.eq(filterCol, true).limit(24)
        const { data } = await q
        if (data) {
          // Fall back to the linked clinic's address when the doctor's own address is blank.
          const clinicIds = [...new Set(data.filter(d => !d.address && d.clinic_provider_id).map(d => d.clinic_provider_id))]
          let clinicAddr = new Map()
          if (clinicIds.length) {
            const { data: clinics } = await supabase.from('providers').select('id, address').in('id', clinicIds)
            clinicAddr = new Map((clinics || []).map(c => [c.id, c.address]))
          }
          results.push(...data.map(d => ({ ...d, specialty: d.type, address: d.address || clinicAddr.get(d.clinic_provider_id) || null, _kind: 'doctor' })))
        }
      }

      let final = results
      if (loc?.lat && loc?.lng) {
        final = results.map(x => ({ ...x, _d: (x.lat && x.lng) ? km(loc.lat, loc.lng, x.lat, x.lng) : 9999 })).sort((a, b) => a._d - b._d)
      } else {
        final = shuffle(results)
      }
      if (alive) setPool(final)
    }
    load()
    return () => { alive = false }
  }, [category, loc?.lat, loc?.lng, source])

  const limit = layout === 'hero-6' || layout === 'grid6' ? 6 : layout === 'row-3' || layout === 'grid3' ? 3 : 12
  const excludeKey = useMemo(() => excludeIds ? [...excludeIds].sort().join(',') : '', [excludeIds])

  // Pick which items to show once the pool is in, honoring items already shown by earlier sections.
  // Picks once and freezes — re-running this on every excludeIds change would make a section exclude
  // its own previously-shown items and keep reshuffling itself.
  useEffect(() => {
    if (pool === null || pickedRef.current) return
    const available = excludeIds ? pool.filter(x => !excludeIds.has(`${x._kind}:${x.id}`)) : pool
    const offset = available.length ? (sectionKey * limit) % available.length : 0
    const rotated = [...available.slice(offset), ...available.slice(0, offset)]
    const picked = rotated.slice(0, limit)
    pickedRef.current = true
    setItems(picked)
    setLoaded(true)
    if (onLoaded) onLoaded(picked)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, excludeKey])

  if (!loaded) return null

  const wrapCls = tint ? 'bg-gradient-to-b from-blue-50/40 to-transparent py-10' : 'py-8'

  if (items.length === 0) {
    return (
      <section className={wrapCls}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h2>
              {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
            </div>
          </div>
          <div className="bg-gradient-to-r from-brand/5 to-brand/10 border border-brand/15 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm sm:text-base font-bold text-gray-900">Your practice here.</p>
              <p className="text-sm text-gray-500 mt-1 max-w-md">Get Featured to appear in this spot for every referring physician{category ? ` searching ${category}` : ' in your area'}.</p>
            </div>
            <Link href="/pricing" className="px-6 py-3 bg-brand text-white text-sm font-bold rounded-xl hover:bg-brand-dark transition shrink-0">Get Featured →</Link>
          </div>
        </div>
      </section>
    )
  }

  const scrollBy = (dx) => scroller.current?.scrollBy({ left: dx, behavior: 'smooth' })

  if (layout === 'hero-6' || layout === 'grid6' || layout === 'row-3' || layout === 'grid3') {
    return (
      <section className={wrapCls}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-baseline justify-between mb-4 gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h2>
              {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(x => <FeaturedCard key={x._kind + x.id} item={x} />)}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={wrapCls}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-baseline justify-between mb-4 gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <div className="hidden sm:flex gap-2 shrink-0">
            <button onClick={() => scrollBy(-340)} aria-label="Scroll left" className="w-10 h-10 rounded-full border border-gray-200 bg-white text-gray-500 hover:border-brand hover:text-brand transition flex items-center justify-center text-lg">←</button>
            <button onClick={() => scrollBy(340)} aria-label="Scroll right" className="w-10 h-10 rounded-full border border-gray-200 bg-white text-gray-500 hover:border-brand hover:text-brand transition flex items-center justify-center text-lg">→</button>
          </div>
        </div>
        <div ref={scroller} className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3 -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: 'thin' }}>
          {items.map(x => <FeaturedCard key={x._kind + x.id} item={x} />)}
        </div>
      </div>
    </section>
  )
}
