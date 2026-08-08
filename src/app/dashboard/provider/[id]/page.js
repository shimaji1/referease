'use client'
import { useState, useEffect, use } from 'react'
import Logo from '@/components/Logo'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ProviderForm from '@/components/ProviderForm'
import Link from 'next/link'
import FormsManager from '@/components/FormsManager'
import ConfirmModal from '@/components/ConfirmModal'
import AlertModal from '@/components/AlertModal'

export default function EditProviderPage({ params }) {
  const { id } = use(params)
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [provider, setProvider] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [alertMsg, setAlertMsg] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!supabase || !id) return
    supabase.from('providers').select('*').eq('id', id).single().then(async ({ data }) => {
      if (data) {
        // Doctors linked to this clinic — primary (clinic_provider_id) plus anyone who has this
        // clinic as a secondary location (doctor_locations), so a doctor split across two
        // clinics shows up when editing either one, not just their primary.
        let docRows = []
        try {
          const [{ data: primaryDocs }, { data: secondaryLinks }] = await Promise.all([
            supabase.from('providers').select('id, name, type, specialty_code, accepting_referrals').eq('clinic_provider_id', id).in('category', ['Specialist', 'Family Medicine']),
            supabase.from('doctor_locations').select('doctor_provider_id').eq('clinic_provider_id', id),
          ])
          const primary = primaryDocs || []
          const secondaryIds = (secondaryLinks || []).map(l => l.doctor_provider_id).filter(did => !primary.some(d => d.id === did))
          let secondary = []
          if (secondaryIds.length) {
            const { data: docs } = await supabase.from('providers').select('id, name, type, specialty_code, accepting_referrals').in('id', secondaryIds)
            secondary = docs || []
          }
          docRows = [...primary, ...secondary].map(d => ({ id: d.id, name: d.name || '', specialty: d.type || '', specialty_code: d.specialty_code || '', accepting_referrals: d.accepting_referrals !== false }))
        } catch {}
        // This listing's own linked clinics: primary via clinic_provider_id, up to 3 more via doctor_locations
        let locationRows = []
        try {
          const clinicIds = []
          if (data.clinic_provider_id) clinicIds.push(data.clinic_provider_id)
          const { data: secondary } = await supabase.from('doctor_locations').select('clinic_provider_id, wait_type, wait_weeks').eq('doctor_provider_id', id)
          const waitByClinicId = {}
          ;(secondary || []).forEach(l => { if (!clinicIds.includes(l.clinic_provider_id)) clinicIds.push(l.clinic_provider_id); waitByClinicId[l.clinic_provider_id] = { wait_type: l.wait_type, wait_weeks: l.wait_weeks } })
          if (clinicIds.length) {
            const { data: clinics } = await supabase.from('providers').select('id, name, address').in('id', clinicIds)
            locationRows = clinicIds.map(cid => {
              const c = (clinics || []).find(x => x.id === cid)
              return c ? { ...c, ...(waitByClinicId[cid] || {}) } : null
            }).filter(Boolean)
          }
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
          _locations: locationRows,
        })
      }
      setLoading(false)
    })
  }, [id])

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
  if (!user || !provider) return null

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
    data.clinic_provider_id = locations[0]?.id || null
    const { error } = await supabase.from('providers').update(data).eq('id', id)
    if (error) { setSaving(false); setAlertMsg('Error: ' + error.message); return }
    const clinicId = parseInt(id)
    // reconcile this listing's own secondary linked locations (everything past the primary)
    await supabase.from('doctor_locations').delete().eq('doctor_provider_id', clinicId)
    for (const loc of locations.slice(1)) {
      await supabase.from('doctor_locations').insert({ doctor_provider_id: clinicId, clinic_provider_id: loc.id, wait_type: loc.wait_type || null, wait_weeks: loc.wait_weeks ?? null, wait_days_approx: loc.wait_days_approx ?? null })
    }
    // reconcile doctors: update existing, create+link new, unlink removed
    const origIds = (provider._doctors || []).map(r => r.id).filter(Boolean)
    let warn = null
    for (const r of docs) {
      const payload = { name: r.name, type: r.specialty || null, specialty_code: r.specialty_code || null, gender: r.gender || null, accepting_referrals: r.accepting_referrals ?? null, category: /famil/i.test(r.specialty || '') ? 'Family Medicine' : 'Specialist' }
      if (r.id) {
        await supabase.from('providers').update(payload).eq('id', r.id)
        if (!origIds.includes(r.id)) {
          const { data: existing } = await supabase.from('providers').select('clinic_provider_id').eq('id', r.id).single()
          if (!existing?.clinic_provider_id) {
            await supabase.from('providers').update({ clinic_provider_id: clinicId }).eq('id', r.id)
          } else if (existing.clinic_provider_id !== clinicId) {
            const { count } = await supabase.from('doctor_locations').select('id', { count: 'exact', head: true }).eq('doctor_provider_id', r.id)
            if ((count || 0) >= 3) warn = `"${r.name}" already has 4 locations, remove one before linking here.`
            else await supabase.from('doctor_locations').upsert({ doctor_provider_id: r.id, clinic_provider_id: clinicId }, { onConflict: 'doctor_provider_id,clinic_provider_id' })
          }
        }
      } else {
        const dupe = await findDoctorByName(r.name)
        if (dupe) { warn = `"${r.name}" looks like it may already exist as "${dupe.name}" — search for them above and link instead of adding a duplicate.`; continue }
        await supabase.from('providers').insert({ ...payload, data_status: 'complete', clinic_provider_id: clinicId })
      }
    }
    const keptIds = docs.map(r => r.id).filter(Boolean)
    for (const rid of origIds.filter(x => !keptIds.includes(x))) {
      await supabase.from('providers').update({ clinic_provider_id: null }).eq('id', rid).eq('clinic_provider_id', clinicId)
      await supabase.from('doctor_locations').delete().eq('doctor_provider_id', rid).eq('clinic_provider_id', clinicId)
    }
    setSaving(false)
    if (warn) { setAlertMsg(warn); return }
    router.push('/dashboard')
  }

  const handleDelete = async () => {
    if (!supabase) return
    setDeleting(true)
    await supabase.from('providers').delete().eq('id', id)
    setDeleting(false)
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Logo />
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
          <button onClick={() => setConfirmDelete(true)} className="text-xs font-medium text-red-500 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition">Delete Listing</button>
        </div>
        <ProviderForm initial={provider} onSubmit={handleSubmit} loading={saving} submitLabel="Save Changes" />

        <div className="mt-6 bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Forms</h3>
          <p className="text-xs text-gray-500 mb-4">Upload referral or intake forms. They appear on your public listing for referring doctors to download.</p>
          <FormsManager providerId={id} ownerId={user.id} provider={provider} />
        </div>
      </div>

      <ConfirmModal
        open={confirmDelete}
        title="Delete this listing?"
        message="This removes it permanently from search and can't be undone."
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
      <AlertModal open={!!alertMsg} message={alertMsg} onClose={() => setAlertMsg(null)} />
    </div>
  )
}
