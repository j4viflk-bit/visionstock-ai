import { AIStrategy, AnalysisResult, ProductoStock } from './AIStrategy'

export class GroqStrategy implements AIStrategy {
  private apiKey: string
  private model: string

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || ''
    this.model = 'meta-llama/llama-4-scout-17b-16e-instruct'
  }

  getName(): string {
    return 'Groq API (Llama 4 Scout)'
  }

  async analyze(imageBase64: string, productosEnStock?: ProductoStock[]): Promise<AnalysisResult> {

    // Contexto de inventario compacto
    let contextoInventario = ''
    if (productosEnStock && productosEnStock.length > 0) {
      const lista = productosEnStock.map((p: any) => `${p.nombre}(${p.categoria})`).join(', ')
      contextoInventario = `\nInventario disponible: ${lista}. Recomienda SOLO estos productos cuando el estante esté vacío.`
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analiza esta imagen de una tienda.${contextoInventario}

Responde SOLO con JSON válido sin texto adicional:
{"status":"vacio|con_producto|no_estante","confidence":0.9,"nivel_llenado":50,"zonas_vacias":"descripción","productos_detectados":"descripción","recomendacion":"texto","urgencia":"ninguna|baja|media|alta","description":"descripción"}

Reglas:
- Si NO es estante de tienda: status=no_estante, nivel_llenado=0
- Si estante vacío (<30%): status=vacio, urgencia=alta
- Si estante medio (30-79%): status=vacio, urgencia=media
- Si estante lleno (≥80%): status=con_producto, urgencia=ninguna`
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
            }
          ]
        }],
        temperature: 0.1,
        max_tokens: 400
      })
    })

    const data = await response.json()
    console.log('Groq status HTTP:', response.status)
    console.log('Groq finish_reason:', data.choices?.[0]?.finish_reason)
    const rawText = data.choices?.[0]?.message?.content || ''
    console.log('Groq rawText:', rawText)

    if (!rawText || rawText.trim() === '') {
      console.error('Groq error completo:', JSON.stringify(data))
      return {
        status: 'no_estante',
        confidence: 0,
        nivel_llenado: 0,
        zonas_vacias: '',
        productos_detectados: '',
        recomendacion: 'No se pudo analizar la imagen',
        urgencia: 'ninguna',
        description: 'No se pudo analizar la imagen'
      }
    }

    const cleaned = rawText.replace(/```json|```/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      console.error('No se encontró JSON en:', rawText)
      return {
        status: 'no_estante',
        confidence: 0,
        nivel_llenado: 0,
        zonas_vacias: '',
        productos_detectados: '',
        recomendacion: 'No se pudo analizar la imagen',
        urgencia: 'ninguna',
        description: 'No se pudo analizar la imagen'
      }
    }

    const result = JSON.parse(jsonMatch[0])

    return {
      status: ['vacio', 'con_producto', 'no_estante'].includes(result.status) ? result.status : 'con_producto',
      confidence: result.confidence ?? 0.5,
      nivel_llenado: result.nivel_llenado ?? 50,
      zonas_vacias: result.zonas_vacias ?? '',
      productos_detectados: result.productos_detectados ?? '',
      recomendacion: result.recomendacion ?? '',
      urgencia: ['ninguna', 'baja', 'media', 'alta'].includes(result.urgencia) ? result.urgencia : 'baja',
      description: result.description ?? 'Análisis completado'
    }
  }
}