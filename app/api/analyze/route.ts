import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { decode } from 'base64-arraybuffer'
import { AIAnalyzer } from '@/lib/strategies/AIAnalyzer'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { imageBase64, cameraId } = body

    // Validaciones de entrada
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ error: 'Imagen inválida o ausente' }, { status: 400 })
    }
    if (!cameraId || typeof cameraId !== 'string') {
      return NextResponse.json({ error: 'ID de cámara inválido' }, { status: 400 })
    }

    // 1. Subir imagen a Supabase Storage (se mantiene igual)
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
const { data: productosEnStock } = await supabase
  .from('productos')
  .select('nombre, stock_actual, stock_minimo, unidad')
  .eq('"ID de la cámara"', cameraId) // <-- NOTA LAS COMILLAS: '"ID de la cámara"'

    console.log('Productos de la BD:', JSON.stringify(productosEnStock))

    // Mapeo rápido para que la IA no falle si busca "categoria" en singular
    const productosMapeados = productosEnStock?.map((p: any) => ({
      nombre: p.nombre,
      categoria: p.categorías, // Pasa de plural a singular para tu patrón Strategy
      stock_actual: p.stock_actual,
      stock_minimo: p.stock_minimo,
      unidad: p.unidad
    })) || []

    // 3. Analizar imagen usando el patrón Strategy
    const analyzer = new AIAnalyzer()
    const result = await analyzer.analyze(imageBase64, productosMapeados)

    // 4. Generar recomendación desde inventario real cuando está vacío
    if (productosMapeados.length > 0 && result.status === 'vacio') {
      const disponibles = productosMapeados.filter((p: any) => p.stock_actual > p.stock_minimo)
      const bajoStock = productosMapeados.filter((p: any) => p.stock_actual <= p.stock_minimo)

      let recomendacion = ''
      if (disponibles.length > 0) {
        recomendacion += `Reponer desde bodega: ${disponibles.map((p: any) => `${p.nombre} (${p.stock_actual} ${p.unidad} disponibles)`).join(', ')}`
      }
      if (bajoStock.length > 0) {
        recomendacion += `${disponibles.length > 0 ? '. ' : ''}Stock bajo en bodega: ${bajoStock.map((p: any) => `${p.nombre} (solo ${p.stock_actual} ${p.unidad}, mínimo: ${p.stock_minimo})`).join(', ')}`
      }
      if (recomendacion) result.recomendacion = recomendacion
    }

    // 5. Si no es un estante válido, descartar
    if (result.status === 'no_estante') {
      return NextResponse.json({
        success: true,
        result,
        descartado: true,
        mensaje: 'Imagen no corresponde a una estantería'
      })
    }

    // 6. GUARDAR ANÁLISIS - Adaptado a nombres en español con tildes
    const { data: analysis, error: analysisError } = await supabase
      .from('análisis') // <-- Nombre de tu tabla real
      .insert({
        'ID de la cámara': cameraId,
        estado: result.status,
        confianza: result.confidence,
        descripción: result.description,
        'URL de la imagen': publicUrl,
        nivel_llenado: result.nivel_llenado,
        zonas_vacías: result.zonas_vacias,
        productos_detectados: result.productos_detectados,
        recomendación: result.recomendacion,
        urgencia: result.urgencia
      })
      .select('"identificación"') // Selecciona la llave primaria real en español
      .single()

    if (analysisError) throw analysisError

    // 7. SI ESTÁ VACÍO - Crear alerta en tabla real
    if (result.status === 'vacio') {
      await supabase.from('alertas').insert({
        'ID de análisis': analysis.identificación, // Relación exacta
        'ID de la cámara': cameraId,
        estado: 'activa'
      })

      // Obtener datos de la cámara en la tabla real
      const { data: camera } = await supabase
        .from('cámaras')
        .select('nombre, "ubicación"')
        .eq('identificación', cameraId)
        .single()

      // Notificación principal a Telegram
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cameraName: camera?.nombre || 'Cámara',
            location: camera?.ubicación || 'Sin ubicación',
            time: new Date().toLocaleString('es-CL'),
            imageUrl: publicUrl
          })
        })
      } catch (notifyError) {
        console.error('Error al enviar notificación:', notifyError)
      }
    }

    // 8. Actualizar última transmisión en tabla real
    await supabase
      .from('cámaras')
      .update({ última_transmisión: new Date().toISOString() })
      .eq('identificación', cameraId)

    return NextResponse.json({ success: true, result })

  } catch (error) {
    console.error('Error en analyze:', error)
    return NextResponse.json({ error: 'Error al procesar imagen' }, { status: 500 })
  }
}