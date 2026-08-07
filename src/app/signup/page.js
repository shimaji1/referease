'use client'
import { useState } from 'react'
import Logo from '@/components/Logo'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { checkPassword } from '@/lib/password'
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter'
import { trackSignup } from '@/lib/siteAnalytics'

export default function SignUpPage() {
  const { signUp } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [role, setRole] = useState('')
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '', cpso: '', clinic: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm({ ...form, [k]: v })

  const handleSubmit = async () => {
    setError('')
    if (!form.email || !form.password || !form.fullName) { setError('Please fill in all required fields'); return }
    if (!checkPassword(form.password).valid) { setError('Password needs 8+ characters, a capital letter, a number, and a symbol.'); return }
    setLoading(true)
    const { error: err } = await signUp(form.email, form.password, form.fullName, role, {
      phone: form.phone, cpso_number: form.cpso, clinic_name: form.clinic,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    trackSignup(role)
    router.push('/dashboard')
  }

  const roles = [
    { key: 'user', icon: '🔎', title: 'User', desc: 'Search providers, save favourites, build your own lists of doctors and clinics' },
    { key: 'provider', icon: '⚕️', title: 'Provider', desc: 'List your practice, manage availability, receive referrals — plan-based features, see pricing' },
  ]

  const inp = "w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-xl text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 placeholder:text-gray-400"

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="p-4">
        <Logo />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">

          {step === 1 && (
            <div className="animate-fade-in">
              <h1 className="text-2xl font-bold text-gray-900 text-center">Create your account</h1>
              <p className="text-sm text-gray-500 text-center mt-2 mb-8">Select your role to get started</p>
              <div className="space-y-3">
                {roles.map(r => (
                  <button key={r.key} onClick={() => { setRole(r.key); setStep(2) }}
                    className="w-full text-left bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-brand/50 hover:shadow-md transition group">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">{r.icon}</div>
                      <div>
                        <div className="font-semibold text-gray-900 group-hover:text-brand transition">{r.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{r.desc}</div>
                      </div>
                      <svg className="w-5 h-5 text-gray-300 group-hover:text-brand ml-auto shrink-0 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-center text-sm text-gray-500 mt-6">
                Already have an account? <Link href="/login" className="text-brand font-semibold hover:underline">Sign In</Link>
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <button onClick={() => setStep(1)} className="text-sm text-brand font-medium hover:underline">← Change role</button>
                <div className="inline-flex items-center gap-2 bg-brand/5 text-brand text-xs font-semibold px-3 py-1.5 rounded-full border border-brand/10">
                  {role === 'user' ? '🔎' : '⚕️'} {role === 'user' ? 'User Account' : 'Provider Account'}
                </div>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Your details</h1>
              <p className="text-sm text-gray-500 mt-1 mb-6">Fill in your information to create your account</p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Full Name *</label>
                  <input className={inp} placeholder="Dr. Jane Smith" value={form.fullName} onChange={e => set('fullName', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email *</label>
                  <input className={inp} type="email" placeholder="you@clinic.ca" value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Password *</label>
                  <input className={inp} type="password" placeholder="Create a password" value={form.password} onChange={e => set('password', e.target.value)} />
                  <PasswordStrengthMeter password={form.password} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Phone</label>
                  <input className={inp} placeholder="905-555-0123" value={form.phone} onChange={e => set('phone', e.target.value)} />
                </div>
                {role === 'provider' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Practice / Clinic Name</label>
                    <input className={inp} placeholder="e.g. York Dermatology Clinic" value={form.clinic} onChange={e => set('clinic', e.target.value)} />
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-red-600 mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

              <button onClick={handleSubmit} disabled={loading}
                className="w-full mt-5 py-3 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition disabled:opacity-50 text-sm">
                {loading ? 'Creating account...' : 'Create Account'}
              </button>

              <p className="text-center text-xs text-gray-400 mt-4">
                By creating an account you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
