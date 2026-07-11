import type {
  ChatMessage,
  ChatOptions,
  LLMProvider,
  ModelInfo,
} from './types'

export type OpenAICompatProviderOptions = {
  baseUrl: string
  apiKey?: string
}

/**
 * OpenAI 互換 API プロバイダ
 * GET /v1/models, POST /v1/chat/completions (SSE)
 */
export class OpenAICompatProvider implements LLMProvider {
  private readonly baseUrl: string
  private readonly apiKey?: string

  constructor(options: OpenAICompatProviderOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
    this.apiKey = options.apiKey
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`
    }
    return headers
  }

  async listModels(): Promise<ModelInfo[]> {
    const res = await fetch(`${this.baseUrl}/v1/models`, {
      headers: this.headers(),
    })
    if (!res.ok) {
      throw new Error(
        `OpenAI互換 モデル一覧の取得に失敗しました (${res.status})`,
      )
    }
    const data = (await res.json()) as {
      data?: Array<{ id: string }>
    }
    return (data.data ?? []).map((m) => ({
      id: m.id,
      name: m.id,
    }))
  }

  async *chatStream(
    messages: ChatMessage[],
    options: ChatOptions,
  ): AsyncIterable<string> {
    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: options.model,
        messages,
        stream: true,
        temperature: options.temperature,
      }),
      signal: options.signal,
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(
        `OpenAI互換 API への接続に失敗しました (${res.status})${body ? `: ${body}` : ''}`,
      )
    }
    if (!res.body) {
      throw new Error('OpenAI互換 API からストリーム本文を受け取れませんでした')
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
        if (!trimmed || trimmed.startsWith(':')) continue
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') return

        let parsed: {
          choices?: Array<{ delta?: { content?: string } }>
          error?: { message?: string }
        }
        try {
          parsed = JSON.parse(data) as typeof parsed
        } catch {
          continue
        }
        if (parsed.error?.message) {
          throw new Error(`OpenAI互換 API エラー: ${parsed.error.message}`)
        }
        const token = parsed.choices?.[0]?.delta?.content
        if (token) yield token
      }
    }
  }

  async healthCheck(): Promise<{ ok: boolean; detail?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/v1/models`, {
        headers: this.headers(),
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) {
        return {
          ok: false,
          detail: `OpenAI互換サーバーが応答しましたがエラーです (${res.status})`,
        }
      }
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        detail: `OpenAI互換サーバーに接続できません (${this.baseUrl}): ${String(error)}`,
      }
    }
  }
}
