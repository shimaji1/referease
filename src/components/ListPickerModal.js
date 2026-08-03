'use client'
import { useState } from 'react'
import { createList, addToList } from '@/lib/favourites'

// "Save to a list" picker — shown when a signed-in user with 1+ existing
// lists clicks a favourite star. (Users with zero lists skip this entirely;
// the item goes straight into an auto-created default list.)
export default function ListPickerModal({ userId, lists, providerId, providerName, onClose, onSaved }) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)

  const pick = async (listId) => {
    setBusy(true)
    const ok = await addToList(userId, providerId, listId)
    setBusy(false)
    if (ok) onSaved(listId)
  }

  const createAndPick = async () => {
    if (!newName.trim()) return
    setBusy(true)
    const list = await createList(userId, newName.trim())
    if (list) {
      const ok = await addToList(userId, providerId, list.id)
      if (ok) { onSaved(list.id, list); return }
    }
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-gray-900 mb-1">Save to a list</h3>
        {providerName && <p className="text-xs text-gray-500 mb-4 truncate">{providerName}</p>}

        <div className="space-y-1.5 max-h-60 overflow-y-auto mb-3">
          {lists.map(l => (
            <button key={l.id} disabled={busy} onClick={() => pick(l.id)} className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-200 hover:border-brand hover:bg-brand/5 transition text-sm font-medium text-gray-800 flex items-center justify-between disabled:opacity-50">
              {l.name}
              <span className="text-gray-300">→</span>
            </button>
          ))}
        </div>

        {creating ? (
          <div className="flex gap-2">
            <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createAndPick()} placeholder="New list name" className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand" />
            <button onClick={createAndPick} disabled={busy || !newName.trim()} className="px-3 py-2 bg-brand text-white text-sm font-semibold rounded-lg disabled:opacity-50">Add</button>
          </div>
        ) : (
          <button onClick={() => setCreating(true)} className="text-xs font-semibold text-brand hover:underline">+ Create new list</button>
        )}

        <button onClick={onClose} className="block w-full text-center text-xs text-gray-400 mt-4 hover:text-gray-600">Cancel</button>
      </div>
    </div>
  )
}
