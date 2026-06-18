'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SidebarProps {
  userEmail: string
  userRole: string
  activePage: string
  alertCount?: number
  onLogout: () => void
}

export default function Sidebar({ userEmail, userRole, activePage, alertCount = 0, onLogout }: SidebarProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { label: 'Nodo', path: '/nodo', onlyDueno: true, d: 'M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z', badge: alertCount > 0 ? alertCount : null },
    { label: 'Historial', path: '/historial', onlyDueno: true, d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Inventario', path: '/inventario', onlyDueno: true, d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  ].filter(i => !i.onlyDueno || userRole === 'dueno')

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #27272A' }}>
        <div style={{ width: 34, height: 34, background: '#0EA5E9', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg style={{ width: 18, height: 18, color: '#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
          </svg>
        </div>
        <div>
          <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>VisionStock</div>
          <div style={{ color: '#52525B', fontSize: 10 }}>monitoreo con IA</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 12px' }}>
        <div style={{ fontSize: 9, color: '#3F3F46', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '8px 8px 6px', fontWeight: 600 }}>Menú</div>
        {navItems.map(item => (
          <div key={item.label} onClick={() => { router.push(item.path); setMenuOpen(false) }} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', borderRadius: 8,
            cursor: 'pointer', marginBottom: 2, fontSize: 13,
            background: activePage === item.path ? '#27272A' : 'transparent',
            color: activePage === item.path ? '#fff' : '#71717A',
            borderLeft: activePage === item.path ? '2px solid #0EA5E9' : '2px solid transparent'
          }}>
            <svg style={{ width: 16, height: 16, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.d} />
            </svg>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge && <span style={{ background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 20 }}>{item.badge}</span>}
          </div>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid #27272A', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, background: '#0EA5E9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
          {userEmail.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#E4E4E7', fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
          <div style={{ color: '#52525B', fontSize: 10, marginTop: 1 }}>{userRole === 'dueno' ? 'Dueño' : 'Empleado'}</div>
        </div>
        <button onClick={onLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#52525B', padding: 4 }}>
          <svg style={{ width: 15, height: 15 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* SIDEBAR DESKTOP */}
      <aside style={{ width: 240, background: '#1C1C1E', display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0 }} className="sidebar-desktop">
        <SidebarContent />
      </aside>

      {/* TOPBAR MOBILE */}
      <div className="sidebar-mobile-bar" style={{ display: 'none', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: '#1C1C1E', height: 56, alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: '1px solid #27272A' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, background: '#0EA5E9', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg style={{ width: 15, height: 15, color: '#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>VisionStock</span>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 4 }}>
          <svg style={{ width: 22, height: 22 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {menuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            }
          </svg>
        </button>
      </div>

      {/* MENU MOBILE DESPLEGABLE */}
      {menuOpen && (
        <div className="sidebar-mobile-menu" style={{ display: 'none', position: 'fixed', top: 56, left: 0, right: 0, bottom: 0, zIndex: 49, background: '#1C1C1E', flexDirection: 'column' }}>
          <SidebarContent />
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .sidebar-mobile-bar { display: flex !important; }
          .sidebar-mobile-menu { display: flex !important; }
        }
      `}</style>
    </>
  )
}