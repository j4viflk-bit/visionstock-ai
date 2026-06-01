import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { decode } from 'base64-arraybuffer'

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, cameraId } = await req.json()

    if (!imageBase64 || !cameraId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    // 1. Subir imagen a Supabase Storage
    const fileName = `${cameraId}/${Date.now()}.jpg`
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('capturas')
      .upload(fileName, decode(imageBase64), {
        contentType: 'image/jpeg',
        upsert: true
      })

    if (storageError) throw storageError

    const { data: { publicUrl } } = supabase.storage.from('capturas').getPublicUrl(fileName)

    // 2. Enviar imagen a Groq
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Eres un sistema experto en gestión de inventario retail. Analiza esta imagen de una estantería con precisión y objetividad.

Responde SOLO con este JSON exacto, sin texto adicional:
{
  "status": "vacio" o "con_producto",
  "confidence": número entre 0 y 1,
  "nivel_llenado": número entre 0 y 100 que representa el porcentaje real de llenado,
  "zonas_vacias": "descripción de zonas vacías visibles, o 'Ninguna' si el estante está lleno",
  "productos_detectados": "descripción de los productos visibles: tipo, marca si es legible, color, categoría",
  "recomendacion": "recomendación concreta solo si hay espacios vacíos reales. Si el estante está lleno escribe 'Sin recomendación, estante bien abastecido'",
  "urgencia": "ninguna", "baja", "media" o "alta",
  "description": "descripción objetiva y precisa del estado real del estante"
}

Reglas estrictas:
- Si el estante está visiblemente lleno (más del 80%), nivel_llenado debe ser mayor a 80, status "con_producto", urgencia "ninguna"
- Solo indica zonas_vacias si hay espacios claramente vacíos y visibles
- NO inventes problemas si el estante está bien abastecido
- Si hay espacios vacíos claros, indica exactamente en qué zona están (superior/inferior/izquierda/derecha/centro)
- La recomendacion solo aplica cuando hay espacios vacíos reales y visibles`},
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      })
    })

    const data = await response.json()
    console.log('Groq status:', response.status)
    console.log('Groq response completo:', JSON.stringify(data))

    const rawText = data.choices?.[0]?.message?.content || ''
    console.log('Respuesta IA:', rawText)

    if (!rawText || rawText.trim() === '') {
      console.error('Groq devolvió respuesta vacía')
      return NextResponse.json({ error: 'Error al procesar imagen' }, { status: 500 })
    }

    // Limpiar respuesta y parsear JSON
    const cleaned = rawText.replace(/```json|```/g, '').trim()
const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No se encontró JSON en la respuesta:', rawText)
      return NextResponse.json({ error: 'Error al procesar imagen' }, { status: 500 })
    }

    let result
try {
  const jsonMatch = rawText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error('No se encontró JSON en respuesta:', rawText)
    return NextResponse.json({ error: 'Error al procesar imagen' }, { status: 500 })
  }
  result = JSON.parse(jsonMatch[0])
} catch (parseError) {
  console.error('Error al parsear JSON:', rawText)
  return NextResponse.json({ error: 'Error al procesar imagen' }, { status: 500 })
}

// Valores por defecto si faltan campos
result.status = result.status || 'con_producto'
result.confidence = result.confidence || 0.5
result.description = result.description || 'Análisis completado'
result.nivel_llenado = result.nivel_llenado ?? 50
result.zonas_vacias = result.zonas_vacias || ''
result.productos_detectados = result.productos_detectados || ''
result.recomendacion = result.recomendacion || ''
result.urgencia = result.urgencia || 'baja'

if (!['vacio', 'con_producto'].includes(result.status)) {
  result.status = 'con_producto'
}

    // Validar campos
    if (!result.status || !['vacio', 'con_producto'].includes(result.status)) {
      result.status = 'con_producto'
      result.confidence = 0.5
      result.description = result.description || 'Análisis completado'
    }

    // 3. Guardar análisis en Supabase
    const { data: analysis, error: analysisError } = await supabase
  .from('analyses')
  .insert({
    camera_id: cameraId,
    status: result.status,
    confidence: result.confidence,
    description: result.description,
    image_url: publicUrl,
    nivel_llenado: result.nivel_llenado || 0,
    zonas_vacias: result.zonas_vacias || '',
    productos_detectados: result.productos_detectados || '',
    recomendacion: result.recomendacion || '',
    urgencia: result.urgencia || 'baja'
  })
      .select()
      .single()

    if (analysisError) throw analysisError

    // 4. Si está vacío, crear alerta y notificar
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

      const notifyRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cameraName: camera?.name || 'Cámara',
          location: camera?.location || 'Sin ubicación',
          time: new Date().toLocaleString('es-CL'),
          imageUrl: publicUrl
        })
      })
      const notifyData = await notifyRes.json()
      console.log('Notify result:', JSON.stringify(notifyData))
    }

    // Actualizar última transmisión
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