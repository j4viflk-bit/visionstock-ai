// Contexto del patrón Strategy
// Permite cambiar el proveedor de IA en tiempo de ejecución

import { AIStrategy, AnalysisResult } from './AIStrategy'
import { GroqStrategy } from './GroqStrategy'

export class AIAnalyzer {
  private strategy: AIStrategy

  constructor(strategy?: AIStrategy) {
    // Por defecto usa Groq, pero puede recibir cualquier estrategia
    this.strategy = strategy || new GroqStrategy()
  }

  // Permite cambiar la estrategia en tiempo de ejecución
  setStrategy(strategy: AIStrategy): void {
    this.strategy = strategy
  }

  getStrategyName(): string {
    return this.strategy.getName()
  }

  async analyze(imageBase64: string): Promise<AnalysisResult> {
    console.log(`Usando estrategia: ${this.strategy.getName()}`)
    return await this.strategy.analyze(imageBase64)
  }
}