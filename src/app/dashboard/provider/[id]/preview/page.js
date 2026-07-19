'use client'
import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const DAYS = ['sun','mon','tue','wed','thu','fri','sat']
const DAY_LABELS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

export default function PreviewPage({ params }) {
  const { id } = use(params)
  const [p, setP] = useState(null)

  useEffect(() => {
    if (!supabase || !id) return
    supabase.from('providers').select('*').eq('id', id).single().then(({ data }) => setP(data))
  }, [id])

  if (!p) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>

  const R = ({ l, v }) => <div className="flex justify-between py-1.5 text-xs gap-2 border-b border-gray-50 last:border-0"><span className="text-gray-400 shrink-0">{l}</span><span className="text-gray-900 font-medium text-right">{v}</span></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-brand text-white text-center py-2 text-xs font-semibold">
        👁 Preview Mode — This is how physicians will see your listing
        <Link href={`/dashboard/provider/${id}`} className="ml-3 underline">← Back to Edit</Link>
      </div>
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center"><span className="text-white font-bold text-xs">R</span></div>
            <span className="text-lg font-bold text-gray-900">Refer<span className="text-brand">Ease</span></span>
          </div>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{p.name}</h1>
          <p className="text-sm text-brand font-medium mt-1">{p.type}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {p.accepting_referrals
              ? <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">✓ Accepting Referrals</span>
              : <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-full border border-red-200">✕ Not Accepting</span>}
            {p.wait_weeks !== null && (
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${p.wait_weeks === 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : p.wait_weeks <= 4 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-red-600 bg-red-50 border-red-200'}`}>
                {p.wait_weeks === 0 ? 'No wait' : `~${p.wait_weeks} week wait`}
              </span>
            )}
            {p.rating && <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">★ {Number(p.rating).toFixed(1)} ({p.reviews} reviews)</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Contact & Location</h3>
            <R l="Address" v={p.address || '—'} />
            {p.phone && <R l="Phone" v={p.phone} />}
            {p.fax && <R l="Fax" v={p.fax} />}
            {p.email && <R l="Email" v={p.email} />}
            {p.website && <R l="Website" v={p.website} />}
            <R l="Languages" v={(p.languages || ['English']).join(', ')} />
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Hours</h3>
            {p.hours && DAYS.map((d, i) => <R key={d} l={DAY_LABELS[i].slice(0, 3)} v={p.hours[d] || 'Closed'} />)}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Referral Requirements</h3>
            <p className="text-sm text-gray-700 leading-relaxed">{p.requirements || 'No specific requirements listed.'}</p>
          </div>

          {p.doctors?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Physicians</h3>
              {p.doctors.map((d, i) => <div key={i} className="py-1.5 text-sm text-gray-900 border-b border-gray-50 last:border-0">{d}</div>)}
            </div>
          )}

          {p.services?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 sm:col-span-2">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Services</h3>
              <div className="flex flex-wrap gap-1.5">
                {p.services.map(s => <span key={s} className="text-xs text-brand bg-brand/5 border border-brand/10 px-2.5 py-1 rounded-lg">{s}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
