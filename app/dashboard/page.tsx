'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function DashboardPage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState('')
  const [userRole, setUserRole] = useState('')
  const [alerts, setAlerts] = useState<any[]>([])
  const [analyses, setAnalyses] = useState<any[]>([])
  const [weekData, setWeekData] = useState<any[]>([])
  const [prediccion, setPrediccion] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserEmail(session.user.email || '')
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      setUserRole(profile?.role || 'empleado')
      await loadData()
      setLoading(false)
    }
    init()
    const channel = supabase.channel('alerts-' + Date.now())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => loadData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadData = async () => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const { data: alertsData } = await supabase.from('alerts')
      .select('*, cameras(name, location), analyses(description, image_url, nivel_llenado, recomendacion, urgencia)')
      .eq('status', 'activa').order('created_at', { ascending: false })
    const { data: analysesData } = await supabase.from('analyses')
      .select('*, cameras(name, location)').gte('created_at', today.toISOString()).order('created_at', { ascending: false })
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const semana: any[] = []
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date(); fecha.setDate(fecha.getDate() - i); fecha.setHours(0, 0, 0, 0)
      const fechaFin = new Date(fecha); fechaFin.setHours(23, 59, 59, 999)
      const { data: q } = await supabase.from('analyses').select('id').eq('status', 'vacio').gte('created_at', fecha.toISOString()).lte('created_at', fechaFin.toISOString())
      semana.push({ dia: dias[fecha.getDay()], quiebres: q?.length || 0, esHoy: i === 0 })
    }
    try {
      const predRes = await fetch('/api/prediccion')
      const predData = await predRes.json()
      setPrediccion(predData)
    } catch (e) {
      console.error('Error prediccion:', e)
    }
    setAlerts(alertsData || []); setAnalyses(analysesData || []); setWeekData(semana)
  }

  const resolveAlert = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('alerts').update({ status: 'resuelta', resolved_by: session?.user.id, resolved_at: new Date().toISOString() }).eq('id', id)
    await loadData()
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#F4F4F5' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #E4E4E7', borderTop: '3px solid #0EA5E9', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 13, color: '#A1A1AA' }}>Cargando...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )

  const quiebresToday = analyses.filter(a => a.status === 'vacio').length

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* SIDEBAR */}
      <aside style={{ width: 240, background: '#1C1C1E', display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0 }}>
        <div style={{ padding: '24px 20px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, background: '#0EA5E9', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg style={{ width: 18, height: 18, color: '#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
          <div>
            <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>VisionStock</div>
            <div style={{ color: '#52525B', fontSize: 10, marginTop: 1 }}>monitoreo con IA</div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '4px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 9, color: '#3F3F46', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '12px 8px 6px', fontWeight: 600 }}>Menú</div>
          {[
            { label: 'Dashboard', path: '/dashboard', active: true, d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
            { label: 'Nodo', path: '/nodo', active: false, onlyDueno: true, d: 'M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z', badge: alerts.length > 0 ? alerts.length : null },
            { label: 'Historial', path: '/historial', active: false, onlyDueno: true, d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'Inventario', path: '/inventario', active: false, onlyDueno: true, d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
          ].filter(i => !i.onlyDueno || userRole === 'dueno').map(item => (
            <div key={item.label} onClick={() => router.push(item.path)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
              background: item.active ? '#27272A' : 'transparent',
              color: item.active ? '#fff' : '#71717A',
              fontSize: 13, fontWeight: item.active ? 500 : 400
            }}>
              <svg style={{ width: 16, height: 16, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.d} />
              </svg>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && <span style={{ background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 20 }}>{item.badge}</span>}
            </div>
          ))}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid #27272A', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: '#0EA5E9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#E4E4E7', fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
            <div style={{ color: '#52525B', fontSize: 10, marginTop: 1 }}>{userRole === 'dueno' ? 'Dueño' : 'Empleado'}</div>
          </div>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#52525B', padding: 4, borderRadius: 6, display: 'flex' }}>
            <svg style={{ width: 15, height: 15 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, overflowY: 'auto', background: '#F4F4F5' }}>

        {/* Topbar */}
        <div style={{ background: '#fff', borderBottom: '1px solid #E4E4E7', padding: '0 28px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#09090B', letterSpacing: '-0.02em' }}>Dashboard</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 0 2px rgba(34,197,94,0.2)' }} />
            <span style={{ fontSize: 12, color: '#71717A' }}>Sistema activo</span>
          </div>
        </div>

        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* CARDS TOP */}
          {userRole === 'dueno' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: 16 }}>
              <div style={{ background: '#1C1C1E', borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: 'rgba(239,68,68,0.15)', borderRadius: '50%' }} />
                <div style={{ width: 36, height: 36, background: 'rgba(239,68,68,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <svg style={{ width: 18, height: 18, color: '#EF4444' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div style={{ fontSize: 11, color: '#71717A', marginBottom: 4 }}>Alertas activas</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>{alerts.length}</div>
                <div style={{ fontSize: 11, color: '#EF4444', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#EF4444', animation: 'blink 1.5s infinite' }} />
                  en tiempo real
                </div>
              </div>

              {[
                { label: 'Análisis hoy', value: analyses.length, sub: `última: ${analyses[0] ? new Date(analyses[0].created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '--'}`, icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z', ic: '#0EA5E9', bg: '#E0F2FE' },
                { label: 'Quiebres hoy', value: quiebresToday, sub: quiebresToday > 0 ? 'requieren atención' : 'sin quiebres', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', ic: '#F59E0B', bg: '#FEF3C7' },
                { label: 'Sistema', value: 'Online', sub: 'Vercel · activo', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', ic: '#22C55E', bg: '#DCFCE7' },
              ].map(card => (
                <div key={card.label} style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #E4E4E7' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ width: 36, height: 36, background: card.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg style={{ width: 18, height: 18, color: card.ic }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                      </svg>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: '#71717A', marginBottom: 4 }}>{card.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#09090B', letterSpacing: '-0.03em', lineHeight: 1 }}>{card.value}</div>
                  <div style={{ fontSize: 11, color: '#A1A1AA', marginTop: 8 }}>{card.sub}</div>
                </div>
              ))}
            </div>
          )}

          {/* GRÁFICO + TABLA LADO A LADO */}
          {userRole === 'dueno' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: 16 }}>
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E4E4E7', padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#09090B' }}>Esta semana</span>
                  <span style={{ fontSize: 11, color: '#A1A1AA' }}>{new Date().getFullYear()}</span>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={weekData} barSize={18} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                    <XAxis dataKey="dia" tick={{ fill: '#A1A1AA', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#A1A1AA', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#1C1C1E', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }} formatter={(v: any) => [`${v} quiebres`, '']} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                    <Bar dataKey="quiebres" radius={[6, 6, 0, 0]}>
                      {weekData.map((e, i) => <Cell key={i} fill={e.esHoy ? '#0EA5E9' : '#E4E4E7'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E4E4E7', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #F4F4F5' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#09090B' }}>Historial de análisis</span>
                </div>
                {analyses.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#A1A1AA', fontSize: 12 }}>Sin análisis hoy</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Cámara', 'Estado', 'Nivel', 'Hora'].map(h => (
                          <th key={h} style={{ fontSize: 10, color: '#A1A1AA', padding: '8px 16px', textAlign: 'left', fontWeight: 500, borderBottom: '1px solid #F4F4F5', background: '#FAFAFA' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {analyses.slice(0, 6).map((a, i) => (
                        <tr key={a.id} style={{ borderBottom: i < Math.min(analyses.length, 6) - 1 ? '1px solid #F4F4F5' : 'none' }}>
                          <td style={{ padding: '10px 16px', fontSize: 12, fontWeight: 500, color: '#09090B' }}>{a.cameras?.name}</td>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: a.status === 'vacio' ? '#EF4444' : '#22C55E', flexShrink: 0 }} />
                              <span style={{ color: a.status === 'vacio' ? '#EF4444' : '#22C55E', fontWeight: 500 }}>{a.status === 'vacio' ? 'Faltante' : 'OK'}</span>
                            </span>
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 50, height: 4, background: '#F4F4F5', borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{ width: `${a.nivel_llenado || 0}%`, height: 4, background: a.status === 'vacio' ? '#EF4444' : '#22C55E', borderRadius: 2 }} />
                              </div>
                              <span style={{ fontSize: 10, color: '#71717A' }}>{a.nivel_llenado || 0}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 16px', fontSize: 11, color: '#A1A1AA' }}>{new Date(a.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* PREDICCIÓN DE QUIEBRES */}
          {userRole === 'dueno' && prediccion && (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E4E4E7', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #F4F4F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#09090B' }}>Predicción de quiebres</span>
                {prediccion.prediccion?.alerta
                  ? <span style={{ background: '#FEE2E2', color: '#EF4444', fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>Hora crítica ahora</span>
                  : <span style={{ fontSize: 11, color: '#A1A1AA' }}>Últimos 30 días</span>
                }
              </div>
              {prediccion.horas_criticas?.length === 0 && prediccion.dias_criticos?.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#A1A1AA', fontSize: 12 }}>
                  Sin suficiente historial para predecir.
                </div>
              ) : (
                <>
                  <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Días con más quiebres</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {prediccion.dias_criticos?.map((d: any, i: number) => {
                          const maxQ = prediccion.dias_criticos[0].quiebres
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: 12, color: '#374151', minWidth: 90, fontWeight: i === 0 ? 600 : 400 }}>{d.label}</span>
                              <div style={{ flex: 1, height: 6, background: '#F4F4F5', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${(d.quiebres / maxQ) * 100}%`, height: 6, background: i === 0 ? '#EF4444' : '#0EA5E9', borderRadius: 3 }} />
                              </div>
                              <span style={{ fontSize: 11, color: '#A1A1AA', minWidth: 20, textAlign: 'right' }}>{d.quiebres}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Horas con más quiebres</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {prediccion.horas_criticas?.map((h: any, i: number) => {
                          const maxQ = prediccion.horas_criticas[0].quiebres
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: 12, color: '#374151', minWidth: 90, fontWeight: i === 0 ? 600 : 400 }}>{h.label}</span>
                              <div style={{ flex: 1, height: 6, background: '#F4F4F5', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${(h.quiebres / maxQ) * 100}%`, height: 6, background: i === 0 ? '#EF4444' : '#0EA5E9', borderRadius: 3 }} />
                              </div>
                              <span style={{ fontSize: 11, color: '#A1A1AA', minWidth: 20, textAlign: 'right' }}>{h.quiebres}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                  {prediccion.prediccion?.mensaje && (
                    <div style={{ margin: '0 20px 20px', padding: '10px 14px', background: prediccion.prediccion.alerta ? '#FEF2F2' : '#F0F9FF', borderRadius: 10, border: `1px solid ${prediccion.prediccion.alerta ? '#FECACA' : '#BAE6FD'}` }}>
                      <p style={{ fontSize: 12, color: prediccion.prediccion.alerta ? '#DC2626' : '#0369A1', margin: 0, lineHeight: 1.6 }}>
                        {prediccion.prediccion.mensaje}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ALERTAS */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E4E4E7', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F4F4F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#09090B' }}>Quiebres detectados</span>
              {alerts.length > 0 && <span style={{ background: '#FEE2E2', color: '#EF4444', fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 600 }}>{alerts.length} activas</span>}
            </div>
            {alerts.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center' }}>
                <div style={{ width: 44, height: 44, background: '#DCFCE7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                  <svg style={{ width: 22, height: 22, color: '#22C55E' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#09090B' }}>Todo en orden</p>
                <p style={{ fontSize: 12, color: '#A1A1AA', marginTop: 4 }}>No hay quiebres detectados</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 0 }}>
                {alerts.map((alert) => (
                  <div key={alert.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: '1px solid #F4F4F5', borderRight: '1px solid #F4F4F5' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: '#F4F4F5', border: '1px solid #E4E4E7' }}>
                      {alert.analyses?.image_url
                        ? <img src={alert.analyses.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg style={{ width: 20, height: 20, color: '#D4D4D8' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            </svg>
                          </div>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#09090B' }}>{alert.cameras?.name}</div>
                      <div style={{ fontSize: 11, color: '#71717A', marginTop: 1 }}>{alert.cameras?.location}</div>
                      {alert.analyses?.recomendacion && (
                        <div style={{ fontSize: 11, color: '#0EA5E9', marginTop: 4, lineHeight: 1.5 }}>{alert.analyses.recomendacion}</div>
                      )}
                      <div style={{ fontSize: 10, color: '#A1A1AA', marginTop: 2 }}>{new Date(alert.created_at).toLocaleString('es-CL')}</div>
                    </div>
                    <button onClick={() => resolveAlert(alert.id)} style={{
                      background: '#09090B', color: '#fff', border: 'none', borderRadius: 8,
                      padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 500, flexShrink: 0
                    }}>
                      Repuesto
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>

      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  )
}