'use client'

// Centered confirm dialog matching site design — replaces native window.confirm(),
// which renders as a browser-chrome popup pinned to the top of the viewport.
export default function ConfirmModal({ open, title = 'Are you sure?', message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, busy = false, onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-gray-900 mb-1.5">{title}</h3>
        {message && <p className="text-sm text-gray-500 mb-5 leading-relaxed">{message}</p>}
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} disabled={busy}
            className={`flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition disabled:opacity-50 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-brand hover:bg-brand-dark'}`}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
