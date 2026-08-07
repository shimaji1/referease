'use client'
import { useState, useCallback, useRef } from 'react'
import { useEditor, EditorContent, Extension } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle, Color, FontFamily, FontSize } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import Placeholder from '@tiptap/extension-placeholder'
import { supabase } from '@/lib/supabase'

// ── Custom extension TipTap doesn't ship out of the box ────────────────────

const Indent = Extension.create({
  name: 'indent',
  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'heading'],
      attributes: {
        indent: {
          default: 0,
          parseHTML: el => Math.round((parseInt(el.style.marginLeft) || 0) / 24),
          renderHTML: attrs => attrs.indent ? { style: `margin-left: ${attrs.indent * 24}px` } : {},
        },
      },
    }]
  },
  addCommands() {
    const step = (dir) => () => ({ state, dispatch }) => {
      const { $from } = state.selection
      const node = $from.node()
      const pos = $from.before()
      const current = node.attrs.indent || 0
      const next = Math.max(0, Math.min(8, current + dir))
      if (next === current) return false
      if (dispatch) dispatch(state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next }))
      return true
    }
    return { indent: step(1), outdent: step(-1) }
  },
})

const FONT_FAMILIES = [
  { label: 'Default', value: '' },
  { label: 'Sans', value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" },
  { label: 'Serif', value: "Georgia, 'Times New Roman', serif" },
  { label: 'Monospace', value: "'Courier New', Courier, monospace" },
  { label: 'Elegant', value: "Palatino, 'Palatino Linotype', 'Book Antiqua', serif" },
]
const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '40px']
const HEADING_STYLES = [
  { label: 'Paragraph', level: 0 },
  { label: 'Heading 1', level: 1 },
  { label: 'Heading 2', level: 2 },
  { label: 'Heading 3', level: 3 },
  { label: 'Heading 4', level: 4 },
]

// ── Toolbar building blocks ────────────────────────────────────────────────

function TBtn({ onClick, active, disabled, title, children }) {
  return (
    <button type="button" onMouseDown={e => e.preventDefault()} onClick={onClick} disabled={disabled} title={title}
      className={`min-w-[30px] h-[30px] px-1.5 rounded-md text-[13px] font-semibold flex items-center justify-center transition ${active ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-100'} ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}>
      {children}
    </button>
  )
}

function Sep() {
  return <div className="w-px h-6 bg-gray-200 mx-1 self-center shrink-0" />
}

function ImageInsertModal({ open, onClose, onInsert }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [alt, setAlt] = useState('')
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')

  const pick = (f) => {
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const insert = async () => {
    if (!file) { setErr('Choose an image first'); return }
    if (!alt.trim()) { setErr('Alt text is required — every image needs one for SEO and accessibility'); return }
    if (!supabase) { setErr('Not connected'); return }
    setUploading(true)
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `blog/${Date.now()}-${safe}`
    const { error: upErr } = await supabase.storage.from('forms').upload(path, file)
    if (upErr) { setErr(upErr.message); setUploading(false); return }
    const { data: pub } = supabase.storage.from('forms').getPublicUrl(path)
    onInsert({ src: pub?.publicUrl || '', alt: alt.trim(), title: title.trim() || undefined })
    setUploading(false)
    setFile(null); setPreview(''); setAlt(''); setTitle(''); setErr('')
    onClose()
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onMouseDown={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6" onMouseDown={e => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-gray-900 mb-1">Insert picture</h3>
        <p className="text-xs text-gray-500 mb-4">Every image needs alt text — it's how search engines and screen readers understand what's in the picture.</p>

        <label className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 border border-gray-300 cursor-pointer hover:bg-gray-200 transition mb-3">
          {file ? 'Change image' : '📎 Choose image'}
          <input type="file" accept=".png,.jpg,.jpeg,.webp,.gif" onChange={e => pick(e.target.files?.[0])} className="hidden" />
        </label>
        {preview && <img src={preview} alt="" className="w-full h-32 object-cover rounded-lg border border-gray-200 mb-3" />}

        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Alt text *</label>
        <input value={alt} onChange={e => setAlt(e.target.value)} placeholder="Describe what's in the image, for SEO and accessibility"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand mb-3" />

        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Caption / title (optional)</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Shown as a tooltip on hover"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand mb-3" />

        {err && <p className="text-xs text-red-600 mb-3">{err}</p>}

        <div className="flex gap-2 justify-end mt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancel</button>
          <button onClick={insert} disabled={uploading} className="px-4 py-2 text-sm font-semibold text-white bg-brand rounded-lg hover:bg-brand-dark transition disabled:opacity-50">
            {uploading ? 'Uploading…' : 'Insert'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TableGridPicker({ open, onClose, onPick }) {
  const [hover, setHover] = useState({ r: 0, c: 0 })
  if (!open) return null
  const ROWS = 6, COLS = 6
  return (
    <div className="absolute z-30 top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-3" onMouseLeave={() => setHover({ r: 0, c: 0 })}>
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${COLS}, 18px)` }}>
        {Array.from({ length: ROWS * COLS }).map((_, i) => {
          const r = Math.floor(i / COLS), c = i % COLS
          const on = r <= hover.r && c <= hover.c
          return (
            <div key={i} onMouseEnter={() => setHover({ r, c })} onClick={() => { onPick(hover.r + 1, hover.c + 1); onClose() }}
              className={`w-[18px] h-[18px] border ${on ? 'bg-brand/20 border-brand' : 'bg-gray-50 border-gray-200'} cursor-pointer`} />
          )
        })}
      </div>
      <div className="text-[11px] text-gray-500 mt-2 text-center">{hover.r + 1} × {hover.c + 1}</div>
    </div>
  )
}

// ── Main editor ─────────────────────────────────────────────────────────

export default function RichTextEditor({ value, onChange, placeholder }) {
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [tablePickerOpen, setTablePickerOpen] = useState(false)
  const [htmlMode, setHtmlMode] = useState(false)
  const [htmlDraft, setHtmlDraft] = useState('')
  const linkInputRef = useRef(null)
  const [linkPromptOpen, setLinkPromptOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Indent,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ inline: false, HTMLAttributes: { class: 'rounded-lg' } }),
      Link.configure({ openOnClick: false, autolink: true }),
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      Placeholder.configure({ placeholder: placeholder || 'Start writing…' }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] px-4 py-3' },
    },
  })

  const toggleHtmlMode = useCallback(() => {
    if (!editor) return
    if (!htmlMode) {
      setHtmlDraft(editor.getHTML())
      setHtmlMode(true)
    } else {
      editor.commands.setContent(htmlDraft)
      onChange(editor.getHTML())
      setHtmlMode(false)
    }
  }, [editor, htmlMode, htmlDraft, onChange])

  if (!editor) return <div className="border border-gray-300 rounded-xl min-h-[400px] bg-gray-50 animate-pulse" />

  const headingLevel = [1, 2, 3, 4].find(l => editor.isActive('heading', { level: l })) || 0

  const setStyle = (level) => {
    if (level === 0) editor.chain().focus().setParagraph().run()
    else editor.chain().focus().toggleHeading({ level }).run()
  }

  const applyLink = () => {
    if (!linkUrl.trim()) { editor.chain().focus().unsetLink().run() }
    else editor.chain().focus().setLink({ href: linkUrl.trim() }).run()
    setLinkPromptOpen(false)
    setLinkUrl('')
  }

  const insideTable = editor.isActive('table')

  return (
    <div className="border border-gray-300 rounded-xl overflow-hidden bg-white">
      {!htmlMode && (
        <div className="border-b border-gray-200 bg-gray-50 px-2 py-1.5 flex flex-wrap items-center gap-0.5">
          <TBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">↶</TBtn>
          <TBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">↷</TBtn>
          <Sep />
          <select value={headingLevel} onChange={e => setStyle(Number(e.target.value))}
            className="h-[30px] text-xs border border-gray-200 rounded-md px-1.5 bg-white text-gray-700 outline-none">
            {HEADING_STYLES.map(h => <option key={h.level} value={h.level}>{h.label}</option>)}
          </select>
          <select onChange={e => e.target.value ? editor.chain().focus().setFontFamily(e.target.value).run() : editor.chain().focus().unsetFontFamily().run()}
            className="h-[30px] text-xs border border-gray-200 rounded-md px-1.5 bg-white text-gray-700 outline-none" defaultValue="">
            {FONT_FAMILIES.map(f => <option key={f.label} value={f.value}>{f.label}</option>)}
          </select>
          <select onChange={e => e.target.value ? editor.chain().focus().setFontSize(e.target.value).run() : editor.chain().focus().unsetFontSize().run()}
            className="h-[30px] text-xs border border-gray-200 rounded-md px-1.5 bg-white text-gray-700 outline-none" defaultValue="">
            <option value="">Size</option>
            {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <Sep />
          <TBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><b>B</b></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><i>I</i></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><u>U</u></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough"><s>S</s></TBtn>
          <label className="relative w-[26px] h-[26px] rounded-md overflow-hidden border border-gray-200 cursor-pointer" title="Text color">
            <input type="color" onChange={e => editor.chain().focus().setColor(e.target.value).run()} className="absolute -top-1 -left-1 w-8 h-8 cursor-pointer" />
          </label>
          <label className="relative w-[26px] h-[26px] rounded-md overflow-hidden border border-gray-200 cursor-pointer bg-yellow-100" title="Highlight">
            <input type="color" defaultValue="#fef08a" onChange={e => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()} className="absolute -top-1 -left-1 w-8 h-8 cursor-pointer opacity-0" />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-bold text-yellow-700">H</span>
          </label>
          <Sep />
          <TBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left">⯇</TBtn>
          <TBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align center">≡</TBtn>
          <TBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right">⯈</TBtn>
          <TBtn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justify">☰</TBtn>
          <TBtn onClick={() => editor.chain().focus().outdent().run()} title="Decrease indent">⇤</TBtn>
          <TBtn onClick={() => editor.chain().focus().indent().run()} title="Increase indent">⇥</TBtn>
          <Sep />
          <TBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">•≡</TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">1≡</TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">"</TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code block">{'</>'}</TBtn>
          <Sep />
          <TBtn onClick={() => { setLinkUrl(editor.getAttributes('link').href || ''); setLinkPromptOpen(v => !v) }} active={editor.isActive('link')} title="Link">🔗</TBtn>
          <TBtn onClick={() => setImageModalOpen(true)} title="Insert picture">🖼️</TBtn>
          <div className="relative">
            <TBtn onClick={() => setTablePickerOpen(v => !v)} title="Insert table">▦</TBtn>
            <TableGridPicker open={tablePickerOpen} onClose={() => setTablePickerOpen(false)}
              onPick={(rows, cols) => editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()} />
          </div>
          <TBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal line">―</TBtn>
          {insideTable && (
            <>
              <Sep />
              <TBtn onClick={() => editor.chain().focus().addColumnAfter().run()} title="Add column">+col</TBtn>
              <TBtn onClick={() => editor.chain().focus().addRowAfter().run()} title="Add row">+row</TBtn>
              <TBtn onClick={() => editor.chain().focus().deleteColumn().run()} title="Delete column">−col</TBtn>
              <TBtn onClick={() => editor.chain().focus().deleteRow().run()} title="Delete row">−row</TBtn>
              <TBtn onClick={() => editor.chain().focus().deleteTable().run()} title="Delete table">✕table</TBtn>
            </>
          )}
          <div className="ml-auto">
            <TBtn onClick={toggleHtmlMode} title="Edit raw HTML">{'HTML'}</TBtn>
          </div>
        </div>
      )}

      {linkPromptOpen && !htmlMode && (
        <div className="border-b border-gray-200 bg-white px-3 py-2 flex items-center gap-2">
          <input ref={linkInputRef} autoFocus value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://…"
            onKeyDown={e => e.key === 'Enter' && applyLink()}
            className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:border-brand" />
          <button onClick={applyLink} className="text-xs font-semibold text-white bg-brand px-3 py-1.5 rounded-lg">Apply</button>
          <button onClick={() => setLinkPromptOpen(false)} className="text-xs font-semibold text-gray-500 px-2">Cancel</button>
        </div>
      )}

      {htmlMode ? (
        <div>
          <textarea value={htmlDraft} onChange={e => setHtmlDraft(e.target.value)}
            className="w-full min-h-[400px] p-4 text-xs font-mono text-gray-800 outline-none resize-y"
            placeholder="Paste or write raw HTML here…" />
          <div className="border-t border-gray-200 bg-gray-50 px-3 py-2 flex justify-end">
            <button onClick={toggleHtmlMode} className="text-xs font-semibold text-white bg-brand px-3 py-1.5 rounded-lg">Apply HTML & return to editor</button>
          </div>
        </div>
      ) : (
        <EditorContent editor={editor} />
      )}

      <ImageInsertModal open={imageModalOpen} onClose={() => setImageModalOpen(false)}
        onInsert={({ src, alt, title }) => editor.chain().focus().setImage({ src, alt, title }).run()} />
    </div>
  )
}
