'use client'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ProviderForm from '@/components/ProviderForm'
import Link from 'next/link'

export default function NewProviderPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
  if (!user || profile?.role !== 'specialist') { router.push('/dashboard'); return null }

  const handleSubmit = async (data) => {
    if (!supabase) return
    setSaving(true)
    const docs = data._doctors || []
    delete data._doctors
    const { data: created, error } = await supabase.from('providers').insert({ ...data, owner_id: user.id }).select().single()
    setSaving(false)
    if (error || !created) { alert('Error: ' + (error?.message || 'could not save')); return }
    for (const r of docs) {
      const { data: doc } = await supabase.from('physicians').insert({ name: r.name, specialty: r.specialty || null, specialty_code: r.specialty_code || null, accepting_referrals: r.accepting_referrals ?? null, category: /famil/i.test(r.specialty || '') ? 'Family Medicine' : 'Specialist', status: 'active' }).select().single()
      if (doc) await supabase.from('physician_locations').insert({ physician_id: doc.id, provider_id: created.id, is_primary: true, name: data.name || null, address: data.address || null, phone: data.phone || null, fax: data.fax || null, hours: data.hours || null })
    }
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
          <Link href="/dashboard" className="text-xs font-medium text-gray-500 hover:text-brand">← Back to Dashboard</Link>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Create New Listing</h1>
        <p className="text-sm text-gray-500 mb-6">Add your practice or clinic to ReferEasy so physicians can find and refer patients to you.</p>
        <ProviderForm onSubmit={handleSubmit} loading={saving} submitLabel="Create Listing" />
      </div>
    </div>
  )
}
