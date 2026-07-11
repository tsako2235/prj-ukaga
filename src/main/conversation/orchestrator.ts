import type { BrowserWindow } from 'electron'
import { IpcChannels } from '../../shared/ipc'
import type { SpeechSegmentPayload } from '../../shared/ipc'
import type { AppSettings } from '../../shared/settings'
import { createLLMProvider } from '../llm/factory'
import type { ChatMessage, LLMProvider } from '../llm/types'
import { createVoiceEngine } from '../voice/factory'
import type { VoiceEngine } from '../voice/types'
import { parseEmotion } from './emotionParser'
import type { PromptLoader } from './promptLoader'
import { SentenceSplitter } from './sentenceSplitter'

/** 最終対話からこの秒数以内はランダムトークをスキップ */
const RANDOM_TALK_COOLDOWN_SEC = 60

export type OrchestratorDeps = {
  getSettings: () => AppSettings
  promptLoader: PromptLoader
  getMascotWindow: () => BrowserWindow | null
}

/**
 * 会話オーケストレータ
 * LLM ストリーム → 文分割 → 感情タグ → TTS(先読み) → speech:segment
 */
export class ConversationOrchestrator {
  private history: ChatMessage[] = []
  private abortController: AbortController | null = null
  private busy = false
  private emitChain: Promise<void> = Promise.resolve()
  private ttsWarned = false
  private lastInteractionAt = 0

  constructor(private readonly deps: OrchestratorDeps) {}

  isBusy(): boolean {
    return this.busy
  }

  /** ランダムトーク可否（生成中・直近対話から60秒以内は不可） */
  canRandomTalk(): boolean {
    if (this.busy) return false
    const elapsed = (Date.now() - this.lastInteractionAt) / 1000
    return elapsed >= RANDOM_TALK_COOLDOWN_SEC
  }

  markInteraction(): void {
    this.lastInteractionAt = Date.now()
  }

  interrupt(): void {
    this.abortController?.abort()
    this.abortController = null
    this.busy = false
    this.emitChain = Promise.resolve()
    this.sendThinking(false)
    this.sendToRenderer(IpcChannels.speechEnd, undefined)
  }

  async sendUserMessage(text: string): Promise<void> {
    const trimmed = text.trim()
    if (!trimmed) return
    this.markInteraction()
    await this.runChat({
      userText: trimmed,
      addUserToHistory: true,
      randomTalk: false,
    })
  }

  /** ランダムトーク（システムプロンプトにバリエーションを足して一言生成） */
  async sendRandomTalk(): Promise<void> {
    if (!this.canRandomTalk()) return
    this.markInteraction()
    await this.runChat({
      userText: '（いまの気持ちを、短くひとりごとで言って）',
      addUserToHistory: false,
      randomTalk: true,
    })
  }

  private async runChat(options: {
    userText: string
    addUserToHistory: boolean
    randomTalk: boolean
  }): Promise<void> {
    this.interrupt()

    const settings = this.deps.getSettings()
    const provider = createLLMProvider(settings.llm)
    const voice = createVoiceEngine(settings.voice)
    const system = this.deps.promptLoader.buildSystemPrompt(
      { name: settings.character.name },
      { randomTalk: options.randomTalk },
    )

    if (options.addUserToHistory) {
      this.history.push({ role: 'user', content: options.userText })
      this.trimHistory(settings.llm.contextLimit)
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: system },
      ...this.history,
    ]

    if (!options.addUserToHistory) {
      messages.push({ role: 'user', content: options.userText })
    }

    this.busy = true
    this.ttsWarned = false
    this.sendError(null)
    this.sendThinking(true)

    const controller = new AbortController()
    this.abortController = controller
    const splitter = new SentenceSplitter()
    let assistantText = ''
    this.emitChain = Promise.resolve()

    try {
      await this.streamAndEmit(
        provider,
        voice,
        messages,
        settings,
        splitter,
        controller,
        (token) => {
          assistantText += token
        },
      )

      const rest = splitter.flush()
      if (rest && !controller.signal.aborted) {
        this.queueSegment(rest, settings, voice, controller)
      }

      await this.emitChain

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
      this.markInteraction()
    }
  }

  private async streamAndEmit(
    provider: LLMProvider,
    voice: VoiceEngine,
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
        this.queueSegment(sentence, settings, voice, controller)
      }
    }
  }

  private queueSegment(
    sentence: string,
    settings: AppSettings,
    voice: VoiceEngine,
    controller: AbortController,
  ): void {
    const { emotion, text } = parseEmotion(sentence)
    if (!text) return

    const synthPromise = this.synthesizeSafe(text, settings, voice)

    this.emitChain = this.emitChain.then(async () => {
      if (controller.signal.aborted) return
      const { wav, warning } = await synthPromise
      if (controller.signal.aborted) return
      if (warning && !this.ttsWarned) {
        this.ttsWarned = true
        this.sendError(warning)
      }
      const payload: SpeechSegmentPayload = {
        text,
        emotion,
        wav,
      }
      this.sendToRenderer(IpcChannels.speechSegment, payload)
    })
  }

  private async synthesizeSafe(
    text: string,
    settings: AppSettings,
    voice: VoiceEngine,
  ): Promise<{ wav?: ArrayBuffer; warning?: string }> {
    if (!settings.voice.enabled) {
      return {}
    }
    try {
      const wav = await voice.synthesize(text, {
        speakerId: settings.voice.speakerId,
        speedScale: settings.voice.speedScale,
        pitchScale: settings.voice.pitchScale,
        volumeScale: settings.voice.volumeScale,
      })
      return { wav }
    } catch (error) {
      console.warn('[orchestrator] TTS 失敗、テキストのみで継続:', error)
      return {
        warning: `音声合成に失敗したため、テキストのみで表示します（${settings.voice.baseUrl}）`,
      }
    }
  }

  private trimHistory(contextLimit: number): void {
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
