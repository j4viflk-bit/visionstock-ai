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

  const loadData = async () => {
    let analysesQuery = supabase
      .from('analyses')
      .select('*, cameras(name, location)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (filtroCamera) analysesQuery = analysesQuery.eq('camera_id', filtroCamera)
    if (filtroFecha) analysesQuery = analysesQuery.gte('created_at', filtroFecha)

    const { data: analysesData } = await analysesQuery

    let alertsQuery = supabase
      .from('alerts')
      .select('*, cameras(name, location)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (filtroCamera) alertsQuery = alertsQuery.eq('camera_id', filtroCamera)
    if (filtroFecha) alertsQuery = alertsQuery.gte('created_at', filtroFecha)

    const { data: alertsData } = await alertsQuery

    setAnalyses(analysesData || [])
    setAlerts(alertsData || [])
  }

  useEffect(() => {
    loadData()
  }, [filtroCamera, filtroFecha])

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-gray-900">
      <p className="text-white">Cargando...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-gray-900 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">📋 Historial</h1>
          <p className="text-gray-400 text-sm">Registro completo de análisis y alertas</p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition"
        >
          ← Volver
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-gray-800 rounded-xl p-4 mb-6 flex gap-4 flex-wrap">
        <div className="flex-1 min-w-48">
          <label className="text-gray-400 text-xs mb-1 block">Filtrar por cámara</label>
          <select
            value={filtroCamera}
            onChange={(e) => setFiltroCamera(e.target.value)}
            className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm"
          >
            <option value="">Todas las cámaras</option>
            {cameras.map((cam) => (
              <option key={cam.id} value={cam.id}>{cam.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-48">
          <label className="text-gray-400 text-xs mb-1 block">Filtrar desde fecha</label>
          <input
            type="date"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={() => { setFiltroCamera(''); setFiltroFecha('') }}
            className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg text-sm transition"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('analisis')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === 'analisis' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
        >
          Análisis ({analyses.length})
        </button>
        <button
          onClick={() => setTab('alertas')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === 'alertas' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
        >
          Alertas ({alerts.length})
        </button>
      </div>

      {/* Tabla de análisis */}
      {tab === 'analisis' && (
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          {analyses.length === 0 ? (
            <p className="text-gray-400 text-center p-6">No hay análisis registrados</p>
          ) : (
            analyses.map((a, i) => (
              <div key={a.id} className={`p-4 flex justify-between items-center ${i !== analyses.length - 1 ? 'border-b border-gray-700' : ''}`}>
                <div>
                  <p className="text-white text-sm font-medium">{a.cameras?.name}</p>
                  <p className="text-gray-400 text-xs">{a.description}</p>
                  <p className="text-gray-500 text-xs">{new Date(a.created_at).toLocaleString('es-CL')}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${a.status === 'vacio' ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'}`}>
                    {a.status === 'vacio' ? '⚠️ Vacío' : '✅ Con producto'}
                  </span>
                  <span className="text-gray-500 text-xs">{Math.round(a.confidence * 100)}% confianza</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tabla de alertas */}
      {tab === 'alertas' && (
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          {alerts.length === 0 ? (
            <p className="text-gray-400 text-center p-6">No hay alertas registradas</p>
          ) : (
            alerts.map((a, i) => (
              <div key={a.id} className={`p-4 flex justify-between items-center ${i !== alerts.length - 1 ? 'border-b border-gray-700' : ''}`}>
                <div>
                  <p className="text-white text-sm font-medium">{a.cameras?.name}</p>
                  <p className="text-gray-400 text-xs">{a.cameras?.location}</p>
                  <p className="text-gray-500 text-xs">{new Date(a.created_at).toLocaleString('es-CL')}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${a.status === 'activa' ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'}`}>
                  {a.status === 'activa' ? '🔴 Activa' : '✅ Resuelta'}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </main>
  )
}