'use client'
import { useState } from 'react'
import Logo from '@/components/Logo'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ProviderForm from '@/components/ProviderForm'
import Link from 'next/link'
import AlertModal from '@/components/AlertModal'

export default function NewProviderPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [alertMsg, setAlertMsg] = useState(null)

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
  if (!user || profile?.role !== 'provider') { router.push('/dashboard'); return null }

  const findDoctorByName = async (name) => {
    const clean = String(name || '').replace(/^dr\.?\s*/i, '').trim()
    if (!clean) return null
    const { data } = await supabase.from('providers').select('id, name').in('category', ['Specialist', 'Family Medicine']).ilike('name', `%${clean}%`).limit(1)
    return (data && data[0]) || null
  }

  const handleSubmit = async (data) => {
    if (!supabase) return
    setSaving(true)
    const docs = data._doctors || []
    const locations = data._locations || []
    delete data._doctors
    delete data._locations
    const { data: created, error } = await supabase.from('providers').insert({ ...data, owner_id: user.id, clinic_provider_id: locations[0]?.id || null }).select().single()
    if (error || !created) { setSaving(false); setAlertMsg('Error: ' + (error?.message || 'could not save')); return }
    for (const loc of locations.slice(1)) {
      await supabase.from('doctor_locations').insert({ doctor_provider_id: created.id, clinic_provider_id: loc.id })
    }
    let warn = null
    for (const r of docs) {
      if (r.id) {
        const { data: existing } = await supabase.from('providers').select('clinic_provider_id').eq('id', r.id).single()
        if (!existing?.clinic_provider_id) {
          await supabase.from('providers').update({ clinic_provider_id: created.id }).eq('id', r.id)
        } else if (existing.clinic_provider_id !== created.id) {
          const { count } = await supabase.from('doctor_locations').select('id', { count: 'exact', head: true }).eq('doctor_provider_id', r.id)
          if ((count || 0) >= 3) warn = `"${r.name}" already has 4 locations, remove one before linking here.`
          else await supabase.from('doctor_locations').upsert({ doctor_provider_id: r.id, clinic_provider_id: created.id }, { onConflict: 'doctor_provider_id,clinic_provider_id' })
        }
      } else {
        const dupe = await findDoctorByName(r.name)
        if (dupe) { warn = `"${r.name}" looks like it may already exist as "${dupe.name}" — search for them above and link instead of adding a duplicate.`; continue }
        await supabase.from('providers').insert({ name: r.name, type: r.specialty || null, specialty_code: r.specialty_code || null, gender: r.gender || null, accepting_referrals: r.accepting_referrals ?? null, category: /famil/i.test(r.specialty || '') ? 'Family Medicine' : 'Specialist', data_status: 'complete', clinic_provider_id: created.id })
      }
    }
    setSaving(false)
    if (warn) { setAlertMsg(warn); return }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Logo />
          <Link href="/dashboard" className="text-xs font-medium text-gray-500 hover:text-brand">← Back to Dashboard</Link>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Create New Listing</h1>
        <p className="text-sm text-gray-500 mb-6">Add your practice or clinic to ReferEasy so physicians can find and refer patients to you.</p>
        <ProviderForm onSubmit={handleSubmit} loading={saving} submitLabel="Create Listing" />
      </div>
      <AlertModal open={!!alertMsg} message={alertMsg} onClose={() => setAlertMsg(null)} />
    </div>
  )
}
