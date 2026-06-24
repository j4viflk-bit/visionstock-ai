import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { decode } from 'base64-arraybuffer'
import { AIAnalyzer } from '@/lib/strategies/AIAnalyzer'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { imageBase64, cameraId } = body

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
    const { data: productosEnStockRaw } = await supabase
  .from('productos')
  .select('nombre, categoria, stock_actual, stock_minimo, unidad, fecha_vencimiento')
  .eq('camera_id', cameraId)

const hoyStr = new Date().toISOString().split('T')[0]
const productosEnStock = (productosEnStockRaw || []).filter(
  (p: any) => !p.fecha_vencimiento || p.fecha_vencimiento >= hoyStr
)

    console.log('CameraId recibido:', cameraId)
    console.log('Productos encontrados:', JSON.stringify(productosEnStock))

    // 3. Analizar imagen usando el patrón Strategy con contexto de inventario
    const analyzer = new AIAnalyzer()
    const result = await analyzer.analyze(imageBase64, productosEnStock || [])
    console.log(`Análisis completado con: ${analyzer.getStrategyName()}`)
    console.log(`Status: ${result.status} | Nivel: ${result.nivel_llenado}%`)

    // 4. Generar recomendación coherente por categoría según nivel de llenado
const nivelLlenado = result.nivel_llenado ?? 50

if (nivelLlenado >= 80) {
  // Estante bien abastecido — solo sugerir orden, sin recomendar reposición
  result.recomendacion = 'Estante bien abastecido. Se sugiere ordenar y acomodar los productos para mantener una buena presentación.'
} else if (productosEnStock && productosEnStock.length > 0) {
  const textoIA = `${result.productos_detectados} ${result.description} ${result.zonas_vacias}`.toLowerCase()

  const keywordsPorCategoria: Record<string, string[]> = {
    'snacks': ['snack', 'papa', 'papas', 'chips', 'galleta', 'maiz', 'frito', 'cracker', 'aperitivo', 'bocado', 'bolsa', 'paquete'],
    'bebidas': ['bebida', 'agua', 'jugo', 'refresco', 'gaseosa', 'cola', 'botella', 'liquido', 'drink', 'lata'],
    'lacteos': ['lacteo', 'yogur', 'yogurt', 'leche', 'queso', 'mantequilla', 'crema', 'dairy'],
    'panaderia': ['pan', 'galleta', 'cereal', 'harina', 'pastel', 'torta'],
  }

  let categoriaDetectada = ''
  let maxCoincidencias = 0

  for (const [categoria, keywords] of Object.entries(keywordsPorCategoria)) {
    const coincidencias = keywords.filter(kw => textoIA.includes(kw)).length
    if (coincidencias > maxCoincidencias) {
      maxCoincidencias = coincidencias
      categoriaDetectada = categoria
    }
  }

  console.log('Categoría detectada:', categoriaDetectada)

  const productosRelevantes = categoriaDetectada
    ? productosEnStock.filter((p: any) =>
        p.categoria.toLowerCase() === categoriaDetectada ||
        p.categoria.toLowerCase().includes(categoriaDetectada)
      )
    : []

  const productosFinales = productosRelevantes.length > 0
    ? productosRelevantes
    : productosEnStock

  const disponibles = productosFinales.filter((p: any) => p.stock_actual > p.stock_minimo)
  const bajoStock = productosFinales.filter((p: any) => p.stock_actual <= p.stock_minimo)

  // Mientras más vacío el estante, más productos se recomiendan
  const maxProductos = nivelLlenado < 30 ? 4 : nivelLlenado < 50 ? 3 : 2
  const prioritarios = [...bajoStock, ...disponibles].slice(0, maxProductos)

  let recomendacion = ''
  const dispP = prioritarios.filter((p: any) => p.stock_actual > p.stock_minimo)
  const bajoP = prioritarios.filter((p: any) => p.stock_actual <= p.stock_minimo)

  if (dispP.length > 0) {
    recomendacion += `Reponer desde bodega: ${dispP.map((p: any) => `${p.nombre} (${p.stock_actual} ${p.unidad} disponibles)`).join(', ')}`
  }
  if (bajoP.length > 0) {
    recomendacion += `${dispP.length > 0 ? '. ' : ''}Urgente - stock bajo: ${bajoP.map((p: any) => `${p.nombre} (solo ${p.stock_actual} ${p.unidad})`).join(', ')}`
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
    if (result.status === 'vacio' || (result.nivel_llenado !== null && result.nivel_llenado < 80)) {
      await supabase.from('alerts').insert({
        analysis_id: analysis.id,
        camera_id: cameraId,
        status: 'activa'
      })

      // Obtener datos de la cámara
      const { data: camera } = await supabase
        .from('cameras')
        .select('name, location')
        .eq('id', cameraId)
        .single()

      // Construir lista de productos con stock bajo
      let textoStockBajo = ''
      if (productosEnStock && productosEnStock.length > 0) {
        const productosBajos = productosEnStock.filter(
          (p: any) => p.stock_actual <= p.stock_minimo
        )
        if (productosBajos.length > 0) {
          textoStockBajo = `\n\nStock bajo en bodega:\n${productosBajos
            .map((p: any) => `- ${p.nombre}: ${p.stock_actual} ${p.unidad} (min: ${p.stock_minimo})`)
            .join('\n')}`
        }
      }

      // Enviar una sola notificación con toda la info
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cameraName: camera?.name || 'Cámara',
            location: camera?.location || 'Sin ubicación',
            time: new Date().toLocaleString('es-CL'),
            imageUrl: publicUrl,
            stockBajo: textoStockBajo
          })
        })
      } catch (notifyError) {
        console.error('Error al enviar notificación:', notifyError)
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