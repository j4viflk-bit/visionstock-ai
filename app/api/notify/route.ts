import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { cameraName, location, time } = await req.json()

    const mensaje = `ALERTA DE STOCK - VisionStock AI

Camara: ${cameraName}
Ubicacion: ${location}
Hora: ${time}

Ver dashboard: https://visionstock-ai.vercel.app/dashboard`

    const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`

    let telegramResponse: Response
    try {
      telegramResponse = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: mensaje,
          parse_mode: 'Markdown'
        })
      })
    } catch (fetchError) {
      console.error('Error al conectar con Telegram:', fetchError)
      return NextResponse.json(
        { error: 'No se pudo conectar con Telegram' },
        { status: 502 }
      )
    }

    // Verificar que la respuesta sea JSON válido
    const contentType = telegramResponse.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await telegramResponse.text()
      console.error('Respuesta inesperada de Telegram:', telegramResponse.status, text)
      return NextResponse.json(
        { error: 'Respuesta inválida de Telegram' },
        { status: 502 }
      )
    }

    const data = await telegramResponse.json()
    if (!data.ok) {
      console.error('Telegram rechazó el mensaje:', data.description)
      throw new Error(data.description)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error Telegram:', error)
    return NextResponse.json(
      { error: 'Error al enviar notificación' },
      { status: 500 }
    )
  }
}