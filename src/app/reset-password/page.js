'use client'
import { useState, useEffect } from 'react'
import Logo from '@/components/Logo'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { checkPassword } from '@/lib/password'
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter'

// Landed on from the emailed reset link — Supabase logs the browser into a temporary
// recovery session automatically (picked up by AuthContext), so by the time `user` is
// set here, we're already authorized to set a new password.
export default function ResetPasswordPage() {
  const { user, loading, confirmPasswordReset } = useAuth()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (done) { const t = setTimeout(() => router.push('/dashboard'), 2000); return () => clearTimeout(t) }
  }, [done, router])

  const handleSubmit = async () => {
    setError('')
    if (!checkPassword(password).valid) { setError('Password needs 8+ characters, a capital letter, a number, and a symbol.'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setSaving(true)
    const { error: err } = await confirmPasswordReset(password)
    setSaving(false)
    if (err) { setError(err.message); return }
    setDone(true)
  }

  const inp = "w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-xl text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 placeholder:text-gray-400"

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="p-4"><Logo /></div>
      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-sm animate-fade-in">
          {loading ? (
            <p className="text-center text-sm text-gray-400">Loading…</p>
          ) : !user ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
              <div className="text-3xl mb-3">⚠️</div>
              <h1 className="text-lg font-bold text-gray-900 mb-2">Reset link invalid or expired</h1>
              <p className="text-sm text-gray-500 mb-5">Request a new one from the sign-in page.</p>
              <Link href="/login" className="inline-flex px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition">Go to Sign In</Link>
            </div>
          ) : done ? (
            <div className="bg-white border-2 border-emerald-300 rounded-xl p-8 text-center">
              <div className="text-4xl mb-3">✅</div>
              <h1 className="text-lg font-bold text-gray-900 mb-2">Password updated</h1>
              <p className="text-sm text-gray-500">Taking you to your dashboard…</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 text-center">Set a new password</h1>
              <p className="text-sm text-gray-500 text-center mt-2 mb-8">for {user.email}</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">New Password</label>
                  <input className={inp} type="password" placeholder="Create a new password" value={password} onChange={e => setPassword(e.target.value)} />
                  <PasswordStrengthMeter password={password} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Confirm New Password</label>
                  <input className={inp} type="password" placeholder="Re-enter password" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
                </div>
              </div>
              {error && <p className="text-sm text-red-600 mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              <button onClick={handleSubmit} disabled={saving}
                className="w-full mt-5 py-3 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition disabled:opacity-50 text-sm">
                {saving ? 'Updating…' : 'Update Password'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
