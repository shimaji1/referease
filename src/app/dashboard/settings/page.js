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
import SquareCheckoutModal from '@/components/SquareCheckoutModal'
import SquareUpdateCardModal from '@/components/SquareUpdateCardModal'

const inp = "w-full px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-xl text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 placeholder:text-gray-400"
const card = "bg-white border border-gray-200 rounded-xl p-6"
const label = "block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5"

function AccountSection({ profile, updateProfile, user }) {
  const [fullName, setFullName] = useState(profile.full_name || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [companyName, setCompanyName] = useState(profile.company_name || '')
  const [taxNumber, setTaxNumber] = useState(profile.tax_number || '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const save = async () => {
    setSaving(true); setMsg('')
    const { error } = await updateProfile({
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      company_name: companyName.trim() || null,
      tax_number: taxNumber.trim() || null,
    })
    if (!error) {
      // Best effort — pushes the updated company name / business number onto any
      // Square customer already on file, so it shows up on future invoices too.
      fetch('/api/billing/sync-company', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      }).catch(() => {})
    }
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
        <div>
          <label className={label}>Company Name <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
          <input className={inp} value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. York Dermatology Clinic" />
        </div>
        <div>
          <label className={label}>Business Number / HST# <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
          <input className={inp} value={taxNumber} onChange={e => setTaxNumber(e.target.value)} placeholder="e.g. 123456789 RT0001" />
          <p className="text-[11px] text-gray-400 mt-1">Included on your billing invoices, for your own accounting records.</p>
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

function AccountTypeSection({ user, profile, providers, updateProfile, router }) {
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [msg, setMsg] = useState('')
  const isProvider = profile.role === 'provider'
  const owned = providers.filter(p => p.owner_id === user.id)

  const switchToProvider = async () => {
    setBusy(true); setMsg('')
    const { error } = await updateProfile({ role: 'provider' })
    setBusy(false)
    if (error) { setMsg('Error: ' + error.message); return }
    router.push('/dashboard')
  }

  const switchToUser = async () => {
    setBusy(true); setMsg('')
    const res = await fetch('/api/account/downgrade-to-user', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id }),
    }).then(r => r.json()).catch(e => ({ error: e.message }))
    setBusy(false)
    setConfirming(false)
    if (res.error) { setMsg('Error: ' + res.error); return }
    router.push('/dashboard')
  }

  return (
    <div className={card + ' mt-4'}>
      <h2 className="text-sm font-bold text-gray-900 mb-1">Account Type</h2>
      {isProvider ? (
        <>
          <p className="text-xs text-gray-500 mb-4">
            You have a provider account{owned.length > 0 ? ` with ${owned.length} listing${owned.length === 1 ? '' : 's'}` : ''}. Switch to a plain user account if you no longer want to manage a listing.
          </p>
          <button onClick={() => setConfirming(true)} disabled={busy}
            className="px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl border border-gray-300 hover:bg-gray-200 transition disabled:opacity-50">
            Switch to user account
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-gray-500 mb-4">Want to list your practice on ReferEasy? Switch to a provider account to claim or create a listing.</p>
          <button onClick={switchToProvider} disabled={busy}
            className="px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition disabled:opacity-50">
            {busy ? 'Switching…' : 'Switch to provider account'}
          </button>
        </>
      )}
      {msg && <p className={`text-sm mt-3 ${msg.startsWith('Error') ? 'text-red-600' : 'text-emerald-600'}`}>{msg}</p>}
      <ConfirmModal
        open={confirming}
        title="Switch to a user account?"
        message={owned.length > 0
          ? `This will unclaim ${owned.length === 1 ? 'your listing' : 'your listings'}: ${owned.map(p => p.name).join(', ')}. ${owned.length === 1 ? 'It' : 'They'} will stay visible in the directory but no longer be managed by you — anyone, including you later, can claim ${owned.length === 1 ? 'it' : 'them'} again. Any active subscription will be canceled.`
          : "You'll lose access to provider features. You can switch back and create a listing anytime."}
        confirmLabel="Switch to user account"
        danger
        busy={busy}
        onConfirm={switchToUser}
        onCancel={() => setConfirming(false)}
      />
    </div>
  )
}

function PasswordSection({ updatePassword }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const save = async () => {
    setMsg('')
    if (!currentPassword) { setMsg('Error: Enter your current password'); return }
    if (!checkPassword(password).valid) { setMsg('Error: Password needs 8+ characters, a capital letter, a number, and a symbol.'); return }
    if (password !== confirm) { setMsg('Error: Passwords do not match'); return }
    setSaving(true)
    const { error } = await updatePassword(currentPassword, password)
    setSaving(false)
    if (error) { setMsg('Error: ' + error.message); return }
    setCurrentPassword(''); setPassword(''); setConfirm(''); setMsg('Password updated!')
  }

  return (
    <div className={card}>
      <h2 className="text-sm font-bold text-gray-900 mb-4">Change Password</h2>
      <div className="space-y-3 max-w-md">
        <div>
          <label className={label}>Current Password</label>
          <input className={inp} type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Enter your current password" />
        </div>
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
          <button onClick={save} disabled={saving || !password || !currentPassword} className="px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition disabled:opacity-50">
            {saving ? 'Updating…' : 'Update Password'}
          </button>
          {msg && <span className={`text-sm ${msg.startsWith('Error') ? 'text-red-600' : 'text-emerald-600'}`}>{msg}</span>}
        </div>
      </div>
    </div>
  )
}

const CARD_BRAND_LABEL = { VISA: 'Visa', MASTERCARD: 'Mastercard', AMERICAN_EXPRESS: 'Amex', DISCOVER: 'Discover', DISCOVER_DINERS: 'Diners', JCB: 'JCB', UNIONPAY: 'UnionPay', INTERAC: 'Interac' }
const SUB_STATUS_LABEL = { ACTIVE: 'Active', PENDING: 'Pending', CANCELED: 'Canceled', DEACTIVATED: 'Deactivated', PAUSED: 'Paused' }
const INVOICE_STATUS_STYLE = {
  PAID: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  UNPAID: 'text-amber-700 bg-amber-50 border-amber-200',
  FAILED: 'text-red-700 bg-red-50 border-red-200',
  SCHEDULED: 'text-gray-500 bg-gray-100 border-gray-200',
}

function BillingCard({ provider, user, onChanged }) {
  const router = useRouter()
  const status = getPlanStatus(provider)
  const canTrial = status.tier !== 'featured' && status.kind !== 'trial' && status.kind !== 'granted'
  const [billing, setBilling] = useState(null)
  const [loading, setLoading] = useState(true)
  const [startingTrial, setStartingTrial] = useState(false)
  const [showAddCard, setShowAddCard] = useState(false)
  const [showUpdateCard, setShowUpdateCard] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/billing/status?provider_id=${provider.id}&user_id=${user.id}`).then(r => r.json()).catch(e => ({ error: e.message }))
    setBilling(res.error ? null : res)
    setLoading(false)
  }, [provider.id, user.id])

  useEffect(() => { load() }, [load])

  // No card required — matches the promise on /pricing. A card only comes into play
  // later (below) to keep the plan once the trial ends.
  const startTrial = async () => {
    setStartingTrial(true); setMsg('')
    const plan = status.tier === 'listed' ? 'verified' : 'featured'
    const res = await fetch('/api/plan/start-trial', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider_id: provider.id, plan, user_id: user.id, user_email: user.email }),
    }).then(r => r.json()).catch(e => ({ error: e.message }))
    setStartingTrial(false)
    if (res.error) { setMsg('Error: ' + res.error); return }
    // The Verified/Featured plans promise a Verified badge — earning it (trial or
    // not) requires actually going through verification, not just picking the plan.
    if (!provider.verified) { router.push(`/dashboard/verify?provider_id=${provider.id}`); return }
    setMsg(`${plan === 'featured' ? 'Featured' : 'Verified'} activated — free for 60 days!`)
    onChanged()
    load()
  }

  const cancelSubscription = async () => {
    setBusy(true)
    const res = await fetch('/api/billing/cancel', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider_id: provider.id, user_id: user.id }),
    }).then(r => r.json()).catch(e => ({ error: e.message }))
    setBusy(false)
    setConfirmCancel(false)
    if (res.error) { setMsg('Error: ' + res.error); return }
    setMsg('Subscription canceled — stays active through the end of the current billing period.')
    load()
  }

  return (
    <div className={card}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-bold text-gray-900">{provider.name}</h2>
          <p className="text-xs text-gray-500 mt-0.5">Current plan: <span className="font-semibold text-gray-700">{status.label}</span></p>
        </div>
        <div className="flex gap-2">
          {canTrial && (
            <button onClick={startTrial} disabled={startingTrial}
              className="px-4 py-2 bg-brand text-white text-xs font-semibold rounded-lg hover:bg-brand-dark transition disabled:opacity-50">
              {startingTrial ? 'Activating…' : `Start free trial: ${status.tier === 'listed' ? 'Verified' : 'Featured'}`}
            </button>
          )}
          <Link href="/pricing" className="px-4 py-2 bg-white text-brand text-xs font-semibold rounded-lg border border-brand/20 hover:bg-brand/5 transition">See plans</Link>
        </div>
      </div>

      {status.tier !== 'listed' && !provider.verified && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-blue-800">Verification needed for your badge</p>
            <p className="text-xs text-blue-700 mt-0.5">{status.tier === 'featured' ? 'Featured' : 'Verified'} plans include the ✓ Verified badge, but it only shows once your listing is actually verified. This isn't optional — it's what makes the badge mean something.</p>
          </div>
          <Link href={`/dashboard/verify?provider_id=${provider.id}`} className="shrink-0 px-4 py-2 bg-brand text-white text-xs font-semibold rounded-lg hover:bg-brand-dark transition">Verify now</Link>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-gray-400 mt-4">Loading billing details…</p>
      ) : status.kind === 'trial' && !billing?.hasSubscription ? (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-amber-800">No payment method on file</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Your trial ends {provider.trial_ends_at ? new Date(provider.trial_ends_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : 'soon'} — add a card now to keep {status.tier === 'featured' ? 'Featured' : 'Verified'} without interruption. You won't be charged until then.
              </p>
            </div>
            <button onClick={() => setShowAddCard(true)} className="shrink-0 px-4 py-2 bg-brand text-white text-xs font-semibold rounded-lg hover:bg-brand-dark transition">Add payment method</button>
          </div>
        </div>
      ) : billing?.hasSubscription ? (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <div className={label}>Subscription</div>
              <div className="text-sm font-semibold text-gray-800">{SUB_STATUS_LABEL[billing.status] || billing.status}</div>
            </div>
            <div>
              <div className={label}>Next charge</div>
              <div className="text-sm font-semibold text-gray-800">
                {billing.nextChargeDate
                  ? new Date(billing.nextChargeDate + 'T00:00:00').toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
                  : provider.trial_ends_at
                    ? new Date(provider.trial_ends_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
                    : '—'}
              </div>
              {!billing.nextChargeDate && provider.trial_ends_at && <div className="text-[11px] text-gray-400">Estimated — trial end date</div>}
            </div>
            <div>
              <div className={label}>Card on file</div>
              <div className="text-sm font-semibold text-gray-800">
                {billing.card ? `${CARD_BRAND_LABEL[billing.card.brand] || billing.card.brand} •••• ${billing.card.last4}` : 'None'}
              </div>
              {billing.card && <div className="text-[11px] text-gray-400">Expires {String(billing.card.expMonth).padStart(2, '0')}/{billing.card.expYear}</div>}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setShowUpdateCard(true)} className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Update card</button>
            {(billing.status === 'ACTIVE' || billing.status === 'PENDING') && (
              <button onClick={() => setConfirmCancel(true)} className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition">Cancel subscription</button>
            )}
          </div>

        </div>
      ) : null}

      {msg && <p className={`text-sm mt-3 ${msg.startsWith('Error') ? 'text-red-600' : 'text-emerald-600'}`}>{msg}</p>}

      <SquareCheckoutModal
        open={showAddCard}
        plan={status.tier}
        providerId={provider.id}
        userId={user.id}
        defaultEmail={user.email}
        onClose={() => setShowAddCard(false)}
        onSuccess={() => { setShowAddCard(false); setMsg('Payment method added.'); onChanged(); load() }}
      />
      <SquareUpdateCardModal
        open={showUpdateCard}
        providerId={provider.id}
        userId={user.id}
        onClose={() => setShowUpdateCard(false)}
        onSuccess={() => { setShowUpdateCard(false); setMsg('Card updated.'); load() }}
      />
      <ConfirmModal
        open={confirmCancel}
        title="Cancel this subscription?"
        message="You'll keep your current plan features through the end of this billing period, then it drops to Listed (free). Your data is always preserved."
        confirmLabel="Cancel subscription"
        danger
        busy={busy}
        onConfirm={cancelSubscription}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  )
}

function BillingSection({ providers, setProviders, profile, user }) {
  const refreshProvider = async (providerId) => {
    if (!supabase) return
    const { data } = await supabase.from('providers').select('*').eq('id', providerId).single()
    if (data) setProviders(prev => prev.map(x => x.id === providerId ? data : x))
  }

  if (!providers.length) return (
    <div className={card}><h2 className="text-sm font-bold text-gray-900 mb-2">Billing</h2><p className="text-sm text-gray-500">Create a listing first to see plan and billing details.</p></div>
  )

  return (
    <div className="space-y-4">
      {providers.map(p => (
        <BillingCard key={p.id} provider={p} user={user} onChanged={() => refreshProvider(p.id)} />
      ))}
    </div>
  )
}

function PaymentHistorySection({ providers, user }) {
  const [rows, setRows] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all(providers.map(p =>
      fetch(`/api/billing/status?provider_id=${p.id}&user_id=${user.id}`).then(r => r.json()).catch(() => null)
    )).then(results => {
      if (cancelled) return
      const combined = []
      results.forEach((res, i) => {
        if (res?.hasSubscription) {
          for (const inv of res.invoices) combined.push({ ...inv, providerName: providers[i].name })
        }
      })
      combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setRows(combined)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [providers, user.id])

  if (!providers.length) return (
    <div className={card}><h2 className="text-sm font-bold text-gray-900 mb-2">Payment History</h2><p className="text-sm text-gray-500">Create a listing first to see billing history.</p></div>
  )

  const multi = providers.length > 1

  return (
    <div className={card}>
      <h2 className="text-sm font-bold text-gray-900 mb-1">Payment History</h2>
      <p className="text-xs text-gray-500 mb-4">Every invoice generated for your plan{multi ? 's' : ''}, most recent first.</p>
      {loading ? (
        <p className="text-xs text-gray-400">Loading payment history…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-gray-400">No invoices yet — your first one is generated when a trial ends or a plan renews.</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map(inv => (
            <div key={inv.id} className="flex items-center justify-between gap-3 text-xs bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-gray-700 font-medium truncate">{multi ? inv.providerName : new Date(inv.createdAt).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                {multi && <span className="text-gray-400">{new Date(inv.createdAt).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}</span>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-semibold text-gray-800">{inv.amount != null ? `$${inv.amount.toFixed(2)} ${inv.currency}` : '—'}</span>
                <span className={`px-2 py-0.5 rounded-full border font-semibold ${INVOICE_STATUS_STYLE[inv.status] || 'text-gray-500 bg-gray-100 border-gray-200'}`}>{inv.status}</span>
                {inv.publicUrl && <a href={inv.publicUrl} target="_blank" rel="noopener noreferrer" className="text-brand font-semibold hover:underline">View →</a>}
              </div>
            </div>
          ))}
        </div>
      )}
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
    const res = await fetch('/api/account/request-deletion', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id }),
    }).then(r => r.json()).catch(e => ({ error: e.message }))
    setBusy(false)
    setConfirming(false)
    if (!res.error) setRequested(true)
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

  // Lets email links (e.g. trial reminders) deep-link straight to a tab, like
  // /dashboard/settings?tab=billing — read directly from the URL rather than
  // useSearchParams so this client page doesn't need a Suspense boundary.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('tab')
    if (requested) setTab(requested)
  }, [])

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
    ...(isProvider ? [{ key: 'billing', label: 'Billing' }, { key: 'payment-history', label: 'Payment History' }, { key: 'staff', label: 'Staff & Team' }] : []),
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
            {tab === 'account' && (
              <>
                <AccountSection profile={profile} updateProfile={updateProfile} user={user} />
                <AccountTypeSection user={user} profile={profile} providers={providers} updateProfile={updateProfile} router={router} />
              </>
            )}
            {tab === 'password' && <PasswordSection updatePassword={updatePassword} />}
            {tab === 'billing' && isProvider && <BillingSection providers={providers} setProviders={setProviders} profile={profile} user={user} />}
            {tab === 'payment-history' && isProvider && <PaymentHistorySection providers={providers} user={user} />}
            {tab === 'staff' && isProvider && <StaffSection providers={providers} user={user} />}
            {tab === 'danger' && <DangerZone user={user} profile={profile} />}
          </div>
        </div>
      </div>
    </div>
  )
}
