'use client'
import { FONT_OPTIONS, ALIGN_OPTIONS, VALIGN_OPTIONS, IMAGE_SIZE_OPTIONS, FONT_SIZE_MIN, FONT_SIZE_MAX } from '@/lib/announcements'

// A single top toolbar, contextual to whichever element is selected on the preview —
// click an element below to see its controls here, Word/Photoshop-style, instead of one
// giant always-expanded form for every section at once.

const btnBase = "h-8 px-2.5 rounded-md border text-xs font-semibold transition flex items-center justify-center gap-1"
const btnOff = "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
const btnOn = "border-brand bg-brand/10 text-brand"

function Group({ label, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 px-0.5">{label}</span>}
      <div className="flex items-center gap-1">{children}</div>
    </div>
  )
}

function Sep() {
  return <div className="w-px self-stretch bg-gray-200 mx-1" />
}

function Pills({ options, value, onChange }) {
  return (
    <div className="flex gap-0.5">
      {options.map(o => (
        <button key={o} type="button" onClick={() => onChange(o)} title={o}
          className={`${btnBase} px-2 capitalize ${value === o ? btnOn : btnOff}`}>{o}</button>
      ))}
    </div>
  )
}

function NumberStepper({ value, onChange, min, max, step = 1, width = 'w-12' }) {
  const clamp = (v) => Math.max(min ?? -Infinity, Math.min(max ?? Infinity, v))
  return (
    <div className="flex items-center h-8 border border-gray-200 rounded-md overflow-hidden">
      <button type="button" onClick={() => onChange(clamp(value - step))} className="h-full w-6 flex items-center justify-center text-gray-500 hover:bg-gray-100 shrink-0">−</button>
      <input type="number" value={value} onChange={e => onChange(clamp(Number(e.target.value) || 0))}
        className={`${width} h-full text-center text-xs outline-none border-x border-gray-200`} />
      <button type="button" onClick={() => onChange(clamp(value + step))} className="h-full w-6 flex items-center justify-center text-gray-500 hover:bg-gray-100 shrink-0">+</button>
    </div>
  )
}

function ColorSwatch({ value, onChange, fallback = '#ffffff', title }) {
  return (
    <div className="flex items-center gap-1 h-8" title={title}>
      <input type="color" value={value || fallback} onChange={e => onChange(e.target.value)} className="h-8 w-8 rounded-md border border-gray-200 cursor-pointer" />
      {value && <button type="button" onClick={() => onChange('')} className="text-[10px] text-gray-400 hover:text-gray-600">Reset</button>}
    </div>
  )
}

// X/Y nudge — the "adjust by 1 point" precision positioning control. Offset is a pixel
// nudge on top of the element's normal flow position, applied everywhere it renders
// (editor preview and the live carousel both go through the same renderer).
function PositionNudge({ x, y, onChange }) {
  return (
    <Group label="Position (x / y)">
      <NumberStepper value={x} onChange={v => onChange({ x: v, y })} min={-200} max={200} />
      <NumberStepper value={y} onChange={v => onChange({ x, y: v })} min={-200} max={200} />
      {(x !== 0 || y !== 0) && <button type="button" onClick={() => onChange({ x: 0, y: 0 })} className="text-[10px] text-gray-400 hover:text-gray-600 ml-1">Reset</button>}
    </Group>
  )
}

const TEXT_KEYS = ['headline', 'subheadline', 'body']
const LABELS = { headline: 'Headline', subheadline: 'Subheading', body: 'Paragraph', logo: 'Logo', button: 'Button', image: 'Picture' }

export default function AnnouncementToolbar({ style, onChange, selected, showImage }) {
  const setSection = (key, patch) => onChange({ ...style, [key]: { ...style[key], ...patch } })

  return (
    <div className="border border-gray-200 rounded-xl bg-gray-50 p-2.5 flex flex-wrap items-end gap-3">
      {!selected && (
        <p className="text-xs text-gray-400 py-1.5 px-1">Click an element in the preview below to style it — headline, subheading, paragraph, logo, button{showImage ? ', or picture' : ''}.</p>
      )}

      {selected && TEXT_KEYS.includes(selected) && (
        <>
          <Group label={LABELS[selected]}>
            <span className="h-8 flex items-center text-xs font-semibold text-gray-700 px-1">{LABELS[selected]}</span>
          </Group>
          <Sep />
          <Group label="Font">
            <select value={style[selected].font} onChange={e => setSection(selected, { font: e.target.value })} className="h-8 text-xs border border-gray-200 rounded-md px-1.5 bg-white text-gray-700 outline-none">
              {FONT_OPTIONS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </Group>
          <Group label="Size (px)">
            <NumberStepper value={style[selected].size} onChange={v => setSection(selected, { size: v })} min={FONT_SIZE_MIN} max={FONT_SIZE_MAX} />
          </Group>
          <Group label="Style">
            <button type="button" onClick={() => setSection(selected, { bold: !style[selected].bold })} className={`${btnBase} w-8 font-bold ${style[selected].bold ? btnOn : btnOff}`}>B</button>
            <button type="button" onClick={() => setSection(selected, { italic: !style[selected].italic })} className={`${btnBase} w-8 italic ${style[selected].italic ? btnOn : btnOff}`}>I</button>
            <button type="button" onClick={() => setSection(selected, { underline: !style[selected].underline })} className={`${btnBase} w-8 underline ${style[selected].underline ? btnOn : btnOff}`}>U</button>
          </Group>
          <Group label="Align">
            <Pills options={ALIGN_OPTIONS} value={style[selected].align} onChange={v => setSection(selected, { align: v })} />
          </Group>
          <Group label="Color">
            <ColorSwatch value={style[selected].color} onChange={v => setSection(selected, { color: v })} />
          </Group>
          <Sep />
          <PositionNudge x={style[selected].x} y={style[selected].y} onChange={p => setSection(selected, p)} />
        </>
      )}

      {selected === 'logo' && (
        <>
          <Group label="Logo">
            <span className="h-8 flex items-center text-xs font-semibold text-gray-700 px-1">Logo</span>
          </Group>
          <Sep />
          <Group label="Size (px)">
            <NumberStepper value={style.logo.size} onChange={v => setSection('logo', { size: v })} min={16} max={160} />
          </Group>
          <Group label="Corner">
            <Pills options={ALIGN_OPTIONS} value={style.logo.align} onChange={v => setSection('logo', { align: v })} />
          </Group>
          <Sep />
          <PositionNudge x={style.logo.x} y={style.logo.y} onChange={p => setSection('logo', p)} />
        </>
      )}

      {selected === 'button' && (
        <>
          <Group label="Button">
            <span className="h-8 flex items-center text-xs font-semibold text-gray-700 px-1">Button</span>
          </Group>
          <Sep />
          <Group label="Size (px)">
            <NumberStepper value={style.button.size} onChange={v => setSection('button', { size: v })} min={10} max={40} />
          </Group>
          <Group label="Align">
            <Pills options={ALIGN_OPTIONS} value={style.button.align} onChange={v => setSection('button', { align: v })} />
          </Group>
          <Group label="Background">
            <ColorSwatch value={style.button.bg} onChange={v => setSection('button', { bg: v })} />
          </Group>
          <Group label="Text color">
            <ColorSwatch value={style.button.color} onChange={v => setSection('button', { color: v })} fallback="#1e3a5f" />
          </Group>
          <Sep />
          <PositionNudge x={style.button.x} y={style.button.y} onChange={p => setSection('button', p)} />
        </>
      )}

      {selected === 'image' && showImage && (
        <>
          <Group label="Picture">
            <span className="h-8 flex items-center text-xs font-semibold text-gray-700 px-1">Picture size</span>
          </Group>
          <Sep />
          <Pills options={IMAGE_SIZE_OPTIONS} value={style.image.size} onChange={v => setSection('image', { size: v })} />
        </>
      )}

      <div className="ml-auto">
        <Group label="Stack position">
          <Pills options={VALIGN_OPTIONS} value={style.layout.v} onChange={v => setSection('layout', { v })} />
        </Group>
      </div>
    </div>
  )
}
