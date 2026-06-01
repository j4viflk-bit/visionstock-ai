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
  const [loading, setLoading] = useState(true)
  const [prediccion, setPrediccion] = useState<any>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserEmail(session.user.email || '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      setUserRole(profile?.role || 'empleado')
      await loadData()
      setLoading(false)
    }
    init()

    const channel = supabase
      .channel('alerts-channel-' + Date.now())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        loadData()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadData = async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    // Cargar predicción
const predRes = await fetch('/api/prediccion')
const predData = await predRes.json()
setPrediccion(predData)

    const { data: alertsData } = await supabase
  .from('alerts')
  .select('*, cameras(name, location), analyses(description, image_url, nivel_llenado, zonas_vacias, productos_detectados, recomendacion, urgencia)')
  .eq('status', 'activa')
  .order('created_at', { ascending: false })

    const { data: analysesData } = await supabase
      .from('analyses')
      .select('*, cameras(name, location)')
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })

    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const semana: any[] = []
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date()
      fecha.setDate(fecha.getDate() - i)
      fecha.setHours(0, 0, 0, 0)
      const fechaFin = new Date(fecha)
      fechaFin.setHours(23, 59, 59, 999)

      const { data: quiebres } = await supabase
        .from('analyses')
        .select('id')
        .eq('status', 'vacio')
        .gte('created_at', fecha.toISOString())
        .lte('created_at', fechaFin.toISOString())

      semana.push({
        dia: dias[fecha.getDay()],
        quiebres: quiebres?.length || 0,
        esHoy: i === 0
      })
    }

    setAlerts(alertsData || [])
    setAnalyses(analysesData || [])
    setWeekData(semana)
  }

  const resolveAlert = async (alertId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await supabase
        .from('alerts')
        .update({
          status: 'resuelta',
          resolved_by: session?.user.id,
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId)
      await loadData()
    } catch (error) {
      console.error('Error al resolver alerta:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a00 50%, #0a0a0a 100%)' }}>
      <div className="flex flex-col items-center gap-4">
        <svg className="animate-spin w-10 h-10" style={{ color: '#ea580c' }} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <p className="text-gray-400 text-sm">Cargando sistema...</p>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen text-white" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a00 50%, #0a0a0a 100%)' }}>

      {/* Navbar */}
      <nav className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.4)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2 shadow-lg" style={{ background: 'linear-gradient(135deg, #ea580c, #dc2626)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-sm">VisionStock AI</p>
              <p className="text-gray-500 text-xs">{userEmail}</p>
            </div>
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: userRole === 'dueno' ? 'rgba(234,88,12,0.2)' : 'rgba(220,38,38,0.2)', color: userRole === 'dueno' ? '#fb923c' : '#f87171', border: `1px solid ${userRole === 'dueno' ? 'rgba(234,88,12,0.3)' : 'rgba(220,38,38,0.3)'}` }}>
              {userRole === 'dueno' ? 'Dueño' : 'Empleado'}
            </span>
          </div>
          <div className="flex gap-2">
            {userRole === 'dueno' && (
              <>
                <button onClick={() => router.push('/nodo')} className="px-4 py-2 rounded-xl text-sm transition text-gray-300 hover:text-white" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  Nodo
                </button>
                <button onClick={() => router.push('/historial')} className="px-4 py-2 rounded-xl text-sm transition text-gray-300 hover:text-white" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  Historial
                </button>
                <button
                  onClick={async () => {
                    const res = await fetch('/api/summary', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ secret: 'visionstock2026' })
                    })
                    const data = await res.json()
                    if (data.success) alert('Resumen enviado por Telegram!')
                    else alert('Error al enviar resumen')
                  }}
                  className="px-4 py-2 rounded-xl text-sm transition"
                  style={{ background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.2)', color: '#fb923c' }}
                >
                  Resumen diario
                </button>
              </>
            )}
            <button onClick={handleLogout} className="px-4 py-2 rounded-xl text-sm transition" style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', color: '#f87171' }}>
              Salir
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Stats */}
        {userRole === 'dueno' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Alertas activas', value: alerts.length, bg: 'rgba(220,38,38,0.1)', border: 'rgba(220,38,38,0.2)', color: '#f87171' },
              { label: 'Análisis hoy', value: analyses.length, bg: 'rgba(234,88,12,0.1)', border: 'rgba(234,88,12,0.2)', color: '#fb923c' },
              { label: 'Quiebres hoy', value: analyses.filter(a => a.status === 'vacio').length, bg: 'rgba(234,88,12,0.1)', border: 'rgba(234,88,12,0.2)', color: '#fb923c' },
              { label: 'Sistema', value: 'Online', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)', color: '#4ade80' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl p-5" style={{ background: stat.bg, border: `1px solid ${stat.border}` }}>
                <p className="text-gray-400 text-xs mb-3">{stat.label}</p>
                <p className="text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
              </div>
            ))}
          </div>
        )}
        {/* Predicción */}
{userRole === 'dueno' && prediccion?.prediccion && (
  <div className="rounded-2xl p-5 mb-8" style={{
    background: prediccion.prediccion.alerta ? 'rgba(234,88,12,0.1)' : 'rgba(255,255,255,0.03)',
    border: `1px solid ${prediccion.prediccion.alerta ? 'rgba(234,88,12,0.3)' : 'rgba(255,255,255,0.08)'}`
  }}>
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-xs uppercase tracking-wide mb-1" style={{ color: '#fb923c' }}>Predicción IA</p>
        <h3 className="font-bold text-white">Análisis de patrones de quiebre</h3>
        <p className="text-gray-500 text-xs mt-1">{prediccion.prediccion.periodo} · {prediccion.prediccion.total_quiebres_analizados} quiebres analizados</p>
      </div>
      {prediccion.prediccion.alerta && (
        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(234,88,12,0.2)', color: '#fb923c', border: '1px solid rgba(234,88,12,0.3)' }}>
          Hora crítica
        </span>
      )}
    </div>

    {prediccion.prediccion.mensaje && (
      <p className="text-sm text-gray-300 mb-4">{prediccion.prediccion.mensaje}</p>
    )}

    <div className="grid grid-cols-2 gap-4">
      {/* Horas críticas */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Horas con más quiebres</p>
        <div className="flex flex-col gap-2">
          {prediccion.horas_criticas?.map((h: any, i: number) => (
            <div key={i} className="flex justify-between items-center">
              <p className="text-xs text-gray-300">{h.label}</p>
              <div className="flex items-center gap-2">
                <div className="h-1.5 rounded-full" style={{
                  width: `${Math.min(h.quiebres * 10, 80)}px`,
                  background: i === 0 ? '#ea580c' : 'rgba(234,88,12,0.4)'
                }} />
                <p className="text-xs text-gray-500">{h.quiebres}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Días críticos */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Días con más quiebres</p>
        <div className="flex flex-col gap-2">
          {prediccion.dias_criticos?.map((d: any, i: number) => (
            <div key={i} className="flex justify-between items-center">
              <p className="text-xs text-gray-300">{d.label}</p>
              <div className="flex items-center gap-2">
                <div className="h-1.5 rounded-full" style={{
                  width: `${Math.min(d.quiebres * 10, 80)}px`,
                  background: i === 0 ? '#dc2626' : 'rgba(220,38,38,0.4)'
                }} />
                <p className="text-xs text-gray-500">{d.quiebres}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
)}

        {/* Gráfico semanal */}
        {userRole === 'dueno' && weekData.length > 0 && (
          <div className="rounded-2xl p-6 mb-8" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold">Quiebres de stock — última semana</h2>
                <p className="text-gray-500 text-xs mt-1">Número de estantes vacíos detectados por día</p>
              </div>
              <span className="text-xs text-gray-500 px-3 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                Total: {weekData.reduce((acc, d) => acc + d.quiebres, 0)} quiebres
              </span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weekData} barSize={32}>
                <XAxis dataKey="dia" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1a0a00', border: '1px solid rgba(234,88,12,0.3)', borderRadius: '12px', color: '#fff' }}
                  formatter={(value: any) => [`${value} quiebres`, 'Detectados']}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="quiebres" radius={[6, 6, 0, 0]}>
                  {weekData.map((entry, index) => (
                    <Cell key={index} fill={entry.esHoy ? '#ea580c' : '#dc2626'} fillOpacity={entry.esHoy ? 1 : 0.6} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-3 justify-end">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{ background: '#dc2626', opacity: 0.6 }}/><span className="text-xs text-gray-500">Días anteriores</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{ background: '#ea580c' }}/><span className="text-xs text-gray-500">Hoy</span></div>
            </div>
          </div>
        )}

        {/* Alertas activas */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#dc2626' }} />
            <h2 className="text-lg font-bold">Quiebres de Stock Detectados</h2>
            {alerts.length > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(220,38,38,0.2)', color: '#f87171', border: '1px solid rgba(220,38,38,0.3)' }}>
                {alerts.length} activa{alerts.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {alerts.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <p className="text-green-400 font-bold text-lg">Todo el stock está al día</p>
              <p className="text-gray-500 text-sm mt-1">No hay quiebres de stock detectados</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {alerts.map((alert) => (
                <div key={alert.id} className="rounded-2xl p-5 transition" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(220,38,38,0.3)' }}>
                  <div className="flex gap-5 items-center">
                    <div className="w-28 h-28 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {alert.analyses?.image_url ? (
                        <img src={alert.analyses.image_url} alt="Evidencia" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <p className="text-gray-600 text-xs">Sin imagen</p>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
  <div className="flex items-center gap-2 mb-1">
    <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#dc2626' }} />
    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#f87171' }}>Alerta activa</p>
    {alert.analyses?.urgencia && (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
        background: alert.analyses.urgencia === 'alta' ? 'rgba(220,38,38,0.3)' : alert.analyses.urgencia === 'media' ? 'rgba(234,88,12,0.3)' : 'rgba(234,179,8,0.3)',
        color: alert.analyses.urgencia === 'alta' ? '#f87171' : alert.analyses.urgencia === 'media' ? '#fb923c' : '#fde047'
      }}>
        Urgencia {alert.analyses.urgencia}
      </span>
    )}
  </div>
  <p className="font-bold text-xl mb-1">{alert.cameras?.name}</p>
  <p className="text-gray-400 text-sm mb-1">{alert.cameras?.location}</p>

  {/* Nivel de llenado */}
  {alert.analyses?.nivel_llenado !== undefined && (
    <div className="mb-2">
      <div className="flex justify-between items-center mb-1">
        <p className="text-xs text-gray-500">Nivel de llenado</p>
        <p className="text-xs font-bold" style={{ color: alert.analyses.nivel_llenado < 30 ? '#f87171' : '#fb923c' }}>
          {alert.analyses.nivel_llenado}%
        </p>
      </div>
      <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div className="h-1.5 rounded-full transition-all" style={{
          width: `${alert.analyses.nivel_llenado}%`,
          background: alert.analyses.nivel_llenado < 30 ? '#dc2626' : '#ea580c'
        }} />
      </div>
    </div>
  )}

  {/* Zonas vacías */}
  {alert.analyses?.zonas_vacias && (
    <p className="text-xs mb-1" style={{ color: '#f87171' }}>
      Zonas vacías: {alert.analyses.zonas_vacias}
    </p>
  )}

  {/* Productos detectados */}
  {alert.analyses?.productos_detectados && (
    <p className="text-xs text-gray-400 mb-1">
      Productos visibles: {alert.analyses.productos_detectados}
    </p>
  )}

  {/* Recomendación */}
  {alert.analyses?.recomendacion && (
    <div className="mt-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.2)' }}>
      <p className="text-xs font-semibold mb-0.5" style={{ color: '#fb923c' }}>Recomendación IA</p>
      <p className="text-xs text-gray-400">{alert.analyses.recomendacion}</p>
    </div>
  )}

  <p className="text-gray-600 text-xs mt-2">{new Date(alert.created_at).toLocaleString('es-CL')}</p>
</div>
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="flex-shrink-0 text-white px-6 py-3 rounded-xl font-bold transition-all transform active:scale-95"
                      style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
                    >
                      Repuesto
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Últimos análisis */}
        {userRole === 'dueno' && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-lg font-bold">Últimos Análisis</h2>
              <span className="text-gray-500 text-xs">hoy</span>
            </div>
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {analyses.length === 0 ? (
                <p className="text-gray-500 text-center p-6 text-sm">No hay análisis hoy</p>
              ) : (
                analyses.slice(0, 10).map((analysis, i) => (
                  <div key={analysis.id} className="px-5 py-4 flex justify-between items-center hover:bg-white/5 transition" style={{ borderBottom: i !== Math.min(analyses.length, 10) - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <div>
                      <p className="text-sm font-medium">{analysis.cameras?.name}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{analysis.description}</p>
                      <p className="text-gray-600 text-xs mt-0.5">{new Date(analysis.created_at).toLocaleString('es-CL')}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold" style={analysis.status === 'vacio' ? { background: 'rgba(220,38,38,0.2)', color: '#f87171', border: '1px solid rgba(220,38,38,0.3)' } : { background: 'rgba(34,197,94,0.2)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}>
                      {analysis.status === 'vacio' ? 'Faltante' : 'OK'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}