'use client'
import { useState, useEffect, use } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ProviderForm from '@/components/ProviderForm'
import Link from 'next/link'

export default function EditProviderPage({ params }) {
  const { id } = use(params)
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [provider, setProvider] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!supabase || !id) return
    supabase.from('providers').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
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
    const { error } = await supabase.from('providers').update(data).eq('id', id)
    setSaving(false)
    if (error) { alert('Error: ' + error.message); return }
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
            <span className="text-lg font-bold text-gray-900">Refer<span className="text-brand">Easy</span></span>
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
      </div>
    </div>
  )
}
