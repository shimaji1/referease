'use client'

// Sections show what's built (active) and what's on the roadmap (soon/planned).
// This gives Shima the entire admin plan at a glance.
export default function AdminSidebar({ tab, setTab, counts = {} }) {
  const NAV = [
    {
      header: 'Directory',
      items: [
        { key: 'list',      label: 'Providers & Doctors', status: 'active', badge: counts.providers },
        { key: 'edit',      label: '+ Add Provider',      status: 'active' },
        { key: 'dupes',     label: 'Duplicates',          status: 'active', badge: counts.dupes },
        { key: 'claims',    label: 'Claims',              status: 'active', badge: counts.claims },
      ],
    },
    {
      header: 'Outreach',
      items: [
        { key: 'invites',   label: 'Invite campaigns',    status: 'active' },
        { key: 'templates', label: 'Email templates',     status: 'active' },
      ],
    },
    {
      header: 'Content',
      items: [
        { key: 'blog',      label: 'Blog posts',          status: 'soon' },
        { key: 'pages',     label: 'Page editor',         status: 'soon' },
        { key: 'faq',       label: 'FAQ manager',         status: 'soon' },
      ],
    },
    {
      header: 'Insights',
      items: [
        { key: 'analytics', label: 'Analytics',           status: 'soon' },
        { key: 'faxes',     label: 'Fax intake',          status: 'soon' },
      ],
    },
    {
      header: 'Settings',
      items: [
        { key: 'site',      label: 'Site settings',       status: 'active' },
        { key: 'seo',       label: 'SEO',                 status: 'soon' },
        { key: 'billing',   label: 'Billing / Stripe',    status: 'planned' },
        { key: 'staff',     label: 'Staff & permissions', status: 'planned' },
      ],
    },
  ]

  const statusChip = (s) => {
    if (s === 'soon')    return <span style={{ fontSize:'9px', fontWeight:600, color:'#a16207', background:'#fef3c7', border:'1px solid #fde68a', padding:'1px 6px', borderRadius:'999px', letterSpacing:'0.02em' }}>SOON</span>
    if (s === 'planned') return <span style={{ fontSize:'9px', fontWeight:600, color:'#64748b', background:'#f1f5f9', border:'1px solid #e2e8f0', padding:'1px 6px', borderRadius:'999px', letterSpacing:'0.02em' }}>PLANNED</span>
    return null
  }

  return (
    <aside style={{ width:'240px', background:'#ffffff', borderRight:'1px solid #e2e8f0', minHeight:'100vh', padding:'20px 0', flexShrink:0 }}>
      <div style={{ padding:'0 20px 16px', borderBottom:'1px solid #f1f5f9', marginBottom:'12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <div style={{ width:'32px', height:'32px', background:'#1e3a5f', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ color:'#fff', fontWeight:700, fontSize:'14px' }}>R</span>
          </div>
          <div>
            <div style={{ fontSize:'14px', fontWeight:700, color:'#0f172a' }}>Refer<span style={{ color:'#2563eb' }}>Easy</span></div>
            <div style={{ fontSize:'10px', color:'#94a3b8', letterSpacing:'0.06em', textTransform:'uppercase' }}>Admin</div>
          </div>
        </div>
      </div>
      {NAV.map(section => (
        <div key={section.header} style={{ marginBottom:'18px' }}>
          <div style={{ padding:'0 20px 6px', fontSize:'10px', fontWeight:700, color:'#94a3b8', letterSpacing:'0.08em', textTransform:'uppercase' }}>{section.header}</div>
          {section.items.map(item => {
            const active = tab === item.key
            const disabled = item.status !== 'active'
            return (
              <button
                key={item.key}
                onClick={() => { if (!disabled) setTab(item.key) }}
                disabled={disabled}
                style={{
                  all:'unset', width:'calc(100% - 12px)', margin:'0 6px', padding:'8px 14px', display:'flex', alignItems:'center', justifyContent:'space-between',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  fontSize:'13px', fontWeight: active ? 600 : 500,
                  color: active ? '#1e3a5f' : disabled ? '#cbd5e1' : '#475569',
                  background: active ? '#eff6ff' : 'transparent',
                  borderRadius:'8px',
                  borderLeft: active ? '3px solid #1e3a5f' : '3px solid transparent',
                  paddingLeft: active ? '11px' : '14px',
                }}
              >
                <span>{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span style={{ fontSize:'10px', fontWeight:700, background: active ? '#1e3a5f' : '#e2e8f0', color: active ? '#fff' : '#475569', padding:'1px 7px', borderRadius:'999px' }}>{item.badge}</span>
                )}
                {statusChip(item.status)}
              </button>
            )
          })}
        </div>
      ))}
      <div style={{ padding:'16px 20px', marginTop:'auto', borderTop:'1px solid #f1f5f9' }}>
        <button onClick={() => { try { localStorage.removeItem('re-admin-auth') } catch {}; window.location.href = '/' }} style={{ all:'unset', cursor:'pointer', fontSize:'12px', color:'#94a3b8', display:'block' }}>← Exit admin</button>
      </div>
    </aside>
  )
}
