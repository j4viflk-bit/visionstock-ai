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

    // Construir contexto de inventario
    let contextoInventario = ''
    if (productosEnStock && productosEnStock.length > 0) {
      contextoInventario = `\n\nINVENTARIO DISPONIBLE EN BODEGA:
${productosEnStock.map((p: any) => `- ${p.nombre} (categoría: ${p.categoria}, stock: ${p.stock_actual} ${p.unidad}, mínimo: ${p.stock_minimo} ${p.unidad})`).join('\n')}

INSTRUCCIÓN OBLIGATORIA: Cuando el estante esté vacío o con poco stock, tu campo "recomendacion" DEBE sugerir ÚNICAMENTE productos de la lista anterior que tengan coherencia visual con lo que ves en el estante. Por ejemplo, si ves snacks o papas fritas, recomienda productos de snacks del inventario. Si ves bebidas, recomienda bebidas del inventario. NO recomiendes productos de categorías distintas a lo que ves. Usa los nombres EXACTOS del inventario.`
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
              text: `Eres un sistema experto en gestión de inventario retail. Analiza esta imagen con máximo detalle y precisión.${contextoInventario}

Responde SOLO con este JSON exacto, sin texto adicional:
{
  "status": "vacio", "con_producto" o "no_estante",
  "confidence": número entre 0 y 1,
  "nivel_llenado": número entre 0 y 100,
  "zonas_vacias": "descripción exacta de zonas vacías o 'Ninguna'",
  "productos_detectados": "lista de productos visibles con marca, color y categoría",
  "recomendacion": "recomendación SOLO con productos del inventario que sean coherentes con lo que ves",
  "urgencia": "ninguna", "baja", "media" o "alta",
  "description": "descripción objetiva del estado actual del estante"
}

Reglas estrictas:

SI la imagen NO muestra una estantería de tienda:
- status = "no_estante", urgencia = "ninguna"
- description = "La imagen no corresponde a una estantería de tienda"
- recomendacion = "Apuntar la cámara hacia un estante de productos"
- nivel_llenado = 0

SI el estante está VACÍO (nivel_llenado menor a 30%):
- status = "vacio", urgencia = "alta"
- recomendacion: usa SOLO productos del inventario que sean coherentes con lo que ves

SI el estante está MEDIO lleno (nivel_llenado entre 30% y 79%):
- status = "vacio", urgencia = "media" o "alta"
- recomendacion: indica qué productos del inventario faltan y dónde

SI el estante está LLENO (nivel_llenado 80% o más):
- status = "con_producto", urgencia = "ninguna" o "baja"
- recomendacion = "Sin recomendación, estante bien abastecido" o indicar desorden si lo hay`
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
            }
          ]
        }],
        temperature: 0.1,
        max_tokens: 600
      })
    })

    const data = await response.json()
    const rawText = data.choices?.[0]?.message?.content || ''

    if (!rawText || rawText.trim() === '') {
      throw new Error('Groq devolvió respuesta vacía')
    }

    const cleaned = rawText.replace(/```json|```/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)

    if (!jsonMatch) throw new Error('No se encontró JSON en la respuesta de Groq')

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