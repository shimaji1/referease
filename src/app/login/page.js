'use client'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const { signIn } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

  const inp = "w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-xl text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 placeholder:text-gray-400"

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="p-4">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center"><span className="text-white font-bold text-xs">R</span></div>
          <span className="text-lg font-bold text-gray-900">Refer<span className="text-brand">Easy</span></span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-sm animate-fade-in">
          <h1 className="text-2xl font-bold text-gray-900 text-center">Welcome back</h1>
          <p className="text-sm text-gray-500 text-center mt-2 mb-8">Sign in to your ReferEasy account</p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
              <input className={inp} type="email" placeholder="you@clinic.ca" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit(e)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Password</label>
              <input className={inp} type="password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit(e)} />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <button onClick={handleSubmit} disabled={loading}
            className="w-full mt-5 py-3 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition disabled:opacity-50 text-sm">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account? <Link href="/signup" className="text-brand font-semibold hover:underline">Sign Up Free</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
