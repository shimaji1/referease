'use client'
import { useEffect, useRef, useState } from 'react'

const APP_ID = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID
const LOCATION_ID = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID
const SDK_URL = APP_ID?.startsWith('sandbox-') ? 'https://sandbox.web.squarecdn.com/v1/square.js' : 'https://web.squarecdn.com/v1/square.js'

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

export default function SquareUpdateCardModal({ open, providerId, userId, onClose, onSuccess }) {
  const cardContainerRef = useRef(null)
  const cardRef = useRef(null)
  const [ready, setReady] = useState(false)
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

  const submit = async () => {
    setError('')
    if (!cardRef.current) return
    setBusy(true)
    try {
      const result = await cardRef.current.tokenize()
      if (result.status !== 'OK') {
        setError(result.errors?.[0]?.message || 'Card details are invalid')
        setBusy(false)
        return
      }
      const res = await fetch('/api/billing/update-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: providerId, source_id: result.token, user_id: userId }),
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
        <h3 className="text-lg font-bold text-gray-900 mb-4">Update payment method</h3>
        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">New card</label>
        <div ref={cardContainerRef} className="min-h-[56px] border border-gray-300 rounded-lg px-3 py-2 mb-2" />
        {!ready && !error && <p className="text-xs text-gray-400 mb-2">Loading secure payment form…</p>}
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</p>}
        <div className="flex gap-2 justify-end mt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancel</button>
          <button onClick={submit} disabled={!ready || busy} className="px-5 py-2 text-sm font-semibold text-white bg-brand rounded-lg hover:bg-brand-dark transition disabled:opacity-50">
            {busy ? 'Saving…' : 'Save card'}
          </button>
        </div>
      </div>
    </div>
  )
}
