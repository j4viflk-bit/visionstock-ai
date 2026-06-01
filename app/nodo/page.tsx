'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NodoPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cameraId, setCameraId] = useState('')
  const [cameras, setCameras] = useState<any[]>([])
  const [status, setStatus] = useState('Esperando...')
  const [active, setActive] = useState(false)
  const [lastResult, setLastResult] = useState('')
  const [lastStatus, setLastStatus] = useState('')
  const [lastRecomendacion, setLastRecomendacion] = useState('')
  const [nivelLlenado, setNivelLlenado] = useState(0)
  const [captureCount, setCaptureCount] = useState(0)
  const intervalRef = useRef<any>(null)

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
        video: { facingMode: { ideal: 'environment' } } 
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setStatus('Camara activa')
    } catch {
      setStatus('Error al acceder a la camara')
    }
  }
  const captureAndSend = async () => {
  if (!canvasRef.current || !videoRef.current || !cameraId) return

  const canvas = canvasRef.current
  const ctx = canvas.getContext('2d')
  canvas.width = 800
  canvas.height = 600
  ctx?.drawImage(videoRef.current, 0, 0, 800, 600)

  const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]
  setStatus('Analizando imagen con IA...')

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64, cameraId })
    })

    const data = await res.json()

    if (data.success) {
      if (data.descartado) {
        setStatus('Imagen no valida — apunta a un estante')
        setLastStatus('no_estante')
        setLastResult('La imagen no corresponde a una estantería de tienda')
        setLastRecomendacion('Apuntar la cámara hacia un estante de productos')
        setNivelLlenado(0)
        setCaptureCount(prev => prev + 1)
        return
      }
      setLastStatus(data.result.status)
      setLastResult(data.result.description)
      setLastRecomendacion(data.result.recomendacion || '')
      setNivelLlenado(data.result.nivel_llenado || 0)
      setStatus(`Ultimo analisis: ${new Date().toLocaleTimeString('es-CL')}`)
      setCaptureCount(prev => prev + 1)
    } else {
      setStatus('Error en el analisis')
    }
  } catch {
    setStatus('Error de conexion')
  }
}

 

  const startMonitoring = async () => {
    if (!cameraId) {
      setStatus('Selecciona una camara primero')
      return
    }
    await startCamera()
    setActive(true)
    setStatus('Monitoreo activo — primera captura en 5 segundos...')

    setTimeout(async () => {
      await captureAndSend()
      intervalRef.current = setInterval(captureAndSend, 5 * 60 * 1000)
    }, 5000)
  }

  const stopMonitoring = () => {
    setActive(false)
    clearInterval(intervalRef.current)
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(t => t.stop())
    }
    setStatus('Monitoreo detenido')
    setLastResult('')
    setLastStatus('')
    setLastRecomendacion('')
    setNivelLlenado(0)
  }

  return (
    <main className="min-h-screen text-white" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a00 50%, #0a0a0a 100%)' }}>

      {/* Navbar */}
      <nav className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.4)' }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2" style={{ background: 'linear-gradient(135deg, #ea580c, #dc2626)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-sm">Nodo de Captura</p>
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

      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Nodo de Captura</h1>
          <p className="text-gray-500">Este dispositivo actua como camara de monitoreo de inventario</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">

          {/* Video */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="p-4 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              {active && <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#dc2626' }} />}
              {active && <span className="text-xs font-semibold" style={{ color: '#f87171' }}>EN VIVO</span>}
              {!active && <span className="text-xs text-gray-500">Sin señal</span>}
            </div>
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full"
                style={{ maxHeight: '280px', background: '#000', display: 'block' }}
              />
              <canvas ref={canvasRef} className="hidden" />
              {!active && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
                  <p className="text-gray-500 text-sm">Camara inactiva</p>
                </div>
              )}
            </div>
          </div>

          {/* Panel derecho */}
          <div className="flex flex-col gap-4">

            {/* Selector cámara */}
            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Camara autorizada</p>
              <select
                value={cameraId}
                onChange={(e) => setCameraId(e.target.value)}
                disabled={active}
                className="w-full text-white px-4 py-3 rounded-xl outline-none transition text-sm"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', opacity: active ? 0.5 : 1 }}
              >
                <option value="">-- Seleccionar --</option>
                {cameras.map((cam) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.name} ({cam.location})
                  </option>
                ))}
              </select>
            </div>

            {/* Estado */}
            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Estado operativo</p>
              <p className="text-sm font-semibold" style={{ color: active ? '#fb923c' : '#6b7280' }}>{status}</p>
              {captureCount > 0 && (
                <p className="text-xs text-gray-600 mt-1">Capturas realizadas: {captureCount}</p>
              )}
            </div>

            {/* Resultado IA */}
            {lastResult && (
              <div className="rounded-2xl p-5" style={{
                background: lastStatus === 'vacio' ? 'rgba(220,38,38,0.1)' : 'rgba(34,197,94,0.1)',
                border: `1px solid ${lastStatus === 'vacio' ? 'rgba(220,38,38,0.3)' : 'rgba(34,197,94,0.3)'}`
              }}>
                <p className="text-xs uppercase tracking-wide mb-2" style={{ color: lastStatus === 'vacio' ? '#f87171' : '#4ade80' }}>
                  Ultimo reporte IA
                </p>
                <p className="font-bold text-lg mb-2" style={{ 
  color: lastStatus === 'vacio' ? '#f87171' : lastStatus === 'no_estante' ? '#facc15' : '#4ade80' 
}}>
  {lastStatus === 'vacio' ? 'STOCK FALTANTE' : lastStatus === 'no_estante' ? 'IMAGEN NO VALIDA' : 'STOCK OK'}
</p>

                {/* Nivel de llenado */}
                <div className="mb-2">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs text-gray-500">Nivel de llenado</p>
                    <p className="text-xs font-bold" style={{ color: nivelLlenado < 30 ? '#f87171' : '#fb923c' }}>
                      {nivelLlenado}%
                    </p>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <div className="h-1.5 rounded-full transition-all" style={{
                      width: `${nivelLlenado}%`,
                      background: nivelLlenado < 30 ? '#dc2626' : nivelLlenado < 60 ? '#ea580c' : '#16a34a'
                    }} />
                  </div>
                </div>

                <p className="text-gray-400 text-xs mb-2">{lastResult}</p>

                {lastRecomendacion && lastRecomendacion !== 'Sin recomendación, estante bien abastecido' && (
                  <div className="mt-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(234,88,12,0.15)', border: '1px solid rgba(234,88,12,0.2)' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: '#fb923c' }}>Recomendacion</p>
                    <p className="text-xs text-gray-400">{lastRecomendacion}</p>
                  </div>
                )}
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={startMonitoring}
                disabled={active}
                className="flex-1 text-white font-bold py-3 rounded-xl transition-all transform active:scale-95"
                style={{ background: active ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #ea580c, #dc2626)', opacity: active ? 0.5 : 1, border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Iniciar
              </button>
              <button
                onClick={stopMonitoring}
                disabled={!active}
                className="flex-1 font-bold py-3 rounded-xl transition-all transform active:scale-95"
                style={{ background: !active ? 'rgba(255,255,255,0.05)' : 'rgba(220,38,38,0.2)', color: !active ? '#4b5563' : '#f87171', border: `1px solid ${!active ? 'rgba(255,255,255,0.08)' : 'rgba(220,38,38,0.3)'}`, opacity: !active ? 0.5 : 1 }}
              >
                Detener
              </button>
            </div>

          </div>
        </div>
      </div>
    </main>
  )
}