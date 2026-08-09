'use client'
import { useState } from 'react'
import Logo from '@/components/Logo'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const { signIn, requestPasswordReset } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [resetSending, setResetSending] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Please fill in all fields'); return }
    setLoading(true)
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) { setError(err.message); return }
    router.push('/dashboard')
  }

  const handleResetRequest = async () => {
    setError('')
    if (!email) { setError('Enter your email above first'); return }
    setResetSending(true)
    const { error: err } = await requestPasswordReset(email)
    setResetSending(false)
    if (err) { setError(err.message); return }
    setResetSent(true)
  }

  const inp = "w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-xl text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 placeholder:text-gray-400"

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="p-4">
        <Logo />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-sm animate-fade-in">
          <h1 className="text-2xl font-bold text-gray-900 text-center">Welcome back</h1>
          <p className="text-sm text-gray-500 text-center mt-2 mb-8">Sign in to your ReferEasy account</p>

          {resetSent ? (
            <div className="bg-white border-2 border-emerald-300 rounded-xl p-6 text-center">
              <div className="text-3xl mb-2">📧</div>
              <p className="text-sm text-gray-700">Check <strong>{email}</strong> for a reset link.</p>
              <button onClick={() => { setResetSent(false); setForgotMode(false) }} className="text-sm text-brand font-semibold hover:underline mt-4">Back to sign in</button>
            </div>
          ) : forgotMode ? (
            <>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                  <input className={inp} type="email" placeholder="you@clinic.ca" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleResetRequest()} />
                </div>
              </div>
              {error && <p className="text-sm text-red-600 mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              <button onClick={handleResetRequest} disabled={resetSending}
                className="w-full mt-5 py-3 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition disabled:opacity-50 text-sm">
                {resetSending ? 'Sending…' : 'Send reset link'}
              </button>
              <button onClick={() => { setForgotMode(false); setError('') }} className="w-full text-center text-sm text-gray-500 hover:text-gray-700 mt-3">Back to sign in</button>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                  <input className={inp} type="email" placeholder="you@clinic.ca" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit(e)} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Password</label>
                    <button type="button" onClick={() => { setForgotMode(true); setError('') }} className="text-xs font-semibold text-brand hover:underline">Forgot password?</button>
                  </div>
                  <input className={inp} type="password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit(e)} />
                </div>
              </div>

              {error && <p className="text-sm text-red-600 mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

              <button onClick={handleSubmit} disabled={loading}
                className="w-full mt-5 py-3 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition disabled:opacity-50 text-sm">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account? <Link href="/signup" className="text-brand font-semibold hover:underline">Sign Up Free</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
