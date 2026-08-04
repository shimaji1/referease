'use client'

// Centered message/error dialog matching site design — replaces native alert(),
// which renders as a browser-chrome popup pinned to the top of the viewport.
export default function AlertModal({ open, title, message, variant = 'error', onClose }) {
  if (!open) return null
  const isError = variant === 'error'
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isError ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>{isError ? '!' : 'ℹ'}</span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-900">{title || (isError ? 'Something went wrong' : 'Heads up')}</h3>
            {message && <p className="text-sm text-gray-500 mt-1 leading-relaxed">{message}</p>}
          </div>
        </div>
        <button onClick={onClose} className="w-full py-2.5 text-sm font-semibold text-white bg-brand rounded-xl hover:bg-brand-dark transition">
          Got it
        </button>
      </div>
    </div>
  )
}
