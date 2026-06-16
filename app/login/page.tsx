'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  return (
    <main style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* Panel izquierdo — imagen */}
      <div style={{ flex: 1.2, position: 'relative', overflow: 'hidden', minHeight: '100vh' }}>

        {/* Imagen de fondo */}
        <img
          src="/quiebredestock.png"
          alt="VisionStock AI"
          style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
        />

        {/* Overlay oscuro */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(28,28,30,0.97) 0%, rgba(28,28,30,0.7) 50%, rgba(28,28,30,0.4) 100%)' }} />

        {/* Contenido */}
        <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '36px 44px' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: '#0EA5E9', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg style={{ width: 18, height: 18, color: '#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </div>
            <div>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>VisionStock AI</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Monitoreo inteligente</div>
            </div>
          </div>

          {/* Texto inferior */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(14,165,233,0.2)', borderRadius: 20, padding: '5px 12px', marginBottom: 20, border: '1px solid rgba(14,165,233,0.3)' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#0EA5E9', animation: 'blink 1.5s infinite' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#7DD3FC' }}>Sistema activo en tiempo real</span>
            </div>

            <h1 style={{ fontSize: 38, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 14 }}>
              Detecta quiebres<br />de stock con<br /><span style={{ color: '#0EA5E9' }}>inteligencia artificial</span>
            </h1>

            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, maxWidth: 360, marginBottom: 32 }}>
              Visión computacional que monitorea estantes cada 5 minutos y alerta al instante cuando detecta stock bajo.
            </p>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 0, background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              {[
                { value: '5 min', label: 'Intervalo captura' },
                { value: '< 6s', label: 'Análisis IA' },
                { value: '90%+', label: 'Precisión' },
              ].map((s, i) => (
                <div key={s.label} style={{ flex: 1, padding: '14px 16px', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div style={{ width: 460, background: '#F4F4F5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 40px', flexShrink: 0 }}>

        <div style={{ width: '100%', maxWidth: 360 }}>

          {/* Encabezado */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: '#09090B', letterSpacing: '-0.03em', marginBottom: 6 }}>
              Iniciar sesión
            </h2>
            <p style={{ fontSize: 13, color: '#A1A1AA', lineHeight: 1.5 }}>
              Ingresa tus credenciales para acceder al sistema de monitoreo
            </p>
          </div>

          {/* Card formulario */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', border: '1px solid #E4E4E7', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 18 }}>

            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#52525B', display: 'block', marginBottom: 7 }}>
                Correo electrónico
              </label>
              <input
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 13,
                  border: '1.5px solid #E4E4E7', background: '#FAFAFA', color: '#09090B',
                  outline: 'none', boxSizing: 'border-box', transition: 'all 0.15s'
                }}
                onFocus={e => { e.target.style.borderColor = '#0EA5E9'; e.target.style.background = '#fff' }}
                onBlur={e => { e.target.style.borderColor = '#E4E4E7'; e.target.style.background = '#FAFAFA' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#52525B', display: 'block', marginBottom: 7 }}>
                Contraseña
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 13,
                  border: '1.5px solid #E4E4E7', background: '#FAFAFA', color: '#09090B',
                  outline: 'none', boxSizing: 'border-box', transition: 'all 0.15s'
                }}
                onFocus={e => { e.target.style.borderColor = '#0EA5E9'; e.target.style.background = '#fff' }}
                onBlur={e => { e.target.style.borderColor = '#E4E4E7'; e.target.style.background = '#FAFAFA' }}
              />
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg style={{ width: 14, height: 14, color: '#DC2626', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p style={{ fontSize: 12, color: '#DC2626', margin: 0 }}>{error}</p>
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 13,
                fontWeight: 600, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? '#BAE6FD' : '#0EA5E9', color: '#fff',
                transition: 'all 0.15s', marginTop: 2, letterSpacing: '0.01em'
              }}
              onMouseEnter={e => { if (!loading) (e.target as HTMLButtonElement).style.background = '#0284C7' }}
              onMouseLeave={e => { if (!loading) (e.target as HTMLButtonElement).style.background = '#0EA5E9' }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <svg style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} fill="none" viewBox="0 0 24 24">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Ingresando...
                </span>
              ) : 'Ingresar al sistema'}
            </button>
          </div>

          <p style={{ textAlign: 'center', fontSize: 11, color: '#A1A1AA', marginTop: 24, lineHeight: 1.6 }}>
            VisionStock AI © 2026 · Proyecto de título<br />Instituto Profesional Santo Tomás
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </main>
  )
}