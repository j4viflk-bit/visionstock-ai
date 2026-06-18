import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const hoy = new Date()
    const en7dias = new Date()
    en7dias.setDate(en7dias.getDate() + 7)

    // Obtener productos que vencen en los próximos 7 días
    const { data: productos } = await supabase
      .from('productos')
      .select('*, cameras(name, location)')
      .not('fecha_vencimiento', 'is', null)
      .lte('fecha_vencimiento', en7dias.toISOString().split('T')[0])
      .gte('fecha_vencimiento', hoy.toISOString().split('T')[0])

    if (!productos || productos.length === 0) {
      return NextResponse.json({ mensaje: 'Sin productos próximos a vencer', productos: [] })
    }

    // Construir mensaje Telegram
    const lista = productos.map((p: any) => 
      `- ${p.nombre} (${p.cameras?.name || 'Sin cámara'}): vence el ${new Date(p.fecha_vencimiento).toLocaleDateString('es-CL')}`
    ).join('\n')

    const mensaje = ` *Productos próximos a vencer*\n\n${lista}\n\n_Revisa el inventario en VisionStock AI_`

    // Enviar a Telegram
    const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`
    await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: mensaje,
        parse_mode: 'Markdown'
      })
    })

    return NextResponse.json({ 
      mensaje: `Se notificaron ${productos.length} productos próximos a vencer`,
      productos 
    })

  } catch (error) {
    console.error('Error en vencimiento:', error)
    return NextResponse.json({ error: 'Error al verificar vencimientos' }, { status: 500 })
  }
}