export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

export interface ChatOptions {
  model: string
  temperature: number
  signal?: AbortSignal
}

export interface ModelInfo {
  id: string
  name: string
}

export interface LLMProvider {
  /** 利用可能なモデル一覧(管理画面のセレクトボックス用) */
  listModels(): Promise<ModelInfo[]>
  /** ストリーミングチャット。トークンを順次yieldする */
  chatStream(
    messages: ChatMessage[],
    options: ChatOptions,
  ): AsyncIterable<string>
  /** 接続確認(管理画面の「接続テスト」ボタン用) */
  healthCheck(): Promise<{ ok: boolean; detail?: string }>
}
