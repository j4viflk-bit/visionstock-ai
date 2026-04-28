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

      // Obtener rol del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
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
      .select('*, cameras(name, location), analyses(description)')
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
      const { error } = await supabase
        .from('alerts')
        .update({
          status: 'resuelta',
          resolved_by: session?.user.id,
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId)
      if (error) throw error
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
      <p className="text-white">Cargando...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-gray-900 p-6 text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">VisionStock AI 🎯</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-400 text-sm">{userEmail}</p>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${userRole === 'dueno' ? 'bg-yellow-600 text-yellow-100' : 'bg-blue-700 text-blue-100'}`}>
              {userRole === 'dueno' ? '👑 Dueño' : '👤 Empleado'}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          {/* Solo el dueño puede ir al nodo */}
          {userRole === 'dueno' && (
            <button onClick={() => router.push('/nodo')} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm transition">
              📷 Nodo
            </button>
          )}
          {/* Solo el dueño puede ver el historial completo */}
          {userRole === 'dueno' && (
            <button onClick={() => router.push('/historial')} className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm transition">
              📋 Historial
            </button>
          )}
          <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm transition">
            Salir
          </button>
        </div>
      </div>

      {/* Stats - solo dueño */}
      {userRole === 'dueno' && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Alertas activas</p>
            <p className="text-3xl font-bold text-red-400">{alerts.length}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Análisis realizados</p>
            <p className="text-3xl font-bold text-blue-400">{analyses.length}</p>
          </div>
        </div>
      )}

      {/* Alertas activas - ambos roles pueden ver y resolver */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-red-400">⚠️ Quiebres de Stock Detectados</h2>
        {alerts.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-6 text-center border border-gray-700">
            <p className="text-green-400 font-semibold">✅ Todo el stock está al día</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {alerts.map((alert) => (
              <div key={alert.id} className="bg-gray-800 rounded-xl p-4 border border-red-900 flex gap-4">
                <div className="flex-1 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-lg">{alert.cameras?.name}</p>
                    <p className="text-gray-400 text-sm">📍 {alert.cameras?.location}</p>
                    <p className="text-red-300 text-xs mt-1 italic">{alert.analyses?.description || 'Detectado automáticamente'}</p>
                    <p className="text-gray-500 text-xs mt-1">{new Date(alert.created_at).toLocaleString('es-CL')}</p>
                  </div>
                  {/* Ambos pueden resolver */}
                  <button
                    onClick={() => resolveAlert(alert.id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold transition"
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
          <h2 className="text-lg font-semibold mb-4 text-blue-400">🔍 Últimos Análisis</h2>
          <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
            {analyses.map((analysis, i) => (
              <div key={analysis.id} className={`p-4 flex justify-between items-center ${i !== analyses.length - 1 ? 'border-b border-gray-700' : ''}`}>
                <div>
                  <p className="text-sm font-medium">{analysis.cameras?.name}</p>
                  <p className="text-gray-400 text-xs">{analysis.description}</p>
                  <p className="text-gray-500 text-xs">{new Date(analysis.created_at).toLocaleString('es-CL')}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${analysis.status === 'vacio' ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'}`}>
                  {analysis.status === 'vacio' ? 'FALTANTE' : 'OK'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}