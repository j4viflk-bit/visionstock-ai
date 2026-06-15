import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { cameraName, location, time, imageUrl, stockBajo } = await req.json()

    const mensaje = `ALERTA DE STOCK - VisionStock AI\n\nCamara: ${cameraName}\nUbicacion: ${location}\nHora: ${time}${stockBajo || ''}\n\nVer dashboard: https://visionstock-ai.vercel.app/dashboard`

    if (imageUrl) {
      const response = await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendPhoto`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            photo: imageUrl,
            caption: mensaje
          })
        }
      )

      const data = await response.json()
      if (!data.ok) {
        console.error('Error sendPhoto:', data.description)
        await fetch(
          `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: process.env.TELEGRAM_CHAT_ID,
              text: mensaje
            })
          }
        )
      }
    } else {
      await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: mensaje
          })
        }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error Telegram:', error)
    return NextResponse.json({ error: 'Error al enviar notificación' }, { status: 500 })
  }
}