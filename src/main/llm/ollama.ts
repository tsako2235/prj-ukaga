import type {
  ChatMessage,
  ChatOptions,
  LLMProvider,
  ModelInfo,
} from './types'

export type OllamaProviderOptions = {
  baseUrl: string
}

/**
 * Ollama ネイティブ API プロバイダ
 * GET /api/tags, POST /api/chat (NDJSON stream)
 */
export class OllamaProvider implements LLMProvider {
  private readonly baseUrl: string

  constructor(options: OllamaProviderOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
  }

  async listModels(): Promise<ModelInfo[]> {
    const res = await fetch(`${this.baseUrl}/api/tags`)
    if (!res.ok) {
      throw new Error(`Ollama モデル一覧の取得に失敗しました (${res.status})`)
    }
    const data = (await res.json()) as {
      models?: Array<{ name: string; model?: string }>
    }
    return (data.models ?? []).map((m) => ({
      id: m.name,
      name: m.name,
    }))
  }

  async *chatStream(
    messages: ChatMessage[],
    options: ChatOptions,
  ): AsyncIterable<string> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model,
        messages,
        stream: true,
        options: { temperature: options.temperature },
      }),
      signal: options.signal,
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(
        `Ollama への接続に失敗しました (${res.status})${body ? `: ${body}` : ''}`,
      )
    }
    if (!res.body) {
      throw new Error('Ollama からストリーム本文を受け取れませんでした')
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        let parsed: {
          message?: { content?: string }
          done?: boolean
          error?: string
        }
        try {
          parsed = JSON.parse(trimmed) as typeof parsed
        } catch {
          continue
        }
        if (parsed.error) {
          throw new Error(`Ollama エラー: ${parsed.error}`)
        }
        const token = parsed.message?.content
        if (token) yield token
      }
    }

    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer.trim()) as {
          message?: { content?: string }
        }
        if (parsed.message?.content) yield parsed.message.content
      } catch {
        // 末尾の不完全行は無視
      }
    }
  }

  async healthCheck(): Promise<{ ok: boolean; detail?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) {
        return {
          ok: false,
          detail: `Ollama が応答しましたがエラーです (${res.status})`,
        }
      }
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        detail: `Ollamaが起動していません (${this.baseUrl}): ${String(error)}`,
      }
    }
  }
}
