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
    <main className="flex min-h-screen bg-gray-900 overflow-hidden relative">

      {/* Fondo decorativo */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-950 via-gray-900 to-purple-950" />
        <div className="absolute top-20 -left-20 w-72 h-72 bg-blue-600 rounded-full opacity-10 blur-3xl" />
        <div className="absolute bottom-20 -right-20 w-72 h-72 bg-purple-600 rounded-full opacity-10 blur-3xl" />
      </div>

      {/* Panel izquierdo - info */}
      <div className="hidden lg:flex flex-col justify-center px-16 w-1/2 relative z-10">
        <div className="bg-blue-600 rounded-2xl p-4 w-fit mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
          </svg>
        </div>
        <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
          VisionStock <span className="text-blue-400">AI</span>
        </h1>
        <p className="text-gray-400 text-lg mb-10">Monitoreo inteligente de inventario para PYMES usando visión computacional.</p>

        <div className="flex flex-col gap-4">
          {[
            { icon: '📷', title: 'Captura automática', desc: 'Fotografía estantes cada 5 minutos' },
            { icon: '🤖', title: 'IA Multimodal', desc: 'Detecta quiebres de stock al instante' },
            { icon: '⚡', title: 'Alertas en tiempo real', desc: 'Notificaciones inmediatas por Telegram' },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-4 bg-white/5 rounded-xl p-4 border border-white/10">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="text-white font-semibold text-sm">{item.title}</p>
                <p className="text-gray-400 text-xs">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Panel derecho - formulario */}
      <div className="flex flex-col justify-center items-center w-full lg:w-1/2 px-6 relative z-10">
        <div className="w-full max-w-md">

          {/* Logo mobile */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="bg-blue-600 rounded-xl p-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </div>
            <span className="text-white font-bold text-xl">VisionStock AI</span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-1">Bienvenido</h2>
            <p className="text-gray-400 text-sm mb-8">Ingresa tus credenciales para continuar</p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Correo electrónico</label>
                <input
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full bg-white/10 border border-white/10 text-white placeholder-gray-500 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Contraseña</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full bg-white/10 border border-white/10 text-white placeholder-gray-500 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <p className="text-red-400 text-sm">⚠️ {error}</p>
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all transform active:scale-95 shadow-lg shadow-blue-900/50 mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Ingresando...
                  </span>
                ) : 'Ingresar →'}
              </button>
            </div>
          </div>

          <p className="text-center text-gray-600 text-xs mt-6">
            VisionStock AI © 2026 · Proyecto de título
          </p>
        </div>
      </div>
    </main>
  )
}