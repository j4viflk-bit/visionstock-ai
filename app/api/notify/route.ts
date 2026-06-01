import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { cameraName, location, time } = await req.json()

    const mensaje = `ALERTA DE STOCK - VisionStock AI

Camara: ${cameraName}
Ubicacion: ${location}
Hora: ${time}

Ver dashboard: https://visionstock-ai.vercel.app/dashboard`

    const response = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: mensaje,
          parse_mode: 'Markdown'
        })
      }
    )

    const data = await response.json()
    if (!data.ok) throw new Error(data.description)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error Telegram:', error)
    return NextResponse.json({ error: 'Error al enviar notificación' }, { status: 500 })
  }
}