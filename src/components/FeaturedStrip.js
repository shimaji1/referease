'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import FeaturedCard from './FeaturedCard'

const DOC_CATS = new Set(['Family Medicine', 'Specialist'])

const shuffle = (arr, seed = 0) => {
  const a = [...arr]
  // Deterministic order with a seeded rotation so different sections show different items
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(((Math.sin(seed + i) + 1) / 2) * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const km = (a, b, c, d) => { const R = 6371, r = Math.PI / 180, dLat = (c - a) * r, dLng = (d - b) * r; const A = Math.sin(dLat / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dLng / 2) ** 2; return R * 2 * Math.atan2(Math.sqrt(A), Math.sqrt(1 - A)) }

/**
 * layout:
 *   'hero-6'   → 3 columns × 2 rows (6 cards, homepage top)
 *   'row-3'    → 3 columns × 1 row (3 cards, other homepage sections)
 *   'stack-3'  → 1 column × 3 rows (3 cards vertical, Find Care top of results)
 */
export default function FeaturedStrip({
  layout = 'row-3',
  category = null,
  title = 'Featured providers',
  subtitle = null,
  loc = null,
  tint = false,
  fallbackToNearest = false,
  excludeIds = null,        // Set of "kind:id" strings to skip (dedupe across sections)
  onLoaded = null,          // callback(items) so parent can accumulate the exclude set
  sectionKey = 0,           // integer used to seed the shuffle so different sections rotate differently
}) {
  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)

  const target = layout === 'hero-6' ? 6 : 3

  useEffect(() => {
    if (!supabase) { setLoaded(true); return }
    let alive = true
    const load = async () => {
      const doctorSide = category ? DOC_CATS.has(category) : null
      const pool = []

      if (doctorSide !== true) {
        let q = supabase.from('providers').select('id, name, type, category, address, accepting_referrals, verified, rating, wait_weeks, lat, lng, featured, plan, trial_ends_at, plan_granted_by_admin, plan, trial_ends_at, plan_granted_by_admin').eq('data_status', 'complete')
        if (category && !DOC_CATS.has(category)) q = q.eq('category', category)
        const { data } = await q.eq('featured', true).limit(60)
        if (data) pool.push(...data.map(p => ({ ...p, _kind: 'provider' })))
      }
      if (doctorSide !== false) {
        let q = supabase.from('physicians').select('id, name, specialty, category, accepting_referrals, verified, wait_weeks, featured').eq('status', 'active')
        if (category && DOC_CATS.has(category)) q = q.eq('category', category)
        const { data } = await q.eq('featured', true).limit(60)
        if (data) pool.push(...data.map(d => ({ ...d, _kind: 'doctor' })))
      }

      // Fallback: no featured yet → pull well-rated verified as placeholder
      if (pool.length === 0 && fallbackToNearest) {
        if (doctorSide !== true) {
          let q = supabase.from('providers').select('id, name, type, category, address, accepting_referrals, verified, rating, wait_weeks, lat, lng, plan, trial_ends_at, plan_granted_by_admin').eq('data_status', 'complete').eq('verified', true)
          if (category && !DOC_CATS.has(category)) q = q.eq('category', category)
          const { data } = await q.limit(60)
          if (data) pool.push(...data.map(p => ({ ...p, _kind: 'provider' })))
        }
        if (doctorSide !== false && pool.length < 12) {
          let q = supabase.from('physicians').select('id, name, specialty, category, accepting_referrals, verified, wait_weeks').eq('status', 'active').eq('verified', true)
          if (category && DOC_CATS.has(category)) q = q.eq('category', category)
          const { data } = await q.limit(60)
          if (data) pool.push(...data.map(d => ({ ...d, _kind: 'doctor' })))
        }
      }

      // Sort: geographic if we have location, otherwise seeded shuffle so different sections show different items
      let ordered = pool
      if (loc?.lat && loc?.lng) {
        ordered = pool.map(x => ({ ...x, _d: (x.lat && x.lng) ? km(loc.lat, loc.lng, x.lat, x.lng) : 9999 })).sort((a, b) => a._d - b._d)
      } else {
        ordered = shuffle(pool, sectionKey)
      }

      // Drop excluded IDs (already shown in prior sections)
      const filtered = excludeIds && excludeIds.size > 0
        ? ordered.filter(x => !excludeIds.has(`${x._kind}:${x.id}`))
        : ordered

      const picked = filtered.slice(0, target)
      if (alive) {
        setItems(picked); setLoaded(true)
        if (onLoaded) onLoaded(picked)
      }
    }
    load()
    return () => { alive = false }
  }, [category, loc?.lat, loc?.lng, fallbackToNearest, sectionKey])

  if (!loaded) return null

  const wrapCls = tint ? 'bg-gradient-to-b from-blue-50/40 to-transparent py-10' : 'py-8'

  if (items.length === 0) {
    return (
      <section className={wrapCls}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {(title || subtitle) && (
            <div className="mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h2>
              {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
            </div>
          )}
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

  const gridCls =
    layout === 'hero-6'  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' :
    layout === 'stack-3' ? 'grid grid-cols-1 gap-4' :
                           'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'

  return (
    <section className={wrapCls}>
      <div className={`${layout === 'stack-3' ? '' : 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8'}`}>
        {(title || subtitle) && (
          <div className="mb-5">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
        )}
        <div className={gridCls}>
          {items.map(x => <FeaturedCard key={x._kind + x.id} item={x} size={layout === 'hero-6' ? 'md' : 'lg'} />)}
        </div>
      </div>
    </section>
  )
}
