'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    const timer = setInterval(() => setCountdown(p => p - 1), 1000)
    const redirect = setTimeout(() => router.push('/login'), 3000)
    return () => { clearInterval(timer); clearTimeout(redirect) }
  }, [])

  return (
    <main style={{
      minHeight: '100vh', background: '#F4F4F5',
      fontFamily: "'Inter', -apple-system, sans-serif",
      display: 'flex', flexDirection: 'column'
    }}>

      {/* Navbar top */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #E4E4E7', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, background: '#0EA5E9', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg style={{ width: 16, height: 16, color: '#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#09090B' }}>VisionStock AI</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />
          <span style={{ fontSize: 11, color: '#71717A' }}>Sistema activo</span>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', gap: 48 }}>

        {/* Texto principal */}
        <div style={{ textAlign: 'center', maxWidth: 560 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E0F2FE', borderRadius: 20, padding: '4px 12px', marginBottom: 24 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#0EA5E9', animation: 'blink 1.5s infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#0284C7' }}>Monitoreo en tiempo real</span>
          </div>

          <h1 style={{ fontSize: 'clamp(32px, 6vw, 52px)', fontWeight: 800, color: '#09090B', letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 16 }}>
            Inventario inteligente<br />
            <span style={{ color: '#0EA5E9' }}>con visión artificial</span>
          </h1>

          <p style={{ fontSize: 'clamp(13px, 2vw, 16px)', color: '#71717A', lineHeight: 1.6, marginBottom: 32 }}>
            Detecta quiebres de stock automáticamente con inteligencia artificial y cámaras IoT. Recibe alertas en Telegram al instante.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 40 }}>
            {['Cámara IoT', 'IA Multimodal', 'Tiempo Real', 'Notificaciones Telegram', 'Predicción de quiebres'].map(tag => (
              <span key={tag} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: '#fff', color: '#52525B', border: '1px solid #E4E4E7' }}>{tag}</span>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid #0EA5E9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#0EA5E9' }}>{countdown}</span>
            </div>
            <span style={{ fontSize: 12, color: '#A1A1AA' }}>Redirigiendo al login...</span>
          </div>
        </div>

        {/* Imagen */}
        <div style={{ width: '100%', maxWidth: 760, borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.12)', border: '1px solid #E4E4E7' }}>
          <img
            src="/quiebredestock.png"
            alt="VisionStock AI"
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>

      </div>

      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </main>
  )
}