import { AIStrategy, AnalysisResult, ProductoStock } from './AIStrategy'
import { GroqStrategy } from './GroqStrategy'

export class AIAnalyzer {
  private strategy: AIStrategy

  constructor(strategy?: AIStrategy) {
    this.strategy = strategy || new GroqStrategy()
  }

  setStrategy(strategy: AIStrategy): void {
    this.strategy = strategy
  }

  getStrategyName(): string {
    return this.strategy.getName()
  }

  async analyze(imageBase64: string, productosEnStock?: ProductoStock[]): Promise<AnalysisResult> {
    console.log(`Usando estrategia: ${this.strategy.getName()}`)
    return await this.strategy.analyze(imageBase64, productosEnStock)
  }
}