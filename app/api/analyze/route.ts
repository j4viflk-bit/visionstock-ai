import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { decode } from 'base64-arraybuffer'
import { AIAnalyzer } from '@/lib/strategies/AIAnalyzer'

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, cameraId } = await req.json()

    if (!imageBase64 || !cameraId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
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

    // 2. Analizar imagen usando el patrón Strategy
    const analyzer = new AIAnalyzer()
    const result = await analyzer.analyze(imageBase64)
    console.log(`Análisis completado con: ${analyzer.getStrategyName()}`)
    console.log(`Status: ${result.status} | Nivel: ${result.nivel_llenado}%`)

    // 3. Si no es un estante válido, no guardar ni generar alerta
    if (result.status === 'no_estante') {
      console.log('Imagen no corresponde a estantería, descartando análisis')
      return NextResponse.json({
        success: true,
        result,
        descartado: true,
        mensaje: 'Imagen no corresponde a una estantería'
      })
    }

    // 4. Guardar análisis en Supabase
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

    // 5. Si está vacío, crear alerta y notificar
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

      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cameraName: camera?.name || 'Cámara',
          location: camera?.location || 'Sin ubicación',
          time: new Date().toLocaleString('es-CL')
        })
      })
    }

    // 6. Actualizar última transmisión
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