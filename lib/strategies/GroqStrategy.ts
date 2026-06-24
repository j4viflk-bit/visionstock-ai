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
              text: `Eres un experto en análisis visual de estantes de supermercado. Analiza esta imagen con precisión.${contextoInventario}

INSTRUCCIONES PARA CALCULAR nivel_llenado (sigue este método exacto, paso a paso):

PASO 0 - Selección del estante principal:
- Si la imagen muestra MÁS DE UN estante o góndola, identifica cuál es el más cercano y centrado en el encuadre (el protagonista de la foto)
- Analiza SOLO ese estante principal. Ignora estantes secundarios que aparezcan de fondo, en los bordes, o desenfocados
- Si la cámara está fija monitoreando un estante específico, ese será siempre el más grande y central en la imagen

PASO 1 - Conteo de filas:
- Cuenta cuántas filas/repisas horizontales tiene el estante principal, de arriba hacia abajo
- Incluye filas completamente vacías como una fila más (cuentan en el promedio)

PASO 2 - Evaluación de cada fila (CRITERIO DE PROFUNDIDAD, no solo frente):
- Una fila se considera LLENA (75-100%) si tiene productos visibles ocupando la mayoria del ancho, incluso si hay pequeños espacios entre paquetes individuales (eso es normal y NO cuenta como vacío)
- Una fila se considera PARCIAL (40-60%) si los productos solo cubren la mitad del ancho de la repisa, o si se ve claramente el fondo/respaldo de la repisa en una porcion significativa
- Una fila se considera VACÍA (0-20%) solo si se ve el respaldo o la base de la repisa sin productos en la gran mayoria de su ancho
- IMPORTANTE: pequeños huecos entre paquetes individuales de un mismo producto (por ejemplo bolsas de papas colgando con espacio entre ellas) NO deben contarse como zona vacía. Evalúa el conjunto de la fila, no cada centímetro

PASO 3 - Cálculo:
- Promedia el porcentaje de todas las filas del estante principal
- Redondea al múltiplo de 5 más cercano

PASO 4 - Verificación de coherencia:
- Si más de la mitad de las filas están en el rango LLENO (75-100%), el resultado final NO debería ser menor a 60%
- Si describes en "zonas_vacias" que el estante está "parcialmente lleno" o "con productos en su mayoria", el nivel_llenado debe ser coherente con esa descripcion (60% o más), no contradecirla con un numero bajo

Ejemplos:
- Estante con 4 filas: 3 llenas (90%) y 1 vacia (10%) = promedio 70%
- Estante con 5 filas: 1 vacia arriba (0%), 4 con bastante producto pero huecos al fondo (75% cada una) = promedio (0+75+75+75+75)/5 = 60%

Responde SOLO con JSON válido sin texto adicional:
{"status":"vacio|con_producto|no_estante","confidence":0.9,"nivel_llenado":50,"zonas_vacias":"descripción","productos_detectados":"descripción","recomendacion":"texto","urgencia":"ninguna|baja|media|alta","description":"descripción"}

Reglas de clasificación:
- Si NO es estante de tienda: status=no_estante, nivel_llenado=0, urgencia=ninguna
- Si nivel_llenado < 80%: status=vacio
  - nivel_llenado entre 60% y 79%: urgencia=baja
  - nivel_llenado entre 30% y 59%: urgencia=media
  - nivel_llenado menor a 30%: urgencia=alta
- Si nivel_llenado >= 80%: status=con_producto, urgencia=ninguna`
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
            }
          ]
        }],
        temperature: 0,
        top_p: 0.1,
        seed: 42,
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