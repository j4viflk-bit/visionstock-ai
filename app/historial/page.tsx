'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function HistorialPage() {
  const router = useRouter()
  const [analyses, setAnalyses] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroCamera, setFiltroCamera] = useState('')
  const [filtroFecha, setFiltroFecha] = useState('')
  const [cameras, setCameras] = useState<any[]>([])
  const [tab, setTab] = useState<'analisis' | 'alertas'>('analisis')
  const [userEmail, setUserEmail] = useState('')
  const [userRole, setUserRole] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserEmail(session.user.email || '')
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      setUserRole(profile?.role || 'empleado')
      const { data: camsData } = await supabase.from('cameras').select('*')
      setCameras(camsData || [])
      await loadData()
      setLoading(false)
    }
    init()
  }, [])

  const loadData = async (camara = filtroCamera, fecha = filtroFecha) => {
    let analysesQuery = supabase.from('analyses').select('*, cameras(name, location)').order('created_at', { ascending: false }).limit(50)
    if (camara) analysesQuery = analysesQuery.eq('camera_id', camara)
    if (fecha) analysesQuery = analysesQuery.gte('created_at', new Date(fecha).toISOString())
    const { data: analysesData } = await analysesQuery

    let alertsQuery = supabase.from('alerts').select('*, cameras(name, location)').order('created_at', { ascending: false }).limit(50)
    if (camara) alertsQuery = alertsQuery.eq('camera_id', camara)
    if (fecha) alertsQuery = alertsQuery.gte('created_at', new Date(fecha).toISOString())
    const { data: alertsData } = await alertsQuery

    setAnalyses(analysesData || [])
    setAlerts(alertsData || [])
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#F4F4F5' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #E4E4E7', borderTop: '3px solid #0EA5E9', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 13, color: '#A1A1AA' }}>Cargando historial...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', -apple-system, sans-serif", background: '#F4F4F5' }}>

      <Sidebar
        userEmail={userEmail}
        userRole={userRole}
        activePage="/historial"
        onLogout={handleLogout}
      />

      {/* MAIN */}
      <main style={{ flex: 1, overflowY: 'auto' }}>

        {/* Topbar desktop */}
        <div className="topbar-desktop" style={{ background: '#fff', borderBottom: '1px solid #E4E4E7', padding: '0 28px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#09090B', letterSpacing: '-0.02em' }}>Historial completo</h1>
          <span style={{ fontSize: 12, color: '#A1A1AA' }}>Últimos 50 registros</span>
        </div>

        {/* Espacio topbar mobile */}
        <div className="topbar-mobile-space" style={{ display: 'none', height: 56 }} />

        <div style={{ padding: 28 }} className="main-padding">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Filtros */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E4E4E7', padding: 20, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: '#52525B', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cámara</label>
                <select
                  value={filtroCamera}
                  onChange={e => setFiltroCamera(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: 13, border: '1px solid #E4E4E7', background: '#FAFAFA', color: '#09090B', outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="">Todas las cámaras</option>
                  {cameras.map(cam => <option key={cam.id} value={cam.id}>{cam.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: '#52525B', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Desde fecha</label>
                <input
                  type="date"
                  value={filtroFecha}
                  onChange={e => setFiltroFecha(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: 13, border: '1px solid #E4E4E7', background: '#FAFAFA', color: '#09090B', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => loadData(filtroCamera, filtroFecha)} style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: '#0EA5E9', color: '#fff' }}>
                  Buscar
                </button>
                <button onClick={() => { setFiltroCamera(''); setFiltroFecha(''); loadData('', '') }} style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500, border: '1px solid #E4E4E7', cursor: 'pointer', background: '#fff', color: '#71717A' }}>
                  Limpiar
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { key: 'analisis', label: `Análisis (${analyses.length})` },
                { key: 'alertas', label: `Alertas (${alerts.length})` },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key as any)} style={{
                  padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                  border: tab === t.key ? 'none' : '1px solid #E4E4E7',
                  cursor: 'pointer',
                  background: tab === t.key ? '#09090B' : '#fff',
                  color: tab === t.key ? '#fff' : '#71717A',
                }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tabla análisis */}
            {tab === 'analisis' && (
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E4E4E7', overflow: 'auto' }}>
                {analyses.length === 0 ? (
                  <div style={{ padding: '48px', textAlign: 'center' }}>
                    <p style={{ fontSize: 13, color: '#A1A1AA' }}>No hay análisis registrados</p>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                    <thead>
                      <tr style={{ background: '#FAFAFA' }}>
                        {['Cámara', 'Descripción', 'Recomendación', 'Nivel', 'Estado', 'Fecha'].map(h => (
                          <th key={h} style={{ fontSize: 10, color: '#A1A1AA', padding: '10px 16px', textAlign: 'left', fontWeight: 500, borderBottom: '1px solid #F4F4F5', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {analyses.map((a, i) => (
                        <tr key={a.id} style={{ borderBottom: i < analyses.length - 1 ? '1px solid #F4F4F5' : 'none' }}>
                          <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#09090B', whiteSpace: 'nowrap' }}>{a.cameras?.name}</td>
                          <td style={{ padding: '12px 16px', fontSize: 11, color: '#71717A', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.description}</td>
                          <td style={{ padding: '12px 16px', fontSize: 11, color: '#0EA5E9', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {a.recomendacion && a.recomendacion !== 'Sin recomendación, estante bien abastecido' ? a.recomendacion : '—'}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 48, height: 4, background: '#F4F4F5', borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{ width: `${a.nivel_llenado || 0}%`, height: 4, background: a.status === 'vacio' ? '#EF4444' : '#22C55E', borderRadius: 2 }} />
                              </div>
                              <span style={{ fontSize: 10, color: a.status === 'vacio' ? '#EF4444' : '#22C55E', fontWeight: 500 }}>{a.nivel_llenado || 0}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 600, background: a.status === 'vacio' ? '#FEE2E2' : '#DCFCE7', color: a.status === 'vacio' ? '#EF4444' : '#16A34A', whiteSpace: 'nowrap' }}>
                              {a.status === 'vacio' ? 'Faltante' : 'OK'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 11, color: '#A1A1AA', whiteSpace: 'nowrap' }}>{new Date(a.created_at).toLocaleString('es-CL')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Tabla alertas */}
            {tab === 'alertas' && (
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E4E4E7', overflow: 'auto' }}>
                {alerts.length === 0 ? (
                  <div style={{ padding: '48px', textAlign: 'center' }}>
                    <p style={{ fontSize: 13, color: '#A1A1AA' }}>No hay alertas registradas</p>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
                    <thead>
                      <tr style={{ background: '#FAFAFA' }}>
                        {['Cámara', 'Ubicación', 'Estado', 'Fecha'].map(h => (
                          <th key={h} style={{ fontSize: 10, color: '#A1A1AA', padding: '10px 16px', textAlign: 'left', fontWeight: 500, borderBottom: '1px solid #F4F4F5', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {alerts.map((a, i) => (
                        <tr key={a.id} style={{ borderBottom: i < alerts.length - 1 ? '1px solid #F4F4F5' : 'none' }}>
                          <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#09090B' }}>{a.cameras?.name}</td>
                          <td style={{ padding: '12px 16px', fontSize: 11, color: '#71717A' }}>{a.cameras?.location}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 600, background: a.status === 'activa' ? '#FEE2E2' : '#DCFCE7', color: a.status === 'activa' ? '#EF4444' : '#16A34A', whiteSpace: 'nowrap' }}>
                              {a.status === 'activa' ? 'Activa' : 'Resuelta'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 11, color: '#A1A1AA', whiteSpace: 'nowrap' }}>{new Date(a.created_at).toLocaleString('es-CL')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <style>{`
        .topbar-mobile-space { display: none; }
        @media (max-width: 768px) {
          .topbar-desktop { display: none !important; }
          .topbar-mobile-space { display: block !important; }
          .main-padding { padding: 16px !important; }
        }
      `}</style>
    </div>
  )
}