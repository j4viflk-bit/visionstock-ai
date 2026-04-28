import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { cameraName, location, time, imageUrl } = await req.json()

    // Mensaje mejorado con link a la imagen
    const message = `⚠️ *ALERTA DE STOCK - VisionStock AI*\n\n📷 Cámara: ${cameraName}\n📍 Ubicación: ${location}\n🕐 Hora: ${time}\n\n🖼️ [Ver captura del estante](${imageUrl})\n\n¡Se detectó un estante vacío! Revisar y reponer producto.`

    const response = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: message,
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