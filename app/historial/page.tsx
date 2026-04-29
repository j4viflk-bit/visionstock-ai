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
    setLoading(true)
    
    // Preparar queries base
    let queryAnalyses = supabase
      .from('analyses')
      .select('*, cameras(name, location)')
      .order('created_at', { ascending: false })

    let queryAlerts = supabase
      .from('alerts')
      .select('*, cameras(name, location)')
      .order('created_at', { ascending: false })

    // Filtro por cámara
    if (filtroCamera) {
      queryAnalyses = queryAnalyses.eq('camera_id', filtroCamera)
      queryAlerts = queryAlerts.eq('camera_id', filtroCamera)
    }

    // LÓGICA DE FECHA (Ajuste Chile UTC-4)
    if (filtroFecha) {
      // Definimos el inicio del día en Chile (que son las 04:00:00 UTC)
      const inicioDiaUTC = `${filtroFecha}T04:00:00.000Z`
      
      // Calculamos el inicio del día siguiente en Chile (03:59:59 UTC del día siguiente)
      const dateObj = new Date(filtroFecha + 'T12:00:00') // T12 para evitar errores de salto de día al instanciar
      dateObj.setDate(dateObj.getDate() + 1)
      const mañana = dateObj.toISOString().split('T')[0]
      const finDiaUTC = `${mañana}T03:59:59.999Z`

      queryAnalyses = queryAnalyses.gte('created_at', inicioDiaUTC).lte('created_at', finDiaUTC)
      queryAlerts = queryAlerts.gte('created_at', inicioDiaUTC).lte('created_at', finDiaUTC)
    } else {
      // Si no hay filtro de fecha, limitamos para no sobrecargar
      queryAnalyses = queryAnalyses.limit(50)
      queryAlerts = queryAlerts.limit(50)
    }

    const [resAnalyses, resAlerts] = await Promise.all([queryAnalyses, queryAlerts])

    setAnalyses(resAnalyses.data || [])
    setAlerts(resAlerts.data || [])
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      
      {/* Background Decorativo */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950/20" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600 rounded-full opacity-5 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-4 md:p-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 bg-gray-800/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-900/40 font-bold text-xl">📋</div>
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase">Historial de Eventos</h1>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">VisionStock AI Logs</p>
            </div>
          </div>
          
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 md:mt-0 flex items-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 px-5 py-2.5 rounded-xl text-sm transition-all border border-white/10"
          >
            ← Volver al Dashboard
          </button>
        </div>

        {/* Panel de Filtros */}
        <div className="bg-gray-800/40 rounded-3xl p-6 mb-8 border border-white/5 backdrop-blur-md shadow-xl flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 w-full">
            <label className="text-[10px] text-gray-500 uppercase font-black mb-2 block tracking-widest ml-1">Seleccionar Cámara</label>
            <select
              value={filtroCamera}
              onChange={(e) => setFiltroCamera(e.target.value)}
              className="w-full bg-gray-900 border border-white/10 text-white px-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition"
            >
              <option value="">Todas las unidades</option>
              {cameras.map((cam) => (
                <option key={cam.id} value={cam.id}>{cam.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex-1 w-full">
            <label className="text-[10px] text-gray-500 uppercase font-black mb-2 block tracking-widest ml-1">Fecha de Búsqueda (Chile)</label>
            <input
              type="date"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="w-full bg-gray-900 border border-white/10 text-white px-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition"
            />
          </div>

          <div className="flex gap-2 w-full md:w-fit">
            <button
              onClick={loadData}
              className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-500 text-white px-10 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/40"
            >
              🔍 Aplicar Filtros
            </button>
            <button
              onClick={() => { setFiltroCamera(''); setFiltroFecha(''); }}
              className="bg-white/5 hover:bg-white/10 text-gray-400 px-4 py-3.5 rounded-xl border border-white/5 transition-all font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Resultados */}
        <div className="bg-gray-800/30 rounded-3xl overflow-hidden border border-white/5 backdrop-blur-md shadow-2xl relative min-h-[450px]">
          
          <div className="flex bg-gray-950/20 border-b border-white/5">
            <button
              onClick={() => setTab('analisis')}
              className={`flex-1 md:flex-none px-10 py-5 text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'analisis' ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Análisis ({analyses.length})
            </button>
            <button
              onClick={() => setTab('alertas')}
              className={`flex-1 md:flex-none px-10 py-5 text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'alertas' ? 'text-red-400 border-b-2 border-red-500 bg-red-500/5' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Alertas ({alerts.length})
            </button>
          </div>

          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/40 backdrop-blur-sm z-20">
              <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Consultando registros...</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {tab === 'analisis' ? (
                analyses.length === 0 ? (
                  <div className="p-20 text-center text-gray-600 text-[10px] uppercase font-bold tracking-widest">Sin datos para mostrar</div>
                ) : (
                  analyses.map((a) => (
                    <div key={a.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-white/[0.02] transition-all">
                      <div className="flex gap-5 items-center">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl border border-white/5 ${a.status === 'vacio' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                          {a.status === 'vacio' ? '⚠️' : '✅'}
                        </div>
                        <div>
                          <p className="text-white font-bold text-base leading-tight mb-1">{a.cameras?.name}</p>
                          <p className="text-gray-400 text-xs italic opacity-70">"{a.description}"</p>
                          <div className="flex items-center gap-3 mt-3">
                            <span className="text-[10px] text-gray-500 font-mono font-bold bg-black/40 px-2 py-0.5 rounded border border-white/5">
                               {new Date(a.created_at).toLocaleString('es-CL')}
                            </span>
                            <span className="text-[9px] text-blue-500 font-black uppercase">IA Confidence: {Math.round(a.confidence * 100)}%</span>
                          </div>
                        </div>
                      </div>
                      <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${a.status === 'vacio' ? 'bg-red-950/20 text-red-400 border-red-500/20' : 'bg-green-950/20 text-green-400 border-green-500/20'}`}>
                        {a.status === 'vacio' ? 'Detectado Faltante' : 'Stock Normal'}
                      </div>
                    </div>
                  ))
                )
              ) : (
                alerts.length === 0 ? (
                  <div className="p-20 text-center text-gray-600 text-[10px] uppercase font-bold tracking-widest">Historial de alertas vacío</div>
                ) : (
                  alerts.map((a) => (
                    <div key={a.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-white/[0.02] transition-all">
                      <div className="flex gap-5 items-center">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl border border-white/5 ${a.status === 'activa' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>
                          {a.status === 'activa' ? '🔴' : '🏁'}
                        </div>
                        <div>
                          <p className="text-white font-bold text-base leading-tight mb-1">{a.cameras?.name}</p>
                          <p className="text-gray-500 text-[10px] font-bold uppercase opacity-60">📍 {a.cameras?.location}</p>
                          <div className="flex items-center gap-3 mt-3">
                            <span className="text-[10px] text-gray-500 font-mono font-bold bg-black/40 px-2 py-0.5 rounded border border-white/5">
                              Inicio Evento: {new Date(a.created_at).toLocaleString('es-CL')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${a.status === 'activa' ? 'bg-orange-950/20 text-orange-400 border-orange-500/20' : 'bg-blue-950/20 text-blue-400 border-blue-500/20'}`}>
                          {a.status === 'activa' ? 'CRÍTICA' : 'GESTIONADA'}
                        </span>
                        {a.status === 'resuelta' && (
                           <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">
                             Resuelta: {new Date(a.resolved_at).toLocaleDateString('es-CL')}
                           </span>
                        )}
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          )}
        </div>

        <p className="text-center text-gray-700 text-[9px] mt-16 uppercase tracking-[0.3em] font-black opacity-30">
          VisionStock AI · Sistema de Auditoría Digital v2.6
        </p>
      </div>
    </main>
  )
}