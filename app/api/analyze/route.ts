import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { decode } from 'base64-arraybuffer'

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, cameraId } = await req.json()

    if (!imageBase64 || !cameraId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    // 1. Subir imagen a Supabase Storage (RF-18 / R-04)
    const fileName = `${cameraId}/${Date.now()}.jpg`
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('capturas')
      .upload(fileName, decode(imageBase64), {
        contentType: 'image/jpeg',
        upsert: true
      })

    if (storageError) throw storageError

    // Obtener URL pública
    const { data: { publicUrl } } = supabase.storage.from('capturas').getPublicUrl(fileName)

    // 2. Enviar imagen a Groq (Llama 4 Scout)
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
                text: `Eres un sistema de monitoreo de inventario para una tienda retail. Analiza esta imagen con MÁXIMA RIGUROSIDAD.

                      INSTRUCCIONES ESTRICTAS:
                      - Examina CADA sección, estante y espacio visible en la imagen
                      - Si HAY ALGÚN espacio, sección o estante que esté vacío o con menos del 30% de productos → status DEBE ser "vacio"
                      - Solo usa "con_producto" si TODOS los espacios visibles están bien abastecidos (más del 70% llenos)
                      - Sé conservador: ante la duda, reporta "vacio"

                      Responde SOLO con este JSON exacto, sin texto adicional:
                      {
                        "status": "vacio" o "con_producto",
                        "confidence": número entre 0 y 1,
                        "description": "descripción específica en español indicando qué secciones están vacías y cuáles tienen producto"
                      }`
              },
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
        max_tokens: 200
      })
    })

    const data = await response.json()
    const rawText = data.choices?.[0]?.message?.content || ''

    // Limpiar respuesta y parsear JSON
    const cleaned = rawText.match(/\{[\s\S]*\}/)?.[0] || rawText.replace(/```json|```/g, '').trim()
    const result = JSON.parse(cleaned)

    // 3. Guardar análisis en Supabase incluyendo la URL de la imagen
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .insert({
        camera_id: cameraId,
        status: result.status,
        confidence: result.confidence,
        description: result.description,
        image_url: publicUrl // Guardamos la referencia visual
      })
      .select()
      .single()

    if (analysisError) throw analysisError

    // 4. Lógica de Alertas (RF-13)
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

      // Enviar notificación Telegram con la URL de la imagen opcional
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cameraName: camera?.name || 'Cámara',
          location: camera?.location || 'Sin ubicación',
          time: new Date().toLocaleString('es-CL'),
          imageUrl: publicUrl // Para que el dueño vea la foto en el mensaje
        })
      })
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