'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import FeaturedCard from './FeaturedCard'

const DOC_CATS = new Set(['Family Medicine', 'Specialist'])

const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
const km = (a, b, c, d) => { const R = 6371, r = Math.PI / 180, dLat = (c - a) * r, dLng = (d - b) * r; const A = Math.sin(dLat / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dLng / 2) ** 2; return R * 2 * Math.atan2(Math.sqrt(A), Math.sqrt(1 - A)) }

export default function FeaturedStrip({ category = null, title = 'Featured providers', subtitle = null, loc = null, tint = false, fallbackToNearest = false }) {
  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)
  const scroller = useRef(null)

  useEffect(() => {
    if (!supabase) { setLoaded(true); return }
    let alive = true
    const load = async () => {
      const doctorSide = category ? DOC_CATS.has(category) : null
      const results = []

      if (doctorSide !== true) {
        let q = supabase.from('providers').select('id, name, type, category, address, accepting_referrals, verified, rating, wait_weeks, lat, lng, featured').eq('data_status', 'complete')
        if (category && !DOC_CATS.has(category)) q = q.eq('category', category)
        q = q.eq('featured', true).limit(24)
        const { data } = await q
        if (data) results.push(...data.map(p => ({ ...p, _kind: 'provider' })))
      }
      if (doctorSide !== false) {
        // Doctors ARE providers now: category IN ('Specialist','Family Medicine')
        let q = supabase.from('providers').select('id, name, type, category, address, accepting_referrals, verified, rating, wait_weeks, lat, lng, featured').eq('data_status', 'complete').in('category', ['Specialist','Family Medicine'])
        if (category && DOC_CATS.has(category)) q = q.eq('category', category)
        q = q.eq('featured', true).limit(24)
        const { data } = await q
        if (data) results.push(...data.map(d => ({ ...d, specialty: d.type, _kind: 'doctor' })))
      }

      if (results.length === 0 && fallbackToNearest) {
        if (doctorSide !== true) {
          let q = supabase.from('providers').select('id, name, type, category, address, accepting_referrals, verified, rating, wait_weeks, lat, lng').eq('data_status', 'complete').eq('verified', true)
          if (category && !DOC_CATS.has(category)) q = q.eq('category', category)
          const { data } = await q.limit(60)
          if (data) results.push(...data.map(p => ({ ...p, _kind: 'provider' })))
        }
        if (doctorSide !== false && results.length < 12) {
          let q = supabase.from('providers').select('id, name, type, category, address, accepting_referrals, verified, rating, wait_weeks, lat, lng').eq('data_status', 'complete').eq('verified', true).in('category', ['Specialist','Family Medicine'])
          if (category && DOC_CATS.has(category)) q = q.eq('category', category)
          const { data } = await q.limit(60)
          if (data) results.push(...data.map(d => ({ ...d, specialty: d.type, _kind: 'doctor' })))
        }
      }

      let final = results
      if (loc?.lat && loc?.lng) {
        final = results.map(x => ({ ...x, _d: (x.lat && x.lng) ? km(loc.lat, loc.lng, x.lat, x.lng) : 9999 })).sort((a, b) => a._d - b._d)
      } else {
        final = shuffle(results)
      }
      if (alive) { setItems(final.slice(0, 12)); setLoaded(true) }
    }
    load()
    return () => { alive = false }
  }, [category, loc?.lat, loc?.lng, fallbackToNearest])

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
