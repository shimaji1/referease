'use client'
import { useState, useEffect, use } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ProviderForm from '@/components/ProviderForm'
import Link from 'next/link'
import FormsManager from '@/components/FormsManager'

export default function EditProviderPage({ params }) {
  const { id } = use(params)
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [provider, setProvider] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!supabase || !id) return
    supabase.from('providers').select('*').eq('id', id).single().then(async ({ data }) => {
      if (data) {
        let docRows = []
        try {
          const { data: links } = await supabase.from('physician_locations').select('physicians(*)').eq('provider_id', id)
          docRows = (links || []).filter(l => l.physicians).map(l => ({ id: l.physicians.id, name: l.physicians.name || '', specialty: l.physicians.specialty || '', specialty_code: l.physicians.specialty_code || '', accepting_referrals: l.physicians.accepting_referrals !== false }))
        } catch {}
        setProvider({
          ...data,
          rating: data.rating || '',
          lat: data.lat || '',
          lng: data.lng || '',
          wait_weeks: data.wait_weeks ?? '',
          services: data.services || [],
          doctors: data.doctors || [],
          languages: data.languages || ['English'],
          hours: data.hours || { mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null },
          _doctors: docRows,
        })
      }
      setLoading(false)
    })
  }, [id])

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
  if (!user || !provider) return null

  const handleSubmit = async (data) => {
    if (!supabase) return
    setSaving(true)
    const docs = data._doctors || []
    delete data._doctors
    const { error } = await supabase.from('providers').update(data).eq('id', id)
    if (error) { setSaving(false); alert('Error: ' + error.message); return }
    // reconcile doctors: update existing, create+link new, unlink removed
    const origIds = (provider._doctors || []).map(r => r.id).filter(Boolean)
    for (const r of docs) {
      const payload = { name: r.name, specialty: r.specialty || null, specialty_code: r.specialty_code || null, accepting_referrals: r.accepting_referrals ?? null, category: /famil/i.test(r.specialty || '') ? 'Family Medicine' : 'Specialist' }
      if (r.id) {
        await supabase.from('physicians').update(payload).eq('id', r.id)
      } else {
        const { data: doc } = await supabase.from('physicians').insert({ ...payload, status: 'active' }).select().single()
        if (doc) await supabase.from('physician_locations').insert({ physician_id: doc.id, provider_id: parseInt(id), is_primary: true })
      }
    }
    const keptIds = docs.map(r => r.id).filter(Boolean)
    for (const rid of origIds.filter(x => !keptIds.includes(x))) {
      await supabase.from('physician_locations').delete().eq('physician_id', rid).eq('provider_id', parseInt(id))
    }
    setSaving(false)
    router.push('/dashboard')
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this listing? This cannot be undone.')) return
    if (!supabase) return
    await supabase.from('providers').delete().eq('id', id)
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center"><span className="text-white font-bold text-xs">R</span></div>
            <span className="text-lg font-bold text-gray-900">Refer<span className="text-[#2563eb]">Easy</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/provider/${id}/preview`} className="text-xs font-medium text-gray-500 hover:text-brand border border-gray-200 px-3 py-1.5 rounded-lg">Preview</Link>
            <Link href="/dashboard" className="text-xs font-medium text-gray-500 hover:text-brand">← Dashboard</Link>
          </div>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Edit Listing</h1>
            <p className="text-sm text-gray-500 mt-0.5">{provider.name}</p>
          </div>
          <button onClick={handleDelete} className="text-xs font-medium text-red-500 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition">Delete Listing</button>
        </div>
        <ProviderForm initial={provider} onSubmit={handleSubmit} loading={saving} submitLabel="Save Changes" />

        <div className="mt-6 bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Forms</h3>
          <p className="text-xs text-gray-500 mb-4">Upload referral or intake forms. They appear on your public listing for referring doctors to download.</p>
          <FormsManager providerId={id} ownerId={user.id} />
        </div>
      </div>
    </div>
  )
}
