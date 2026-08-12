'use client'
import { useState, useEffect, Suspense } from 'react'
import Logo from '@/components/Logo'
import { useAuth } from '@/context/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { checkPassword } from '@/lib/password'
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter'

async function lookupClaimInvite(token) {
  if (!token) return null
  const res = await fetch('/api/claim/accept', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'lookup', token }),
  }).then(r => r.json()).catch(() => ({ invite: null }))
  return res.invite
}

async function acceptClaimInvite(token, userId) {
  const res = await fetch('/api/claim/accept', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'accept', token, user_id: userId }),
  }).then(r => r.json()).catch(() => ({ ok: false }))
  return !!res.ok
}

function AcceptContent() {
  const { user, signUp, signIn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [invite, setInvite] = useState(undefined) // undefined = loading, null = not found
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('signup') // 'signup' | 'login'
  const [loginPassword, setLoginPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) { setInvite(null); return }
    lookupClaimInvite(token).then(setInvite)
  }, [token])

  const finish = async (userId) => {
    const ok = await acceptClaimInvite(token, userId)
    setLoading(false)
    if (!ok) { setError('Could not accept this invite — it may have already been used.'); return }
    setDone(true)
  }

  const handleSignup = async () => {
    setError('')
    if (!fullName.trim() || !password) { setError('Fill in your name and a password'); return }
    if (!checkPassword(password).valid) { setError('Password needs 8+ characters, a capital letter, a number, and a symbol.'); return }
    setLoading(true)
    const { data, error: err } = await signUp(invite.email, password, fullName.trim(), 'provider', {})
    if (err) { setLoading(false); setError(err.message); return }
    await finish(data.user.id)
  }

  const handleLogin = async () => {
    setError('')
    if (!loginPassword) { setError('Enter your password'); return }
    setLoading(true)
    const { data, error: err } = await signIn(invite.email, loginPassword)
    if (err) { setLoading(false); setError(err.message); return }
    await finish(data.user.id)
  }

  const handleAcceptAsCurrentUser = async () => {
    setLoading(true)
    await finish(user.id)
  }

  const inp = "w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-xl text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 placeholder:text-gray-400"

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="p-4"><Logo /></div>
      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">
          {invite === undefined && <p className="text-center text-sm text-gray-400">Loading invite…</p>}

          {invite === null && (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
              <div className="text-3xl mb-3">⚠️</div>
              <h1 className="text-lg font-bold text-gray-900 mb-2">Invite not found</h1>
              <p className="text-sm text-gray-500 mb-5">This invite link is invalid or has already been used. Ask whoever invited you to send a new one.</p>
              <Link href="/login" className="inline-flex px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition">Go to Sign In</Link>
            </div>
          )}

          {invite && done && (
            <div className="bg-white border-2 border-emerald-300 rounded-xl p-8 text-center">
              <div className="text-4xl mb-3">✅</div>
              <h1 className="text-lg font-bold text-gray-900 mb-2">You're all set</h1>
              <p className="text-sm text-gray-500 mb-4">You now own {invite.providers?.name}'s listing, verified and ready to manage.</p>
              <Link href="/dashboard" className="inline-flex px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition">Go to Dashboard</Link>
            </div>
          )}

          {invite && !done && (
            <div className="animate-fade-in">
              <h1 className="text-2xl font-bold text-gray-900">You're invited to claim this listing</h1>
              <p className="text-sm text-gray-500 mt-1 mb-6">You've been invited to take ownership of <strong>{invite.providers?.name}</strong>'s listing on ReferEasy — verified, no further steps needed.</p>

              {user ? (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <p className="text-sm text-gray-700 mb-4">Accept this invite as <strong>{user.email}</strong>?</p>
                  {error && <p className="text-sm text-red-600 mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
                  <button onClick={handleAcceptAsCurrentUser} disabled={loading} className="w-full py-3 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition disabled:opacity-50 text-sm">
                    {loading ? 'Accepting…' : 'Claim listing'}
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 mb-4 bg-gray-100 rounded-lg p-1">
                    <button onClick={() => setMode('signup')} className={`flex-1 py-2 text-xs font-semibold rounded-md transition ${mode === 'signup' ? 'bg-white text-brand shadow-sm' : 'text-gray-500'}`}>New account</button>
                    <button onClick={() => setMode('login')} className={`flex-1 py-2 text-xs font-semibold rounded-md transition ${mode === 'login' ? 'bg-white text-brand shadow-sm' : 'text-gray-500'}`}>I already have an account</button>
                  </div>

                  {mode === 'signup' ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Full Name *</label>
                        <input className={inp} placeholder="Jane Smith" value={fullName} onChange={e => setFullName(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                        <input className={inp + ' bg-gray-50 text-gray-500'} value={invite.email} disabled />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Password *</label>
                        <input className={inp} type="password" placeholder="Create a password" value={password} onChange={e => setPassword(e.target.value)} />
                        <PasswordStrengthMeter password={password} />
                      </div>
                      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
                      <button onClick={handleSignup} disabled={loading} className="w-full py-3 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition disabled:opacity-50 text-sm">
                        {loading ? 'Creating account…' : 'Create account & claim'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                        <input className={inp + ' bg-gray-50 text-gray-500'} value={invite.email} disabled />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Password *</label>
                        <input className={inp} type="password" placeholder="Your password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
                      </div>
                      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
                      <button onClick={handleLogin} disabled={loading} className="w-full py-3 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition disabled:opacity-50 text-sm">
                        {loading ? 'Signing in…' : 'Sign in & claim'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ClaimAcceptPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>}>
      <AcceptContent />
    </Suspense>
  )
}
