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
    <main className="flex min-h-screen items-center justify-center bg-gray-900 overflow-hidden relative">

      {/* Fondo animado con círculos */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600 rounded-full opacity-10 animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600 rounded-full opacity-10 animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-900 rounded-full opacity-5 animate-ping" style={{ animationDuration: '3s' }} />
      </div>

      {/* Contenido principal */}
      <div className="relative z-10 text-center px-6">

        {/* Ícono principal */}
        <div className="flex justify-center mb-6">
          <div className="bg-blue-600 rounded-2xl p-5 shadow-2xl shadow-blue-900">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
        </div>

        {/* Título */}
        <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">
          VisionStock <span className="text-blue-400">AI</span>
        </h1>

        {/* Subtítulo */}
        <p className="text-gray-400 text-lg mb-2">Sistema de monitoreo de inventario</p>
        <p className="text-gray-500 text-sm mb-10">Visión computacional · IA · Tiempo real</p>

        {/* Tags */}
        <div className="flex justify-center gap-3 mb-12 flex-wrap">
          <span className="bg-blue-900 text-blue-300 px-3 py-1 rounded-full text-xs font-semibold"> Cámara IoT</span>
          <span className="bg-purple-900 text-purple-300 px-3 py-1 rounded-full text-xs font-semibold"> IA Multimodal</span>
          <span className="bg-green-900 text-green-300 px-3 py-1 rounded-full text-xs font-semibold"> Tiempo Real</span>
          <span className="bg-yellow-900 text-yellow-300 px-3 py-1 rounded-full text-xs font-semibold"> Telegram</span>
        </div>

        {/* Countdown */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full border-4 border-blue-500 flex items-center justify-center">
            <span className="text-2xl font-bold text-blue-400">{countdown}</span>
          </div>
          <p className="text-gray-500 text-sm">Redirigiendo al login...</p>
        </div>

      </div>
    </main>
  )
}