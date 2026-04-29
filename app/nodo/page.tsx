'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NodoPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cameraId, setCameraId] = useState('')
  const [cameras, setCameras] = useState<any[]>([])
  const [status, setStatus] = useState('Esperando configuración...')
  const [active, setActive] = useState(false)
  const [lastResult, setLastResult] = useState('')
  const intervalRef = useRef<any>(null)
  const router = useRouter()

  useEffect(() => {
    const loadCameras = async () => {
      const { data } = await supabase
        .from('cameras')
        .select('*')
        .eq('is_active', true)
      setCameras(data || [])
    }
    loadCameras()
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setStatus('Cámara vinculada correctamente ✅')
    } catch {
      setStatus('Error: No se detectó hardware de cámara ❌')
    }
  }

  const captureAndSend = async () => {
    if (!canvasRef.current || !videoRef.current || !cameraId) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = 1280
    canvas.height = 720
    ctx?.drawImage(videoRef.current, 0, 0, 1280, 720)

    const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]
    setStatus('⚡ IA Analizando estantería...')

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, cameraId })
      })
      const data = await res.json()

      if (data.success) {
        const esVacio = data.result.status === 'vacio'
        setLastResult(esVacio ? `⚠️ FALTANTE: ${data.result.description}` : `✅ STOCK OK`)
        setStatus(`Sincronizado: ${new Date().toLocaleTimeString('es-CL')}`)
      } else {
        setStatus('Error en procesamiento de nube ❌')
      }
    } catch {
      setStatus('Error de red: Reintentando... ❌')
    }
  }

  const startMonitoring = async () => {
    if (!cameraId) {
      setStatus('⚠️ Selecciona un punto de control')
      return
    }
    await startCamera()
    setActive(true)
    setStatus('Iniciando ciclo de monitoreo...')

    setTimeout(async () => {
      await captureAndSend()
      intervalRef.current = setInterval(captureAndSend, 5 * 60 * 1000)
    }, 3000)
  }

  const stopMonitoring = () => {
    setActive(false)
    clearInterval(intervalRef.current)
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(t => t.stop())
    }
    setStatus('Sistema en pausa')
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      
      {/* 1. FONDOS DECORATIVOS (Estilo Login) - Mejorados */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950/30" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600 rounded-full opacity-10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-600 rounded-full opacity-5 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
        
        {/* Navbar superior */}
        <div className="flex justify-between items-center mb-10 bg-gray-800/40 p-4 rounded-2xl border border-white/5 backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-900/40">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">Nodo de Captura</h1>
              <p className="text-blue-400 text-[10px] uppercase tracking-widest font-black mt-1">Terminal IoT VisionStock</p>
            </div>
          </div>
          
          {/* 2. BOTÓN VOLVER  */}
          <button
            onClick={() => router.push('/dashboard')}
            className="group flex items-center gap-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white px-5 py-2.5 rounded-xl text-sm transition-all border border-white/10 shadow-inner"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium">Dashboard</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          
          {/* Columna Izquierda: Cámara (EL VISOR PRO con Efectos) */}
          <div className="lg:col-span-8">
            <div className="relative bg-gray-950 rounded-3xl overflow-hidden border-2 border-white/5 shadow-2xl group shadow-blue-900/10">
              
              {/* Overlay de visor de cámara */}
              <div className="absolute inset-0 z-20 pointer-events-none border-[15px] border-black/10" />
              <div className="absolute top-5 left-5 z-30 flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
                <div className={`w-2 h-2 rounded-full ${active ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
                <span className="text-[10px] font-mono text-white/90 uppercase tracking-tight">REC • LIVE </span>
              </div>

              <video
                ref={videoRef}
                autoPlay
                playsInline
                className={`w-full aspect-video object-cover transition-opacity duration-700 ${active ? 'opacity-100' : 'opacity-40'}`}
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Efecto de escaneo cuando está activo */}
              {active && (
                <div className="absolute inset-0 z-30 pointer-events-none">
                  <div className="w-full h-[2px] bg-blue-500/60 shadow-[0_0_20px_rgba(59,130,246,0.7)] absolute animate-scan" />
                </div>
              )}

              {!active && (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <div className="text-center p-8 bg-gray-900/80 rounded-2xl backdrop-blur-sm border border-white/5">
                    <span className="text-5xl mb-4 block">📷</span>
                    <p className="text-gray-400 font-mono text-sm uppercase tracking-widest italic">Cámara en espera</p>
                    <p className="text-gray-600 text-xs mt-1">Inicia el monitoreo para activar el visor</p>
                  </div>
                </div>
              )}
            </div>

            {/* Estado debajo de la cámara */}
            <div className="mt-5 bg-gray-800/60 border border-white/5 p-5 rounded-2xl flex justify-between items-center shadow-lg">
               <div className="flex items-center gap-3.5">
                  <div className="bg-gray-700 p-2.5 rounded-xl border border-white/5">
                    <span className="text-xl">📡</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Estado Operativo</p>
                    <p className="text-sm font-semibold text-gray-100">{status}</p>
                  </div>
               </div>
               {active && (
                 <div className="flex items-center gap-2 bg-blue-950/50 px-3 py-1.5 rounded-lg border border-blue-900/50">
                   <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"/>
                   <span className="text-[10px] font-mono text-blue-300 uppercase tracking-wider">Transmitiendo...</span>
                 </div>
               )}
            </div>
          </div>

          {/* Columna Derecha: Controles */}
          <div className="lg:col-span-4 space-y-6 lg:space-y-8">
            
            {/* Panel de Configuración */}
            <div className="bg-gray-800/40 border border-white/5 p-7 rounded-3xl backdrop-blur-md shadow-xl relative overflow-hidden">
              <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-600 rounded-full opacity-5 blur-2xl pointer-events-none" />
              
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-5 relative z-10">Punto de Control</h3>
              <div className="space-y-4 relative z-10">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-black mb-1.5 block tracking-wide">Cámara Autorizada</label>
                  <select
                    value={cameraId}
                    onChange={(e) => setCameraId(e.target.value)}
                    disabled={active}
                    className="w-full bg-gray-900 border border-white/10 text-white text-sm px-4 py-3.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 transition disabled:opacity-30 appearance-none"
                  >
                    <option value="">-- Seleccionar Cámara --</option>
                    {cameras.map((cam) => (
                      <option key={cam.id} value={cam.id}>
                        {cam.name} ({cam.location})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-10 space-y-3 relative z-10">
                {!active ? (
                  <button
                    onClick={startMonitoring}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-4 rounded-2xl transition-all shadow-lg shadow-blue-900/50 transform active:scale-95 flex items-center justify-center gap-2.5 text-base"
                  >
                    🚀 INICIAR MONITOREO
                  </button>
                ) : (
                  <button
                    onClick={stopMonitoring}
                    className="w-full bg-red-950/30 hover:bg-red-950/50 text-red-300 border border-red-500/20 font-bold py-4 rounded-2xl transition-all transform active:scale-95 text-base"
                  >
                    ⏹️ PAUSAR SISTEMA
                  </button>
                )}
              </div>
            </div>

            {/* Resultado IA */}
            {lastResult && (
              <div className="bg-gray-800/20 border border-white/5 p-6 rounded-3xl backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 shadow-inner">
                <h3 className="text-[10px] text-gray-500 uppercase font-black mb-4 tracking-wide">Último Reporte IA Groq</h3>
                <div className={`p-4 rounded-xl text-sm font-medium ${lastResult.includes('⚠️') ? 'bg-red-500/10 text-red-300 border border-red-500/20' : 'bg-green-500/10 text-green-300 border border-green-500/20'}`}>
                  {lastResult}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-gray-700 text-[10px] mt-16 uppercase tracking-widest font-medium">
          VisionStock AI v2.1 Terminal | Protocolo de Monitoreo Activo
        </p>
      </div>

      {/* 1. Estilos global para el escaneo */}
      <style jsx global>{`
        @keyframes scan {
          0% { top: -5%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 105%; opacity: 0; }
        }
        .animate-scan {
          animation: scan 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </main>
  )
}