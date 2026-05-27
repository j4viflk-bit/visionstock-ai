'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)

    const redirect = setTimeout(() => {
      router.push('/login')
    }, 3000)

    return () => {
      clearInterval(timer)
      clearTimeout(redirect)
    }
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a00 50%, #0a0a0a 100%)' }}>

      {/* Fondo animado */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-10 blur-3xl animate-pulse" style={{ background: '#ea580c' }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-10 blur-3xl animate-pulse" style={{ background: '#dc2626' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5" style={{ background: '#f97316' }} />
      </div>

      <div className="relative z-10 text-center px-6">
        <div className="flex justify-center mb-6">
          <div className="rounded-2xl p-5 shadow-2xl" style={{ background: 'linear-gradient(135deg, #ea580c, #dc2626)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
        </div>

        <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">
          VisionStock <span style={{ color: '#f97316' }}>AI</span>
        </h1>
        <p className="text-gray-400 text-lg mb-2">Sistema de monitoreo de inventario</p>
        <p className="text-gray-500 text-sm mb-10">Visión computacional · IA · Tiempo real</p>

        <div className="flex justify-center gap-3 mb-12 flex-wrap">
          <span className="px-3 py-1 rounded-full text-xs font-semibold border" style={{ background: 'rgba(234,88,12,0.15)', color: '#fb923c', borderColor: 'rgba(234,88,12,0.3)' }}>Cámara IoT</span>
          <span className="px-3 py-1 rounded-full text-xs font-semibold border" style={{ background: 'rgba(220,38,38,0.15)', color: '#f87171', borderColor: 'rgba(220,38,38,0.3)' }}>IA Multimodal</span>
          <span className="px-3 py-1 rounded-full text-xs font-semibold border" style={{ background: 'rgba(234,88,12,0.15)', color: '#fb923c', borderColor: 'rgba(234,88,12,0.3)' }}>Tiempo Real</span>
          <span className="px-3 py-1 rounded-full text-xs font-semibold border" style={{ background: 'rgba(220,38,38,0.15)', color: '#f87171', borderColor: 'rgba(220,38,38,0.3)' }}>Telegram</span>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full flex items-center justify-center border-4" style={{ borderColor: '#ea580c' }}>
            <span className="text-2xl font-bold" style={{ color: '#f97316' }}>{countdown}</span>
          </div>
          <p className="text-gray-500 text-sm">Redirigiendo al login...</p>
        </div>
      </div>
    </main>
  )
}