import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { OllamaProvider } from '../src/main/llm/ollama'
import { OpenAICompatProvider } from '../src/main/llm/openaiCompat'

function streamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })
  return new Response(stream, { status: 200 })
}

describe('OllamaProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('listModels は /api/tags を呼ぶ', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ models: [{ name: 'qwen3:8b' }] }),
        { status: 200 },
      ),
    )
    const provider = new OllamaProvider({ baseUrl: 'http://127.0.0.1:11434' })
    const models = await provider.listModels()
    expect(models).toEqual([{ id: 'qwen3:8b', name: 'qwen3:8b' }])
    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:11434/api/tags')
  })

  it('chatStream は NDJSON トークンを yield する', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      streamResponse([
        JSON.stringify({ message: { content: 'こん' } }) + '\n',
        JSON.stringify({ message: { content: 'にちは' }, done: true }) + '\n',
      ]),
    )
    const provider = new OllamaProvider({ baseUrl: 'http://127.0.0.1:11434' })
    const tokens: string[] = []
    for await (const t of provider.chatStream(
      [{ role: 'user', content: 'hi' }],
      { model: 'qwen3:8b', temperature: 0.7 },
    )) {
      tokens.push(t)
    }
    expect(tokens.join('')).toBe('こんにちは')
  })

  it('healthCheck 失敗時は分かりやすい detail を返す', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('ECONNREFUSED'))
    const provider = new OllamaProvider({ baseUrl: 'http://127.0.0.1:11434' })
    const result = await provider.healthCheck()
    expect(result.ok).toBe(false)
    expect(result.detail).toContain('Ollamaが起動していません')
  })
})

describe('OpenAICompatProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('chatStream は SSE data 行からトークンを yield する', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      streamResponse([
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"!"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    )
    const provider = new OpenAICompatProvider({
      baseUrl: 'http://127.0.0.1:1234',
    })
    const tokens: string[] = []
    for await (const t of provider.chatStream(
      [{ role: 'user', content: 'hi' }],
      { model: 'local', temperature: 0.5 },
    )) {
      tokens.push(t)
    }
    expect(tokens.join('')).toBe('Hello!')
  })

  it('apiKey があるとき Authorization ヘッダを付ける', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [] }), { status: 200 }),
    )
    const provider = new OpenAICompatProvider({
      baseUrl: 'http://127.0.0.1:1234',
      apiKey: 'secret',
    })
    await provider.listModels()
    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:1234/v1/models',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer secret',
        }),
      }),
    )
  })
})
