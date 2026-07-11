import type { AppSettings, LlmProviderKind } from '../../shared/settings'
import { OllamaProvider } from './ollama'
import { OpenAICompatProvider } from './openaiCompat'
import type { LLMProvider } from './types'

export function createLLMProvider(settings: AppSettings['llm']): LLMProvider {
  return createLLMProviderByKind(settings.provider, settings)
}

export function createLLMProviderByKind(
  kind: LlmProviderKind,
  settings: AppSettings['llm'],
): LLMProvider {
  if (kind === 'ollama') {
    return new OllamaProvider({ baseUrl: settings.baseUrl })
  }
  return new OpenAICompatProvider({
    baseUrl: settings.baseUrl,
    apiKey: settings.apiKey,
  })
}
