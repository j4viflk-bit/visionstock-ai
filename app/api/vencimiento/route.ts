import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const hoy = new Date()
    const en7dias = new Date()
    en7dias.setDate(en7dias.getDate() + 7)
    const hoyStr = hoy.toISOString().split('T')[0]
    const en7diasStr = en7dias.toISOString().split('T')[0]

    const { data: productos, error: errorProductos } = await supabase
      .from('productos')
      .select('*')
      .not('fecha_vencimiento', 'is', null)
      .lte('fecha_vencimiento', en7diasStr)

    console.log('Productos encontrados:', JSON.stringify(productos))
    console.log('Error productos:', errorProductos)

    if (!productos || productos.length === 0) {
      return NextResponse.json({ mensaje: 'Sin productos vencidos ni proximos a vencer', vencidos: [], porVencer: [] })
    }

    const vencidos = productos.filter((p: any) => p.fecha_vencimiento < hoyStr)
    const porVencer = productos.filter((p: any) => p.fecha_vencimiento >= hoyStr)

    const cameraIds = [...new Set(productos.map((p: any) => p.camera_id).filter(Boolean))]

    const { data: cameras } = await supabase
      .from('cameras')
      .select('id, name')
      .in('id', cameraIds)

    const camerasMap: Record<string, string> = {}
    cameras?.forEach((c: any) => { camerasMap[c.id] = c.name })

    let mensaje = ''

    if (vencidos.length > 0) {
      const listaVencidos = vencidos.map((p: any) =>
        `- ${p.nombre} (${camerasMap[p.camera_id] || 'Sin camara'}): vencio el ${new Date(p.fecha_vencimiento).toLocaleDateString('es-CL')} - ${p.stock_actual} ${p.unidad}`
      ).join('\n')
      mensaje += `Productos VENCIDOS - retirar de inmediato\n\n${listaVencidos}\n\n`
    }

    if (porVencer.length > 0) {
      const listaPorVencer = porVencer.map((p: any) =>
        `- ${p.nombre} (${camerasMap[p.camera_id] || 'Sin camara'}): vence el ${new Date(p.fecha_vencimiento).toLocaleDateString('es-CL')} - ${p.stock_actual} ${p.unidad}`
      ).join('\n')
      mensaje += `Productos proximos a vencer (7 dias o menos)\n\n${listaPorVencer}\n\n`
    }

    mensaje += `Revisa el inventario en VisionStock AI`

    const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`
    await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: mensaje
      })
    })

    const unidadesVencidas = vencidos.reduce((sum: number, p: any) => sum + (p.stock_actual || 0), 0)
    const unidadesPorVencer = porVencer.reduce((sum: number, p: any) => sum + (p.stock_actual || 0), 0)

    return NextResponse.json({
      mensaje: `${vencidos.length} producto(s) vencido(s) (${unidadesVencidas} unidades) y ${porVencer.length} proximo(s) a vencer (${unidadesPorVencer} unidades)`,
      vencidos,
      porVencer
    })

  } catch (error) {
    console.error('Error en vencimiento:', error)
    return NextResponse.json({ error: 'Error al verificar vencimientos' }, { status: 500 })
  }
}