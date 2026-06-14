export interface AnalysisResult {
  status: 'vacio' | 'con_producto' | 'no_estante'
  confidence: number
  nivel_llenado: number
  zonas_vacias: string
  productos_detectados: string
  recomendacion: string
  urgencia: 'ninguna' | 'baja' | 'media' | 'alta'
  description: string
}

export interface ProductoStock {
  nombre: string
  categoria: string
  stock_actual: number
  stock_minimo: number
  unidad: string
}

export interface AIStrategy {
  analyze(imageBase64: string, productosEnStock?: ProductoStock[]): Promise<AnalysisResult>
  getName(): string
}