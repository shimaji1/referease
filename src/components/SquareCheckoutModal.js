'use client'
import { useEffect, useRef, useState } from 'react'

const APP_ID = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID
const LOCATION_ID = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID
const IS_SANDBOX = APP_ID?.startsWith('sandbox-')
const SDK_URL = IS_SANDBOX ? 'https://sandbox.web.squarecdn.com/v1/square.js' : 'https://web.squarecdn.com/v1/square.js'

function loadSquareSdk() {
  if (window.Square) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SDK_URL
    script.onload = resolve
    script.onerror = () => reject(new Error('Could not load Square payment form'))
    document.head.appendChild(script)
  })
}

const PLAN_LABELS = { verified: { name: 'Verified', price: '$29/month' }, featured: { name: 'Featured', price: '$79/month' } }

export default function SquareCheckoutModal({ open, plan, providerId, userId, defaultName, defaultEmail, onClose, onSuccess }) {
  const cardContainerRef = useRef(null)
  const cardRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [givenName, setGivenName] = useState(defaultName?.split(' ')[0] || '')
  const [familyName, setFamilyName] = useState(defaultName?.split(' ').slice(1).join(' ') || '')
  const [email, setEmail] = useState(defaultEmail || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setReady(false)
    setError('')
    loadSquareSdk().then(async () => {
      if (cancelled || !APP_ID || !LOCATION_ID) return
      const payments = window.Square.payments(APP_ID, LOCATION_ID)
      const card = await payments.card()
      await card.attach(cardContainerRef.current)
      cardRef.current = card
      setReady(true)
    }).catch(e => setError(e.message))
    return () => {
      cancelled = true
      cardRef.current?.destroy?.()
      cardRef.current = null
    }
  }, [open])

  if (!open) return null
  const info = PLAN_LABELS[plan] || { name: plan, price: '' }

  const submit = async () => {
    setError('')
    if (!givenName.trim() || !email.trim()) { setError('Name and email are required'); return }
    if (!cardRef.current) { setError('Payment form not ready yet'); return }
    setBusy(true)
    try {
      const result = await cardRef.current.tokenize()
      if (result.status !== 'OK') {
        setError(result.errors?.[0]?.message || 'Card details are invalid')
        setBusy(false)
        return
      }
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: providerId, source_id: result.token, given_name: givenName.trim(), family_name: familyName.trim(), email: email.trim(), user_id: userId }),
      }).then(r => r.json())
      setBusy(false)
      if (res.error) { setError(res.error); return }
      onSuccess()
    } catch (e) {
      setBusy(false)
      setError(e.message)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onMouseDown={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6" onMouseDown={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Add a payment method</h3>
        <p className="text-sm text-gray-500 mb-5">Keeps your {info.name} plan ({info.price}) active when your trial ends — you won't be charged before then, and you can cancel anytime from your dashboard.</p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">First name</label>
            <input value={givenName} onChange={e => setGivenName(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Last name</label>
            <input value={familyName} onChange={e => setFamilyName(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand" />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand" />
        </div>

        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Card</label>
        <div ref={cardContainerRef} className="min-h-[56px] border border-gray-300 rounded-lg px-3 py-2 mb-2" />
        {!ready && !error && <p className="text-xs text-gray-400 mb-2">Loading secure payment form…</p>}
        {IS_SANDBOX && <p className="text-[11px] text-amber-600 mb-2">Sandbox mode — use test card 4111 1111 1111 1111, any future expiry, any CVV.</p>}

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</p>}

        <div className="flex gap-2 justify-end mt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancel</button>
          <button onClick={submit} disabled={!ready || busy} className="px-5 py-2 text-sm font-semibold text-white bg-brand rounded-lg hover:bg-brand-dark transition disabled:opacity-50">
            {busy ? 'Saving…' : 'Save card'}
          </button>
        </div>
        <p className="text-[11px] text-gray-400 text-center mt-3">Your card won't be charged until the trial ends. Cancel anytime from your dashboard.</p>
      </div>
    </div>
  )
}
