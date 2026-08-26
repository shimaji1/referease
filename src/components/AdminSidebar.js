'use client'
import Logo from './Logo'

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
        { key: 'claim-invites', label: 'Claim invites',   status: 'active', badge: counts.claimInvites },
        { key: 'announcements', label: 'Announcements',   status: 'active', badge: counts.announcements },
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
        { key: 'blog',      label: 'Blog posts',          status: 'active' },
      ],
    },
    {
      header: 'Insights',
      items: [
        { key: 'analytics', label: 'Analytics',           status: 'active' },
      ],
    },
    {
      header: 'Settings',
      items: [
        { key: 'site',      label: 'Settings',            status: 'active' },
        { key: 'staff',     label: 'Staff & permissions', status: 'planned' },
      ],
    },
  ]

  const statusChip = (s) => {
    if (s === 'soon')    return <span style={{ fontSize:'9px', fontWeight:600, color:'#a16207', background:'#fef3c7', border:'1px solid #fde68a', padding:'1px 6px', borderRadius:'999px', letterSpacing:'0.02em', flexShrink:0 }}>SOON</span>
    if (s === 'planned') return <span style={{ fontSize:'9px', fontWeight:600, color:'#64748b', background:'#f1f5f9', border:'1px solid #e2e8f0', padding:'1px 6px', borderRadius:'999px', letterSpacing:'0.02em', flexShrink:0 }}>PLANNED</span>
    return null
  }

  return (
    <aside style={{ width:'260px', background:'#ffffff', borderRight:'1px solid #e2e8f0', minHeight:'100vh', padding:'20px 0', flexShrink:0, boxSizing:'border-box' }}>
      <div style={{ padding:'0 20px 16px', borderBottom:'1px solid #f1f5f9', marginBottom:'12px' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
          <Logo size="sm" href={null} />
          <div style={{ fontSize:'10px', color:'#94a3b8', letterSpacing:'0.06em', textTransform:'uppercase' }}>Admin</div>
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
                  all:'unset', width:'calc(100% - 12px)', boxSizing:'border-box', margin:'0 6px', padding:'8px 12px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  fontSize:'13px', fontWeight: active ? 600 : 500,
                  color: active ? '#1e3a5f' : disabled ? '#cbd5e1' : '#475569',
                  background: active ? '#eff6ff' : 'transparent',
                  borderRadius:'8px',
                  borderLeft: active ? '3px solid #1e3a5f' : '3px solid transparent',
                  paddingLeft: active ? '9px' : '12px',
                  overflow:'hidden',
                }}
              >
                <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, minWidth:0 }}>{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span style={{ fontSize:'10px', fontWeight:700, background: active ? '#1e3a5f' : '#e2e8f0', color: active ? '#fff' : '#475569', padding:'1px 7px', borderRadius:'999px', flexShrink:0 }}>{item.badge}</span>
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
