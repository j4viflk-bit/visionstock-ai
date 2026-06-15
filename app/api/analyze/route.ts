import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { decode } from 'base64-arraybuffer'
import { AIAnalyzer } from '@/lib/strategies/AIAnalyzer'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { imageBase64, cameraId } = body

    // Validación de datos de entrada
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ error: 'Imagen inválida o ausente' }, { status: 400 })
    }

    if (!cameraId || typeof cameraId !== 'string') {
      return NextResponse.json({ error: 'ID de cámara inválido' }, { status: 400 })
    }

    if (imageBase64.length < 100) {
      return NextResponse.json({ error: 'Imagen demasiado pequeña o corrupta' }, { status: 400 })
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(cameraId)) {
      return NextResponse.json({ error: 'ID de cámara no tiene formato válido' }, { status: 400 })
    }

    // 1. Subir imagen a Supabase Storage
    const fileName = `${cameraId}/${Date.now()}.jpg`
    const { error: storageError } = await supabase
      .storage
      .from('capturas')
      .upload(fileName, decode(imageBase64), {
        contentType: 'image/jpeg',
        upsert: true
      })

    if (storageError) throw storageError

    const { data: { publicUrl } } = supabase.storage.from('capturas').getPublicUrl(fileName)

    // 2. Obtener productos en stock asociados a esta cámara
const { data: productosEnStock, error: productosError } = await supabase
  .from('productos')
  .select('nombre, categoria, stock_actual, stock_minimo, unidad')
  .eq('camera_id', cameraId)

console.log('CameraId recibido:', cameraId)
console.log('Productos encontrados:', JSON.stringify(productosEnStock))
console.log('Error productos:', JSON.stringify(productosError))
    // 3. Analizar imagen usando el patrón Strategy con contexto de inventario
    const analyzer = new AIAnalyzer()
    const result = await analyzer.analyze(imageBase64, productosEnStock || [])
    console.log(`Análisis completado con: ${analyzer.getStrategyName()}`)
    console.log(`Status: ${result.status} | Nivel: ${result.nivel_llenado}%`)
  // 4. Generar recomendación desde inventario real cuando está vacío
if (productosEnStock && productosEnStock.length > 0 && result.status === 'vacio') {
  console.log('Productos en stock:', JSON.stringify(productosEnStock))
  console.log('Recomendacion original IA:', result.recomendacion)
  const disponibles = productosEnStock.filter((p: any) => p.stock_actual > p.stock_minimo)
  const bajoStock = productosEnStock.filter((p: any) => p.stock_actual <= p.stock_minimo)

  let recomendacion = ''

  if (disponibles.length > 0) {
    recomendacion += `Reponer desde bodega: ${disponibles.map((p: any) => `${p.nombre} (${p.stock_actual} ${p.unidad} disponibles)`).join(', ')}`
  }

  if (bajoStock.length > 0) {
    recomendacion += `${disponibles.length > 0 ? '. ' : ''}Stock bajo en bodega: ${bajoStock.map((p: any) => `${p.nombre} (solo ${p.stock_actual} ${p.unidad}, mínimo: ${p.stock_minimo})`).join(', ')}`
  }

  if (recomendacion) result.recomendacion = recomendacion
}

    // 5. Si no es un estante válido, no guardar ni generar alerta
    if (result.status === 'no_estante') {
      console.log('Imagen no corresponde a estantería, descartando análisis')
      return NextResponse.json({
        success: true,
        result,
        descartado: true,
        mensaje: 'Imagen no corresponde a una estantería'
      })
    }

    // 6. Guardar análisis en Supabase
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .insert({
        camera_id: cameraId,
        status: result.status,
        confidence: result.confidence,
        description: result.description,
        image_url: publicUrl,
        nivel_llenado: result.nivel_llenado,
        zonas_vacias: result.zonas_vacias,
        productos_detectados: result.productos_detectados,
        recomendacion: result.recomendacion,
        urgencia: result.urgencia
      })
      .select()
      .single()

    if (analysisError) throw analysisError

    // 7. Si está vacío, crear alerta y notificar
    if (result.status === 'vacio') {
      await supabase.from('alerts').insert({
        analysis_id: analysis.id,
        camera_id: cameraId,
        status: 'activa'
      })

      const { data: camera } = await supabase
        .from('cameras')
        .select('name, location')
        .eq('id', cameraId)
        .single()

      // Notificación principal
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cameraName: camera?.name || 'Cámara',
            location: camera?.location || 'Sin ubicación',
            time: new Date().toLocaleString('es-CL')
          })
        })
      } catch (notifyError) {
        console.error('Error al enviar notificación:', notifyError)
      }

      // Notificación de stock bajo en bodega
      if (productosEnStock && productosEnStock.length > 0) {
        const productosBajos = productosEnStock.filter(
          (p: any) => p.stock_actual <= p.stock_minimo
        )

        if (productosBajos.length > 0) {
          const listaProductos = productosBajos
            .map((p: any) => `${p.nombre}: ${p.stock_actual} ${p.unidad} (min: ${p.stock_minimo})`)
            .join('\n')

          try {
            await fetch(
              `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: process.env.TELEGRAM_CHAT_ID,
                  text: `ALERTA DE STOCK BAJO - VisionStock AI\n\nLos siguientes productos necesitan reposicion en bodega:\n\n${listaProductos}\n\nRevisa el inventario en: https://visionstock-ai.vercel.app/inventario`,
                })
              }
            )
          } catch (stockError) {
            console.error('Error al enviar alerta de stock bajo:', stockError)
          }
        }
      }
    }

    // 8. Actualizar última transmisión
    await supabase
      .from('cameras')
      .update({ last_transmission: new Date().toISOString() })
      .eq('id', cameraId)

    return NextResponse.json({ success: true, result })

  } catch (error) {
    console.error('Error en analyze:', error)
    return NextResponse.json({ error: 'Error al procesar imagen' }, { status: 500 })
  }
  }