'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/Logo'
import Link from 'next/link'
import { getPlanStatus, limit as planLimit } from '@/lib/plan'
import { fetchStaff, inviteStaff, revokeStaff } from '@/lib/staff'
import ConfirmModal from '@/components/ConfirmModal'
import { checkPassword } from '@/lib/password'
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter'

const inp = "w-full px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-xl text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 placeholder:text-gray-400"
const card = "bg-white border border-gray-200 rounded-xl p-6"
const label = "block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5"

function AccountSection({ profile, updateProfile }) {
  const [fullName, setFullName] = useState(profile.full_name || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const save = async () => {
    setSaving(true); setMsg('')
    const { error } = await updateProfile({ full_name: fullName.trim(), phone: phone.trim() || null })
    setSaving(false)
    setMsg(error ? 'Error: ' + error.message : 'Saved!')
  }

  return (
    <div className={card}>
      <h2 className="text-sm font-bold text-gray-900 mb-4">Account Information</h2>
      <div className="space-y-3 max-w-md">
        <div>
          <label className={label}>Full Name</label>
          <input className={inp} value={fullName} onChange={e => setFullName(e.target.value)} />
        </div>
        <div>
          <label className={label}>Email</label>
          <input className={inp + ' bg-gray-50 text-gray-500'} value={profile.email || ''} disabled />
          <p className="text-[11px] text-gray-400 mt-1">Contact support to change your email address.</p>
        </div>
        <div>
          <label className={label}>Phone</label>
          <input className={inp} value={phone} onChange={e => setPhone(e.target.value)} placeholder="905-555-0123" />
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button onClick={save} disabled={saving} className="px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          {msg && <span className={`text-sm ${msg.startsWith('Error') ? 'text-red-600' : 'text-emerald-600'}`}>{msg}</span>}
        </div>
      </div>
    </div>
  )
}

function PasswordSection({ updatePassword }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const save = async () => {
    setMsg('')
    if (!checkPassword(password).valid) { setMsg('Error: Password needs 8+ characters, a capital letter, a number, and a symbol.'); return }
    if (password !== confirm) { setMsg('Error: Passwords do not match'); return }
    setSaving(true)
    const { error } = await updatePassword(password)
    setSaving(false)
    if (error) { setMsg('Error: ' + error.message); return }
    setPassword(''); setConfirm(''); setMsg('Password updated!')
  }

  return (
    <div className={card}>
      <h2 className="text-sm font-bold text-gray-900 mb-4">Change Password</h2>
      <div className="space-y-3 max-w-md">
        <div>
          <label className={label}>New Password</label>
          <input className={inp} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a new password" />
          <PasswordStrengthMeter password={password} />
        </div>
        <div>
          <label className={label}>Confirm New Password</label>
          <input className={inp} type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter password" />
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button onClick={save} disabled={saving || !password} className="px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition disabled:opacity-50">
            {saving ? 'Updating…' : 'Update Password'}
          </button>
          {msg && <span className={`text-sm ${msg.startsWith('Error') ? 'text-red-600' : 'text-emerald-600'}`}>{msg}</span>}
        </div>
      </div>
    </div>
  )
}

function BillingSection({ providers, profile }) {
  const [requesting, setRequesting] = useState(null)
  const [msg, setMsg] = useState('')

  const requestUpgrade = async (provider, plan) => {
    setRequesting(provider.id); setMsg('')
    const res = await fetch('/api/plan/upgrade-request', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: profile.email, name: profile.full_name, provider_id: provider.id, requested_plan: plan, message: `Requested from Settings for listing "${provider.name}"` }),
    }).then(r => r.json()).catch(e => ({ error: e.message }))
    setRequesting(null)
    setMsg(res.error ? 'Error: ' + res.error : 'Request sent — we\'ll follow up by email.')
  }

  if (!providers.length) return (
    <div className={card}><h2 className="text-sm font-bold text-gray-900 mb-2">Billing</h2><p className="text-sm text-gray-500">Create a listing first to see plan and billing details.</p></div>
  )

  return (
    <div className="space-y-4">
      {providers.map(p => {
        const status = getPlanStatus(p)
        return (
          <div key={p.id} className={card}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-sm font-bold text-gray-900">{p.name}</h2>
                <p className="text-xs text-gray-500 mt-0.5">Current plan: <span className="font-semibold text-gray-700">{status.label}</span></p>
              </div>
              <div className="flex gap-2">
                {status.tier !== 'featured' && (
                  <button onClick={() => requestUpgrade(p, status.tier === 'listed' ? 'verified' : 'featured')} disabled={requesting === p.id}
                    className="px-4 py-2 bg-brand text-white text-xs font-semibold rounded-lg hover:bg-brand-dark transition disabled:opacity-50">
                    {requesting === p.id ? 'Sending…' : `Request upgrade to ${status.tier === 'listed' ? 'Verified' : 'Featured'}`}
                  </button>
                )}
                <Link href="/pricing" className="px-4 py-2 bg-white text-brand text-xs font-semibold rounded-lg border border-brand/20 hover:bg-brand/5 transition">See plans</Link>
              </div>
            </div>
          </div>
        )
      })}
      {msg && <p className={`text-sm ${msg.startsWith('Error') ? 'text-red-600' : 'text-emerald-600'}`}>{msg}</p>}
      <p className="text-xs text-gray-400">We don't take payment automatically yet — upgrade requests go to our team and we'll follow up to get you set up.</p>
    </div>
  )
}

function StaffSection({ providers, user }) {
  const owned = providers.filter(p => p.owner_id === user.id)
  const [selected, setSelected] = useState(owned[0]?.id || null)
  const [staff, setStaff] = useState([])
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [msg, setMsg] = useState('')
  const [pendingRevoke, setPendingRevoke] = useState(null)

  const provider = owned.find(p => p.id === selected)
  const cap = provider ? planLimit(provider, 'max_staff') : 0
  const activeCount = staff.filter(s => s.status !== 'revoked').length

  const load = useCallback(async () => {
    if (!selected) return
    setStaff(await fetchStaff(selected))
  }, [selected])

  useEffect(() => { load() }, [load])

  const invite = async () => {
    setMsg('')
    if (!email.trim()) return
    setInviting(true)
    const res = await inviteStaff(selected, email.trim(), user.id)
    setInviting(false)
    if (res.error) { setMsg('Error: ' + res.error); return }
    setEmail(''); setMsg('Invite sent!'); load()
  }

  const revoke = async () => {
    await revokeStaff(pendingRevoke.id)
    setPendingRevoke(null)
    load()
  }

  if (!owned.length) return (
    <div className={card}><h2 className="text-sm font-bold text-gray-900 mb-2">Staff & Team</h2><p className="text-sm text-gray-500">Create a listing first to invite staff to help manage it.</p></div>
  )

  const statusPill = { pending: 'text-amber-700 bg-amber-50 border-amber-200', accepted: 'text-emerald-700 bg-emerald-50 border-emerald-200', revoked: 'text-gray-500 bg-gray-100 border-gray-200' }

  return (
    <div className={card}>
      <h2 className="text-sm font-bold text-gray-900 mb-1">Staff & Team</h2>
      <p className="text-xs text-gray-500 mb-4">Invite teammates to help manage a listing — each person gets their own login, no password sharing.</p>

      {owned.length > 1 && (
        <div className="mb-4">
          <label className={label}>Listing</label>
          <select className={inp} value={selected || ''} onChange={e => setSelected(Number(e.target.value))}>
            {owned.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      <div className="flex gap-2 mb-2">
        <input className={inp} value={email} onChange={e => setEmail(e.target.value)} placeholder="teammate@clinic.ca"
          disabled={activeCount >= cap} onKeyDown={e => e.key === 'Enter' && invite()} />
        <button onClick={invite} disabled={inviting || !email.trim() || activeCount >= cap} className="px-4 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition disabled:opacity-50 shrink-0">
          {inviting ? 'Sending…' : 'Invite'}
        </button>
      </div>
      <p className="text-[11px] text-gray-400 mb-4">{activeCount} of {cap} staff account{cap === 1 ? '' : 's'} used
        {activeCount >= cap && <> · <Link href="/pricing" className="text-brand font-semibold hover:underline">Upgrade for more →</Link></>}
      </p>
      {msg && <p className={`text-sm mb-3 ${msg.startsWith('Error') ? 'text-red-600' : 'text-emerald-600'}`}>{msg}</p>}

      {staff.filter(s => s.status !== 'revoked').length === 0 ? (
        <p className="text-sm text-gray-400">No staff invited yet.</p>
      ) : (
        <div className="space-y-2">
          {staff.filter(s => s.status !== 'revoked').map(s => (
            <div key={s.id} className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg px-3 py-2.5">
              <span className="text-sm text-gray-900 truncate">{s.email}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${statusPill[s.status]}`}>{s.status}</span>
                <button onClick={() => setPendingRevoke(s)} className="text-xs font-semibold text-red-600 hover:underline">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmModal
        open={!!pendingRevoke}
        title="Remove staff access?"
        message={pendingRevoke ? `Remove ${pendingRevoke.email}'s access to this listing?` : ''}
        confirmLabel="Remove"
        danger
        onConfirm={revoke}
        onCancel={() => setPendingRevoke(null)}
      />
    </div>
  )
}

function DangerZone({ user, profile }) {
  const [requested, setRequested] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const requestDeletion = async () => {
    setBusy(true)
    const { error } = await supabase.from('profiles').update({ deletion_requested_at: new Date().toISOString() }).eq('id', user.id)
    setBusy(false)
    setConfirming(false)
    if (!error) setRequested(true)
  }

  return (
    <div className="bg-white border border-red-200 rounded-xl p-6">
      <h2 className="text-sm font-bold text-red-700 mb-1">Danger Zone</h2>
      <p className="text-xs text-gray-500 mb-4">Deleting your account removes your access to ReferEasy. This can't be undone once completed.</p>
      {requested || profile.deletion_requested_at ? (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 inline-block">Deletion requested — our team will follow up by email to confirm.</p>
      ) : (
        <button onClick={() => setConfirming(true)} disabled={busy} className="px-5 py-2.5 bg-red-50 text-red-600 text-sm font-semibold rounded-xl border border-red-200 hover:bg-red-100 transition disabled:opacity-50">
          {busy ? 'Requesting…' : 'Request Account Deletion'}
        </button>
      )}
      <ConfirmModal
        open={confirming}
        title="Request account deletion?"
        message="Our team will follow up by email to confirm and complete this — it's not instant."
        confirmLabel="Request deletion"
        danger
        busy={busy}
        onConfirm={requestDeletion}
        onCancel={() => setConfirming(false)}
      />
    </div>
  )
}

export default function SettingsPage() {
  const { user, profile, loading: authLoading, signOut, updatePassword, updateProfile } = useAuth()
  const router = useRouter()
  const [providers, setProviders] = useState([])
  const [tab, setTab] = useState('account')

  useEffect(() => {
    if (!supabase || !user || profile?.role !== 'provider') return
    supabase.from('providers').select('*').eq('owner_id', user.id).order('name').then(({ data }) => { if (data) setProviders(data) })
  }, [user, profile])

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
  if (!user) { router.push('/login'); return null }

  const isProvider = profile?.role === 'provider'
  const tabs = [
    { key: 'account', label: 'Account Information' },
    { key: 'password', label: 'Change Password' },
    ...(isProvider ? [{ key: 'billing', label: 'Billing' }, { key: 'staff', label: 'Staff & Team' }] : []),
    { key: 'danger', label: 'Danger Zone' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-xs font-medium text-gray-500 hover:text-brand px-3 py-1.5 border border-gray-200 rounded-lg transition">← Dashboard</Link>
            <button onClick={() => { signOut(); router.push('/') }} className="text-xs font-medium text-gray-500 hover:text-red-600 px-3 py-1.5 border border-gray-200 rounded-lg transition">Sign Out</button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Settings</h1>
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
          <div className="flex md:flex-col gap-1 overflow-x-auto">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`text-left px-3 py-2 text-sm font-semibold rounded-lg whitespace-nowrap transition ${tab === t.key ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div>
            {tab === 'account' && <AccountSection profile={profile} updateProfile={updateProfile} />}
            {tab === 'password' && <PasswordSection updatePassword={updatePassword} />}
            {tab === 'billing' && isProvider && <BillingSection providers={providers} profile={profile} />}
            {tab === 'staff' && isProvider && <StaffSection providers={providers} user={user} />}
            {tab === 'danger' && <DangerZone user={user} profile={profile} />}
          </div>
        </div>
      </div>
    </div>
  )
}
