'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NodoPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cameraId, setCameraId] = useState('')
  const [cameras, setCameras] = useState<any[]>([])
  const [status, setStatus] = useState('Esperando...')
  const [active, setActive] = useState(false)
  const [lastResult, setLastResult] = useState('')
  const intervalRef = useRef<any>(null)
  const router = useRouter()

  useEffect(() => {
    // Cargar cámaras disponibles
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
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setStatus('Cámara activa ✅')
    } catch {
      setStatus('Error al acceder a la cámara ❌')
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
        const estadoTexto = data.result.status === 'vacio' ? '⚠️ VACÍO' : '✅ Con producto'
        setLastResult(`${estadoTexto} — ${data.result.description}`)
        setStatus(`Último análisis: ${new Date().toLocaleTimeString('es-CL')}`)
      } else {
        setStatus('Error en el análisis ❌')
      }
    } catch {
      setStatus('Error de conexión ❌')
    }
  }

  const startMonitoring = async () => {
    if (!cameraId) {
      setStatus('Selecciona una cámara primero ⚠️')
      return
    }
    await startCamera()
    setActive(true)
    setStatus('Monitoreo activo — primera captura en 5 segundos...')

    // Primera captura a los 5 segundos, luego cada 5 minutos
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
  }

  return (
    <main className="min-h-screen bg-gray-900 p-6">
      <div className="flex justify-between items-center mb-2">
  <h1 className="text-2xl font-bold text-white">Nodo de Captura</h1>
  <button
    onClick={() => router.push('/dashboard')}
    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition"
  >
← Dashboard
  </button>
</div>
      <h1 className="text-2xl font-bold text-white mb-2">Nodo de Captura</h1>
      <p className="text-gray-400 mb-6">Este dispositivo actuará como cámara de monitoreo</p>

      {/* Selector de cámara */}
      <div className="bg-gray-800 rounded-xl p-4 mb-4">
        <label className="text-white text-sm mb-2 block">Selecciona la cámara registrada:</label>
        <select
          value={cameraId}
          onChange={(e) => setCameraId(e.target.value)}
          className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg"
        >
          <option value="">-- Seleccionar --</option>
          {cameras.map((cam) => (
            <option key={cam.id} value={cam.id}>
              {cam.name} — {cam.location}
            </option>
          ))}
        </select>
      </div>

      {/* Video */}
      <div className="bg-gray-800 rounded-xl p-4 mb-4">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full rounded-lg bg-black"
          style={{ maxHeight: '300px' }}
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Estado */}
      <div className="bg-gray-800 rounded-xl p-4 mb-4">
        <p className="text-yellow-400 text-sm font-semibold">{status}</p>
        {lastResult && (
          <p className="text-white text-sm mt-2">{lastResult}</p>
        )}
      </div>

      {/* Botones */}
      <div className="flex gap-4">
        <button
          onClick={startMonitoring}
          disabled={active}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition"
        >
          Iniciar monitoreo
        </button>
        <button
          onClick={stopMonitoring}
          disabled={!active}
          className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition"
        >
          Detener
        </button>
      </div>
    </main>
  )
}