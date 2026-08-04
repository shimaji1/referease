'use client'
import { FONT_OPTIONS, ALIGN_OPTIONS, IMAGE_SIZE_OPTIONS, FONT_SIZE_MIN, FONT_SIZE_MAX } from '@/lib/announcements'

const box = "border border-gray-200 rounded-lg p-3 space-y-2"
const title = "text-[11px] font-bold text-gray-700"
const fieldLabel = "text-[10px] text-gray-400 block mb-1"
const inp = "w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md outline-none focus:border-brand"

function AlignPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {ALIGN_OPTIONS.map(a => (
        <button key={a} type="button" onClick={() => onChange(a)}
          className={`flex-1 py-1.5 rounded-md border text-[11px] font-semibold capitalize transition ${value === a ? 'border-brand bg-brand/5 text-brand' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
          {a}
        </button>
      ))}
    </div>
  )
}

function ColorField({ label, value, onChange, fallback = '#ffffff' }) {
  return (
    <div>
      <label className={fieldLabel}>{label}</label>
      <div className="flex items-center gap-1.5">
        <input type="color" value={value || fallback} onChange={e => onChange(e.target.value)} className="h-7 w-9 rounded border border-gray-300 cursor-pointer shrink-0" />
        {value && <button type="button" onClick={() => onChange('')} className="text-[10px] text-gray-400 hover:text-gray-600">Reset</button>}
      </div>
    </div>
  )
}

function TextSection({ label, value, onChange }) {
  const set = (k, v) => onChange({ ...value, [k]: v })
  return (
    <div className={box}>
      <div className={title}>{label}</div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={fieldLabel}>Font size (px)</label>
          <input type="number" min={FONT_SIZE_MIN} max={FONT_SIZE_MAX} value={value.size}
            onChange={e => set('size', Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, Number(e.target.value) || FONT_SIZE_MIN)))}
            className={inp} />
        </div>
        <div>
          <label className={fieldLabel}>Font</label>
          <select value={value.font} onChange={e => set('font', e.target.value)} className={inp}>
            {FONT_OPTIONS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ColorField label="Color" value={value.color} onChange={v => set('color', v)} />
        <div>
          <label className={fieldLabel}>Align</label>
          <AlignPicker value={value.align} onChange={v => set('align', v)} />
        </div>
      </div>
    </div>
  )
}

// Full editor for every section of a slide: headline/subheading/paragraph text, the logo
// badge, the CTA button, and (when the template has a picture) the picture size.
export default function AnnouncementStyleEditor({ style, onChange, showImage }) {
  const setSection = (key, val) => onChange({ ...style, [key]: val })

  return (
    <div className="space-y-3">
      <TextSection label="Headline (H1)" value={style.headline} onChange={v => setSection('headline', v)} />
      <TextSection label="Subheading (H2)" value={style.subheadline} onChange={v => setSection('subheadline', v)} />
      <TextSection label="Paragraph" value={style.body} onChange={v => setSection('body', v)} />

      <div className={box}>
        <div className={title}>Logo</div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={fieldLabel}>Size (px)</label>
            <input type="number" min={16} max={160} value={style.logo.size}
              onChange={e => setSection('logo', { ...style.logo, size: Math.max(16, Math.min(160, Number(e.target.value) || 16)) })}
              className={inp} />
          </div>
          <div>
            <label className={fieldLabel}>Align</label>
            <AlignPicker value={style.logo.align} onChange={v => setSection('logo', { ...style.logo, align: v })} />
          </div>
        </div>
      </div>

      <div className={box}>
        <div className={title}>Button</div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={fieldLabel}>Size (px)</label>
            <input type="number" min={10} max={40} value={style.button.size}
              onChange={e => setSection('button', { ...style.button, size: Math.max(10, Math.min(40, Number(e.target.value) || 10)) })}
              className={inp} />
          </div>
          <div>
            <label className={fieldLabel}>Align</label>
            <AlignPicker value={style.button.align} onChange={v => setSection('button', { ...style.button, align: v })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ColorField label="Background" value={style.button.bg} onChange={v => setSection('button', { ...style.button, bg: v })} />
          <ColorField label="Text color" value={style.button.color} onChange={v => setSection('button', { ...style.button, color: v })} fallback="#1e3a5f" />
        </div>
      </div>

      {showImage && (
        <div className={box}>
          <div className={title}>Picture size</div>
          <div className="flex gap-1">
            {IMAGE_SIZE_OPTIONS.map(o => (
              <button key={o} type="button" onClick={() => setSection('image', { size: o })}
                className={`flex-1 py-1.5 rounded-md border text-[11px] font-semibold capitalize transition ${style.image.size === o ? 'border-brand bg-brand/5 text-brand' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                {o}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
