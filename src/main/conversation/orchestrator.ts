import type { BrowserWindow } from 'electron'
import { IpcChannels } from '../../shared/ipc'
import type { SpeechSegmentPayload } from '../../shared/ipc'
import type { AppSettings } from '../../shared/settings'
import { createLLMProvider } from '../llm/factory'
import type { ChatMessage, LLMProvider } from '../llm/types'
import { parseEmotion } from './emotionParser'
import type { PromptLoader } from './promptLoader'
import { SentenceSplitter } from './sentenceSplitter'

export type OrchestratorDeps = {
  getSettings: () => AppSettings
  promptLoader: PromptLoader
  getMascotWindow: () => BrowserWindow | null
}

/**
 * 会話オーケストレータ
 * LLM ストリーム → 文分割 → 感情タグ抽出 → speech:segment 送信
 * （TTS はフェーズ3。ここではテキストのみ push）
 */
export class ConversationOrchestrator {
  private history: ChatMessage[] = []
  private abortController: AbortController | null = null
  private busy = false

  constructor(private readonly deps: OrchestratorDeps) {}

  isBusy(): boolean {
    return this.busy
  }

  interrupt(): void {
    this.abortController?.abort()
    this.abortController = null
    this.busy = false
    this.sendThinking(false)
  }

  async sendUserMessage(text: string): Promise<void> {
    const trimmed = text.trim()
    if (!trimmed) return

    // 新しい入力で進行中の生成を中断
    this.interrupt()

    const settings = this.deps.getSettings()
    const provider = createLLMProvider(settings.llm)
    const system = this.deps.promptLoader.buildSystemPrompt({
      name: settings.character.name,
    })

    this.history.push({ role: 'user', content: trimmed })
    this.trimHistory(settings.llm.contextLimit)

    const messages: ChatMessage[] = [
      { role: 'system', content: system },
      ...this.history,
    ]

    this.busy = true
    this.sendError(null)
    this.sendThinking(true)

    const controller = new AbortController()
    this.abortController = controller
    const splitter = new SentenceSplitter()
    let assistantText = ''

    try {
      await this.streamAndEmit(provider, messages, settings, splitter, controller, (token) => {
        assistantText += token
      })

      const rest = splitter.flush()
      if (rest && !controller.signal.aborted) {
        this.emitSegment(rest)
      }

      if (assistantText.trim() && !controller.signal.aborted) {
        this.history.push({ role: 'assistant', content: assistantText.trim() })
        this.trimHistory(settings.llm.contextLimit)
      }

      if (!controller.signal.aborted) {
        this.sendToRenderer(IpcChannels.speechEnd, undefined)
      }
    } catch (error) {
      if (controller.signal.aborted) return
      const message = formatLlmError(error, settings.llm.baseUrl)
      this.sendError(message)
      console.error('[orchestrator]', error)
    } finally {
      if (this.abortController === controller) {
        this.abortController = null
        this.busy = false
        this.sendThinking(false)
      }
    }
  }

  private async streamAndEmit(
    provider: LLMProvider,
    messages: ChatMessage[],
    settings: AppSettings,
    splitter: SentenceSplitter,
    controller: AbortController,
    onToken: (token: string) => void,
  ): Promise<void> {
    for await (const token of provider.chatStream(messages, {
      model: settings.llm.model,
      temperature: settings.llm.temperature,
      signal: controller.signal,
    })) {
      if (controller.signal.aborted) return
      onToken(token)
      const sentences = splitter.push(token)
      for (const sentence of sentences) {
        this.emitSegment(sentence)
      }
    }
  }

  private emitSegment(sentence: string): void {
    const { emotion, text } = parseEmotion(sentence)
    if (!text) return
    const payload: SpeechSegmentPayload = { text, emotion }
    this.sendToRenderer(IpcChannels.speechSegment, payload)
  }

  private trimHistory(contextLimit: number): void {
    // 往復数 = user+assistant のペア。直近 contextLimit 往復を残す
    const maxMessages = Math.max(1, contextLimit) * 2
    if (this.history.length > maxMessages) {
      this.history = this.history.slice(-maxMessages)
    }
  }

  private sendThinking(thinking: boolean): void {
    this.sendToRenderer(IpcChannels.stateThinking, { thinking })
  }

  private sendError(message: string | null): void {
    this.sendToRenderer(IpcChannels.stateError, { message })
  }

  private sendToRenderer(channel: string, payload: unknown): void {
    const win = this.deps.getMascotWindow()
    if (!win || win.isDestroyed()) return
    win.webContents.send(channel, payload)
  }
}

function formatLlmError(error: unknown, baseUrl: string): string {
  const raw = String(error)
  if (
    raw.includes('fetch failed') ||
    raw.includes('ECONNREFUSED') ||
    raw.includes('AbortError')
  ) {
    return `LLM に接続できません。Ollama 等が ${baseUrl} で起動しているか確認してください。`
  }
  return `会話中にエラーが発生しました: ${raw}`
}
