'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function HistorialPage() {
  const router = useRouter()
  const [analyses, setAnalyses] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroCamera, setFiltroCamera] = useState('')
  const [filtroFecha, setFiltroFecha] = useState('')
  const [cameras, setCameras] = useState<any[]>([])
  const [tab, setTab] = useState<'analisis' | 'alertas'>('analisis')

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: camsData } = await supabase.from('cameras').select('*')
      setCameras(camsData || [])

      await loadData()
      setLoading(false)
    }
    init()
  }, [])

  const loadData = async (camara = filtroCamera, fecha = filtroFecha) => {
    let analysesQuery = supabase
      .from('analyses')
      .select('*, cameras(name, location)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (camara) analysesQuery = analysesQuery.eq('camera_id', camara)
    if (fecha) analysesQuery = analysesQuery.gte('created_at', new Date(fecha).toISOString())

    const { data: analysesData } = await analysesQuery

    let alertsQuery = supabase
      .from('alerts')
      .select('*, cameras(name, location)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (camara) alertsQuery = alertsQuery.eq('camera_id', camara)
    if (fecha) alertsQuery = alertsQuery.gte('created_at', new Date(fecha).toISOString())

    const { data: alertsData } = await alertsQuery

    setAnalyses(analysesData || [])
    setAlerts(alertsData || [])
  }

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a00 50%, #0a0a0a 100%)' }}>
      <div className="flex flex-col items-center gap-4">
        <svg className="animate-spin w-10 h-10" style={{ color: '#ea580c' }} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <p className="text-gray-400 text-sm">Cargando historial...</p>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen text-white" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a00 50%, #0a0a0a 100%)' }}>

      {/* Navbar */}
      <nav className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.4)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2" style={{ background: 'linear-gradient(135deg, #ea580c, #dc2626)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-sm">Historial</p>
              <p className="text-gray-500 text-xs">VisionStock AI</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 rounded-xl text-sm transition text-gray-300 hover:text-white"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Dashboard
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Historial completo</h1>
          <p className="text-gray-500">Registro de todos los análisis y alertas generadas</p>
        </div>

        {/* Filtros */}
        <div className="rounded-2xl p-5 mb-6 flex gap-4 flex-wrap items-end" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex-1 min-w-48">
            <label className="text-gray-400 text-xs mb-2 block uppercase tracking-wide">Filtrar por cámara</label>
            <select
              value={filtroCamera}
              onChange={(e) => setFiltroCamera(e.target.value)}
              className="w-full text-white px-3 py-2 rounded-xl outline-none text-sm"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <option value="">Todas las cámaras</option>
              {cameras.map((cam) => (
                <option key={cam.id} value={cam.id}>{cam.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <label className="text-gray-400 text-xs mb-2 block uppercase tracking-wide">Filtrar desde fecha</label>
            <input
              type="date"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="w-full text-white px-3 py-2 rounded-xl outline-none text-sm"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => loadData(filtroCamera, filtroFecha)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition text-white"
              style={{ background: 'linear-gradient(135deg, #ea580c, #dc2626)' }}
            >
              Buscar
            </button>
            <button
              onClick={() => {
                setFiltroCamera('')
                setFiltroFecha('')
                loadData('', '')
              }}
              className="px-4 py-2 rounded-xl text-sm transition text-gray-400 hover:text-white"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('analisis')}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition"
            style={{
              background: tab === 'analisis' ? 'linear-gradient(135deg, #ea580c, #dc2626)' : 'rgba(255,255,255,0.05)',
              color: tab === 'analisis' ? '#fff' : '#9ca3af',
              border: tab === 'analisis' ? 'none' : '1px solid rgba(255,255,255,0.08)'
            }}
          >
            Análisis ({analyses.length})
          </button>
          <button
            onClick={() => setTab('alertas')}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition"
            style={{
              background: tab === 'alertas' ? 'linear-gradient(135deg, #ea580c, #dc2626)' : 'rgba(255,255,255,0.05)',
              color: tab === 'alertas' ? '#fff' : '#9ca3af',
              border: tab === 'alertas' ? 'none' : '1px solid rgba(255,255,255,0.08)'
            }}
          >
            Alertas ({alerts.length})
          </button>
        </div>

        {/* Tabla análisis */}
        {tab === 'analisis' && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {analyses.length === 0 ? (
              <p className="text-gray-500 text-center p-8 text-sm">No hay análisis registrados</p>
            ) : (
              analyses.map((a, i) => (
                <div
                  key={a.id}
                  className="px-5 py-4 flex justify-between items-center hover:bg-white/5 transition"
                  style={{ borderBottom: i !== analyses.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
                >
                  <div>
                    <p className="text-sm font-medium">{a.cameras?.name}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{a.description}</p>
                    <p className="text-gray-600 text-xs mt-0.5">{new Date(a.created_at).toLocaleString('es-CL')}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-3 py-1 rounded-full text-xs font-bold"
                      style={a.status === 'vacio'
                        ? { background: 'rgba(220,38,38,0.2)', color: '#f87171', border: '1px solid rgba(220,38,38,0.3)' }
                        : { background: 'rgba(34,197,94,0.2)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }
                      }>
                      {a.status === 'vacio' ? 'Faltante' : 'OK'}
                    </span>
                    <span className="text-gray-600 text-xs">{Math.round(a.confidence * 100)}% confianza</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tabla alertas */}
        {tab === 'alertas' && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {alerts.length === 0 ? (
              <p className="text-gray-500 text-center p-8 text-sm">No hay alertas registradas</p>
            ) : (
              alerts.map((a, i) => (
                <div
                  key={a.id}
                  className="px-5 py-4 flex justify-between items-center hover:bg-white/5 transition"
                  style={{ borderBottom: i !== alerts.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
                >
                  <div>
                    <p className="text-sm font-medium">{a.cameras?.name}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{a.cameras?.location}</p>
                    <p className="text-gray-600 text-xs mt-0.5">{new Date(a.created_at).toLocaleString('es-CL')}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold"
                    style={a.status === 'activa'
                      ? { background: 'rgba(220,38,38,0.2)', color: '#f87171', border: '1px solid rgba(220,38,38,0.3)' }
                      : { background: 'rgba(34,197,94,0.2)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }
                    }>
                    {a.status === 'activa' ? 'Activa' : 'Resuelta'}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  )
}