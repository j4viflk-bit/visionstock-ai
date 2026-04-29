'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState('')
  const [userRole, setUserRole] = useState('')
  const [alerts, setAlerts] = useState<any[]>([])
  const [analyses, setAnalyses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
    const { data: alertsData } = await supabase
      .from('alerts')
      .select('*, cameras(name, location), analyses(description, image_url)')
      .eq('status', 'activa')
      .order('created_at', { ascending: false })

    const { data: analysesData } = await supabase
      .from('analyses')
      .select('*, cameras(name, location)')
      .order('created_at', { ascending: false })
      .limit(10)

    setAlerts(alertsData || [])
    setAnalyses(analysesData || [])
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
    <main className="flex min-h-screen items-center justify-center bg-gray-900">
      <div className="flex flex-col items-center gap-4">
        <svg className="animate-spin w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <p className="text-gray-400 text-sm">Cargando sistema...</p>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen bg-gray-900 text-white">

      {/* Navbar */}
      <nav className="border-b border-white/10 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 rounded-xl p-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-sm">VisionStock AI</p>
              <p className="text-gray-500 text-xs">{userEmail}</p>
            </div>
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${userRole === 'dueno' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'}`}>
              {userRole === 'dueno' ? '👑 Dueño' : '👤 Empleado'}
            </span>
          </div>
          <div className="flex gap-2">
            {userRole === 'dueno' && (
              <>
                <button onClick={() => router.push('/nodo')} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-sm transition">
                  📷 Nodo
                </button>
                <button onClick={() => router.push('/historial')} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-sm transition">
                  📋 Historial
                </button>
              </>
            )}
            <button onClick={handleLogout} className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 px-4 py-2 rounded-xl text-sm transition">
              Salir
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Stats - solo dueño */}
        {userRole === 'dueno' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Alertas activas', value: alerts.length, color: 'red', icon: '⚠️' },
              { label: 'Análisis hoy', value: analyses.length, color: 'blue', icon: '🔍' },
              { label: 'Cámaras activas', value: 1, color: 'green', icon: '📷' },
              { label: 'Sistema', value: '✓ Online', color: 'purple', icon: '⚡' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex justify-between items-start mb-3">
                  <p className="text-gray-400 text-xs">{stat.label}</p>
                  <span className="text-lg">{stat.icon}</span>
                </div>
                <p className={`text-2xl font-bold ${stat.color === 'red' ? 'text-red-400' : stat.color === 'blue' ? 'text-blue-400' : stat.color === 'green' ? 'text-green-400' : 'text-purple-400'}`}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Alertas activas */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <h2 className="text-lg font-bold">Quiebres de Stock Detectados</h2>
            {alerts.length > 0 && (
              <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold px-2 py-0.5 rounded-full">
                {alerts.length} activa{alerts.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {alerts.length === 0 ? (
            <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-8 text-center">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-green-400 font-bold text-lg">Todo el stock está al día</p>
              <p className="text-gray-500 text-sm mt-1">No hay quiebres de stock detectados</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {alerts.map((alert) => (
                <div key={alert.id} className="bg-white/5 border border-red-500/30 rounded-2xl p-5 hover:bg-white/8 transition">
                  <div className="flex gap-5 items-center">
                    {/* Imagen */}
                    <div className="w-28 h-28 bg-black rounded-xl overflow-hidden flex-shrink-0 border border-white/10">
                      {alert.analyses?.image_url ? (
                        <img src={alert.analyses.image_url} alt="Evidencia" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                          <span className="text-2xl">📷</span>
                          <p className="text-gray-600 text-xs">Sin imagen</p>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <p className="text-red-400 text-xs font-semibold uppercase tracking-wide">Alerta activa</p>
                      </div>
                      <p className="font-bold text-xl mb-1">{alert.cameras?.name}</p>
                      <p className="text-gray-400 text-sm mb-2">📍 {alert.cameras?.location}</p>
                      <p className="text-gray-500 text-xs italic">{alert.analyses?.description || 'Quiebre detectado automáticamente'}</p>
                      <p className="text-gray-600 text-xs mt-2">{new Date(alert.created_at).toLocaleString('es-CL')}</p>
                    </div>

                    {/* Botón */}
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="flex-shrink-0 bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-bold transition-all transform active:scale-95 shadow-lg shadow-green-900/30"
                    >
                      ✅ Repuesto
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historial reciente - solo dueño */}
        {userRole === 'dueno' && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-lg font-bold">Últimos Análisis</h2>
              <span className="text-gray-500 text-xs">últimos 10</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              {analyses.length === 0 ? (
                <p className="text-gray-500 text-center p-6 text-sm">No hay análisis aún</p>
              ) : (
                analyses.map((analysis, i) => (
                  <div key={analysis.id} className={`px-5 py-4 flex justify-between items-center hover:bg-white/5 transition ${i !== analyses.length - 1 ? 'border-b border-white/5' : ''}`}>
                    <div>
                      <p className="text-sm font-medium">{analysis.cameras?.name}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{analysis.description}</p>
                      <p className="text-gray-600 text-xs mt-0.5">{new Date(analysis.created_at).toLocaleString('es-CL')}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${analysis.status === 'vacio' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-green-500/20 text-green-300 border border-green-500/30'}`}>
                      {analysis.status === 'vacio' ? '⚠️ Faltante' : '✅ OK'}
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