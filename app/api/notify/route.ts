import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { cameraName, location, time, imageBase64 } = await req.json()

    const mensaje = `ALERTA DE STOCK - VisionStock AI

Camara: ${cameraName}
Ubicacion: ${location}
Hora: ${time}

Ver dashboard: https://visionstock-ai.vercel.app/dashboard`

    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    // Si hay imagen, usar sendPhoto — si no, usar sendMessage
    if (imageBase64) {
      // Convertir base64 a Blob para enviarlo como multipart
      const imageBuffer = Buffer.from(imageBase64, 'base64')
      const formData = new FormData()
      formData.append('chat_id', chatId!)
      formData.append('caption', mensaje)
      formData.append(
        'photo',
        new Blob([imageBuffer], { type: 'image/jpeg' }),
        'alerta.jpg'
      )

      let telegramResponse: Response
      try {
        telegramResponse = await fetch(
          `https://api.telegram.org/bot${botToken}/sendPhoto`,
          { method: 'POST', body: formData }
        )
      } catch (fetchError) {
        console.error('Error al conectar con Telegram (foto):', fetchError)
        return NextResponse.json({ error: 'No se pudo conectar con Telegram' }, { status: 502 })
      }

      const contentType = telegramResponse.headers.get('content-type')
      if (!contentType?.includes('application/json')) {
        const text = await telegramResponse.text()
        console.error('Respuesta inesperada de Telegram:', telegramResponse.status, text)
        return NextResponse.json({ error: 'Respuesta inválida de Telegram' }, { status: 502 })
      }

      const data = await telegramResponse.json()
      if (!data.ok) {
        console.error('Telegram rechazó la foto:', data.description)
        throw new Error(data.description)
      }
    } else {
      // Sin imagen — solo texto
      let telegramResponse: Response
      try {
        telegramResponse = await fetch(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: mensaje, parse_mode: 'Markdown' })
          }
        )
      } catch (fetchError) {
        console.error('Error al conectar con Telegram (texto):', fetchError)
        return NextResponse.json({ error: 'No se pudo conectar con Telegram' }, { status: 502 })
      }

      const contentType = telegramResponse.headers.get('content-type')
      if (!contentType?.includes('application/json')) {
        const text = await telegramResponse.text()
        console.error('Respuesta inesperada de Telegram:', telegramResponse.status, text)
        return NextResponse.json({ error: 'Respuesta inválida de Telegram' }, { status: 502 })
      }

      const data = await telegramResponse.json()
      if (!data.ok) throw new Error(data.description)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error Telegram:', error)
    return NextResponse.json({ error: 'Error al enviar notificación' }, { status: 500 })
  }
}