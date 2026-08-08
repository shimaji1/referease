'use client'
import { useState, useEffect, Suspense } from 'react'
import Logo from '@/components/Logo'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { WAIT_TYPES } from '@/lib/waitTime'

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function UpdateInfoContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [state, setState] = useState('loading') // loading | error | ready | done
  const [error, setError] = useState('')
  const [provider, setProvider] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) { setState('error'); setError('Missing link token.'); return }
    fetch(`/api/update-info?token=${token}`).then(r => r.json()).then(res => {
      if (res.error) { setState('error'); setError(res.error); return }
      setProvider(res.provider)
      setForm({
        accepting: res.provider.accepting_referrals === true ? 'true' : res.provider.accepting_referrals === false ? 'false' : 'unknown',
        wait_type: res.provider.wait_type || (res.provider.wait_weeks != null ? 'weeks' : ''),
        wait_weeks: res.provider.wait_weeks ?? '',
        phone: res.provider.phone || '', fax: res.provider.fax || '', email: res.provider.email || '', website: res.provider.website || '',
        hours: res.provider.hours || {},
      })
      setState('ready')
    }).catch(e => { setState('error'); setError(e.message) })
  }, [token])

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))
  const setHour = (day, v) => setForm(prev => ({ ...prev, hours: { ...prev.hours, [day]: v || null } }))

  const save = async () => {
    setSaving(true); setError('')
    const res = await fetch('/api/update-info', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        accepting_referrals: form.accepting === 'unknown' ? null : form.accepting === 'true',
        wait_type: form.wait_type || null,
        wait_weeks: form.wait_type === 'weeks' ? form.wait_weeks : null,
        phone: form.phone, fax: form.fax, email: form.email, website: form.website, hours: form.hours,
      }),
    }).then(r => r.json()).catch(e => ({ error: e.message }))
    setSaving(false)
    if (res.error) { setError(res.error); return }
    setState('done')
  }

  const inp = "w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-xl text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 placeholder:text-gray-400"
  const label = "block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5"

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="p-4"><Logo /></div>
      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-lg">
          {state === 'loading' && <p className="text-center text-sm text-gray-400">Loading…</p>}

          {state === 'error' && (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
              <div className="text-3xl mb-3">⚠️</div>
              <h1 className="text-lg font-bold text-gray-900 mb-2">Can't open this link</h1>
              <p className="text-sm text-gray-500 mb-5">{error}</p>
              <Link href="/dashboard" className="inline-flex px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition">Go to Dashboard</Link>
            </div>
          )}

          {state === 'done' && (
            <div className="bg-white border-2 border-emerald-300 rounded-xl p-8 text-center">
              <div className="text-4xl mb-3">✅</div>
              <h1 className="text-lg font-bold text-gray-900 mb-2">Updated!</h1>
              <p className="text-sm text-gray-500">Thanks for keeping {provider?.name}'s listing current — this helps referring physicians every time.</p>
            </div>
          )}

          {state === 'ready' && form && (
            <div className="animate-fade-in">
              <h1 className="text-2xl font-bold text-gray-900">Update your listing</h1>
              <p className="text-sm text-gray-500 mt-1 mb-6">{provider.name} — no login needed, just confirm what's current.</p>

              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <div>
                  <label className={label}>Accepting Referrals / New Patients</label>
                  <select className={inp} value={form.accepting} onChange={e => set('accepting', e.target.value)}>
                    <option value="unknown">Unknown</option>
                    <option value="true">Accepting</option>
                    <option value="false">Not accepting</option>
                  </select>
                </div>
                <div>
                  <label className={label}>Wait Time</label>
                  <div className="flex gap-2">
                    <select className={inp} value={form.wait_type || ''} onChange={e => set('wait_type', e.target.value || '')}>
                      <option value="">Varies / unknown</option>
                      {WAIT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    {form.wait_type === 'weeks' && (
                      <input className={inp} type="number" min="0" value={form.wait_weeks} onChange={e => set('wait_weeks', e.target.value)} placeholder="e.g. 3" />
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={label}>Phone</label>
                    <input className={inp} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="905-555-0123" />
                  </div>
                  <div>
                    <label className={label}>Fax</label>
                    <input className={inp} value={form.fax} onChange={e => set('fax', e.target.value)} placeholder="905-555-0124" />
                  </div>
                  <div>
                    <label className={label}>Email</label>
                    <input className={inp} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
                  </div>
                  <div>
                    <label className={label}>Website</label>
                    <input className={inp} value={form.website} onChange={e => set('website', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className={label}>Hours</label>
                  <div className="grid grid-cols-2 gap-2">
                    {DAYS.map((d, i) => (
                      <div key={d} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-16 shrink-0">{DAY_LABELS[i].slice(0, 3)}</span>
                        <input className="flex-1 px-2.5 py-2 text-xs bg-white border border-gray-300 rounded-lg text-gray-900 outline-none focus:border-brand placeholder:text-gray-300"
                          value={form.hours[d] || ''} onChange={e => setHour(d, e.target.value)} placeholder="9:00-17:00" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {error && <p className="text-sm text-red-600 mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

              <button onClick={save} disabled={saving} className="w-full mt-5 py-3 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition disabled:opacity-50 text-sm">
                {saving ? 'Saving…' : 'Save Updates'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function UpdateInfoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>}>
      <UpdateInfoContent />
    </Suspense>
  )
}
