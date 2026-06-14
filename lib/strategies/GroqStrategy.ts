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
    
    // Construir contexto de inventario si hay productos
    let contextoInventario = ''
    if (productosEnStock && productosEnStock.length > 0) {
      const disponibles = productosEnStock.filter(p => p.stock_actual > p.stock_minimo)
      const bajoStock = productosEnStock.filter(p => p.stock_actual <= p.stock_minimo)
      
      if (disponibles.length > 0) {
        contextoInventario += `\n\nPRODUCTOS DISPONIBLES EN BODEGA (con stock suficiente):\n`
        contextoInventario += disponibles.map(p => `- ${p.nombre} (${p.categoria}): ${p.stock_actual} ${p.unidad} disponibles`).join('\n')
      }
      
      if (bajoStock.length > 0) {
        contextoInventario += `\n\nPRODUCTOS CON STOCK BAJO (menos del mínimo):\n`
        contextoInventario += bajoStock.map(p => `- ${p.nombre}: solo ${p.stock_actual} ${p.unidad} (mínimo: ${p.stock_minimo})`).join('\n')
      }
      
      contextoInventario += `\n\nIMPORTANTE: Tus recomendaciones deben priorizar productos disponibles en bodega. Si hay productos con stock bajo, mencionarlo como urgente.`
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
  "recomendacion": "recomendación específica usando los productos disponibles en bodega",
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
- En recomendacion menciona específicamente qué productos del inventario reponer

SI el estante está MEDIO lleno (nivel_llenado entre 30% y 79%):
- status = "vacio", urgencia = "media" o "alta"
- En recomendacion indica qué productos del inventario faltan y dónde colocarlos

SI el estante está LLENO (nivel_llenado 80% o más):
- status = "con_producto", urgencia = "ninguna" o "baja"
- Si todo está en orden: recomendacion = "Sin recomendación, estante bien abastecido"
- Si hay desorden: recomendacion = "Ordenar productos en zona X"

SIEMPRE usa los productos del inventario disponible en tus recomendaciones cuando estén presentes.`
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