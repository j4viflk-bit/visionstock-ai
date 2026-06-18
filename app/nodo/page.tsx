'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

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
  const [userEmail, setUserEmail] = useState('')
  const [userRole, setUserRole] = useState('')
  const intervalRef = useRef<any>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserEmail(session.user.email || '')
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      setUserRole(profile?.role || 'empleado')
      const { data } = await supabase.from('cameras').select('*').eq('is_active', true)
      setCameras(data || [])
    }
    init()
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
      if (videoRef.current) videoRef.current.srcObject = stream
      setStatus('Cámara activa')
    } catch {
      setStatus('Error al acceder a la cámara')
    }
  }

  const captureAndSend = async () => {
    if (!canvasRef.current || !videoRef.current || !cameraId) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = 800; canvas.height = 600
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
          setStatus('Imagen no válida — apunta a un estante')
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
        setStatus(`Último análisis: ${new Date().toLocaleTimeString('es-CL')}`)
        setCaptureCount(prev => prev + 1)
      } else {
        setStatus('Error en el análisis')
      }
    } catch {
      setStatus('Error de conexión')
    }
  }

  const startMonitoring = async () => {
    if (!cameraId) { setStatus('Selecciona una cámara primero'); return }
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
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop())
    }
    setStatus('Monitoreo detenido')
    setLastResult(''); setLastStatus(''); setLastRecomendacion(''); setNivelLlenado(0)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  const statusColor = lastStatus === 'vacio' ? '#EF4444' : lastStatus === 'no_estante' ? '#F59E0B' : '#22C55E'
  const statusBg = lastStatus === 'vacio' ? '#FEF2F2' : lastStatus === 'no_estante' ? '#FFFBEB' : '#F0FDF4'
  const statusBorder = lastStatus === 'vacio' ? '#FECACA' : lastStatus === 'no_estante' ? '#FDE68A' : '#BBF7D0'
  const statusLabel = lastStatus === 'vacio' ? 'STOCK FALTANTE' : lastStatus === 'no_estante' ? 'IMAGEN NO VÁLIDA' : 'STOCK OK'

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', -apple-system, sans-serif", background: '#F4F4F5' }}>

      <Sidebar
        userEmail={userEmail}
        userRole={userRole}
        activePage="/nodo"
        onLogout={handleLogout}
      />

      {/* MAIN */}
      <main style={{ flex: 1, overflowY: 'auto' }}>

        {/* Topbar desktop */}
        <div className="topbar-desktop" style={{ background: '#fff', borderBottom: '1px solid #E4E4E7', padding: '0 28px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#09090B', letterSpacing: '-0.02em' }}>Nodo de Captura</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {active
              ? <><div style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', animation: 'blink 1s infinite' }} /><span style={{ fontSize: 12, color: '#EF4444', fontWeight: 500 }}>En vivo</span></>
              : <><div style={{ width: 7, height: 7, borderRadius: '50%', background: '#A1A1AA' }} /><span style={{ fontSize: 12, color: '#A1A1AA' }}>Inactivo</span></>
            }
          </div>
        </div>

        {/* Espacio topbar mobile */}
        <div className="topbar-mobile-space" style={{ display: 'none', height: 56 }} />

        <div style={{ padding: 28 }} className="main-padding">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Video + Panel */}
            <div style={{ display: 'grid', gap: 20 }} className="nodo-grid">

              {/* Video */}
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E4E4E7', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #F4F4F5', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {active
                    ? <><div style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', animation: 'blink 1s infinite' }} /><span style={{ fontSize: 12, fontWeight: 600, color: '#EF4444' }}>EN VIVO</span></>
                    : <><div style={{ width: 7, height: 7, borderRadius: '50%', background: '#D4D4D8' }} /><span style={{ fontSize: 12, color: '#A1A1AA' }}>Sin señal</span></>
                  }
                </div>
                <div style={{ position: 'relative', background: '#09090B' }}>
                  <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: 280, objectFit: 'cover', display: 'block' }} />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  {!active && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <div style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.08)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg style={{ width: 24, height: 24, color: '#52525B' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                        </svg>
                      </div>
                      <p style={{ fontSize: 12, color: '#52525B' }}>Cámara inactiva</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Panel control */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E4E4E7', padding: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Cámara autorizada</div>
                  <select
                    value={cameraId}
                    onChange={e => setCameraId(e.target.value)}
                    disabled={active}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13,
                      border: '1px solid #E4E4E7', background: active ? '#F4F4F5' : '#FAFAFA',
                      color: '#09090B', outline: 'none', cursor: active ? 'not-allowed' : 'pointer',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">— Seleccionar cámara —</option>
                    {cameras.map(cam => (
                      <option key={cam.id} value={cam.id}>{cam.name} ({cam.location})</option>
                    ))}
                  </select>
                </div>

                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E4E4E7', padding: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Estado operativo</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: active ? '#0EA5E9' : '#A1A1AA' }}>{status}</div>
                  {captureCount > 0 && (
                    <div style={{ fontSize: 11, color: '#A1A1AA', marginTop: 6 }}>{captureCount} capturas realizadas</div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button onClick={startMonitoring} disabled={active} style={{
                    padding: '12px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    border: 'none', cursor: active ? 'not-allowed' : 'pointer',
                    background: active ? '#E4E4E7' : '#0EA5E9', color: active ? '#A1A1AA' : '#fff'
                  }}>Iniciar</button>
                  <button onClick={stopMonitoring} disabled={!active} style={{
                    padding: '12px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    border: '1px solid', cursor: !active ? 'not-allowed' : 'pointer',
                    background: !active ? '#F4F4F5' : '#FEF2F2',
                    color: !active ? '#A1A1AA' : '#EF4444',
                    borderColor: !active ? '#E4E4E7' : '#FECACA'
                  }}>Detener</button>
                </div>
              </div>
            </div>

            {/* Resultado IA */}
            {lastResult && (
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E4E4E7', padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <h2 style={{ fontSize: 14, fontWeight: 600, color: '#09090B' }}>Último reporte IA</h2>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20, background: statusBg, color: statusColor, border: `1px solid ${statusBorder}` }}>
                    {statusLabel}
                  </span>
                </div>
                <div style={{ display: 'grid', gap: 20 }} className="resultado-grid">
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#52525B', marginBottom: 8 }}>Nivel de llenado</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <div style={{ flex: 1, height: 8, background: '#F4F4F5', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: 8, borderRadius: 4, width: `${nivelLlenado}%`, background: nivelLlenado < 30 ? '#EF4444' : nivelLlenado < 60 ? '#F59E0B' : '#22C55E' }} />
                      </div>
                      <span style={{ fontSize: 16, fontWeight: 700, color: nivelLlenado < 30 ? '#EF4444' : nivelLlenado < 60 ? '#F59E0B' : '#22C55E', minWidth: 40 }}>{nivelLlenado}%</span>
                    </div>
                    <p style={{ fontSize: 12, color: '#71717A', lineHeight: 1.5 }}>{lastResult}</p>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#52525B', marginBottom: 8 }}>Recomendación</div>
                    {lastRecomendacion && lastRecomendacion !== 'Sin recomendación, estante bien abastecido'
                      ? <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 10, padding: '12px 14px' }}>
                          <p style={{ fontSize: 12, color: '#0369A1', lineHeight: 1.6, margin: 0 }}>{lastRecomendacion}</p>
                        </div>
                      : <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 14px' }}>
                          <p style={{ fontSize: 12, color: '#15803D', margin: 0 }}>Estante bien abastecido. Sin acción requerida.</p>
                        </div>
                    }
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .nodo-grid { grid-template-columns: 1.2fr 1fr; }
        .resultado-grid { grid-template-columns: 1fr 1fr; }
        .topbar-mobile-space { display: none; }
        @media (max-width: 768px) {
          .topbar-desktop { display: none !important; }
          .topbar-mobile-space { display: block !important; }
          .main-padding { padding: 16px !important; }
          .nodo-grid { grid-template-columns: 1fr !important; }
          .resultado-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}