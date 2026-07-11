/** アプリ設定スキーマ（electron-store） */

export type LlmProviderKind = 'ollama' | 'openai-compat'
export type VoiceEngineKind = 'voicevox' | 'aivisspeech' | 'coeiroink' | 'custom'

export interface AppSettings {
  llm: {
    provider: LlmProviderKind
    baseUrl: string
    model: string
    apiKey?: string
    temperature: number
    contextLimit: number
  }
  voice: {
    enabled: boolean
    engine: VoiceEngineKind
    baseUrl: string
    speakerId: number
    speedScale: number
    pitchScale: number
    volumeScale: number
  }
  character: {
    name: string
    modelPath: string
    scale: number
    emotionMap: Record<string, string>
  }
  behavior: {
    randomTalk: boolean
    randomTalkIntervalMinSec: number
    randomTalkIntervalMaxSec: number
    alwaysOnTop: boolean
    openAtLogin: boolean
  }
  debug: {
    /** ON のときバルーンに感情タグ（[happy] 等）を表示する */
    enabled: boolean
  }
  /** マスコットウィンドウ内の吹き出し位置（px） */
  balloon: {
    x: number
    y: number
  }
  window: {
    x?: number
    y?: number
    width: number
    height: number
  }
}

export const DEFAULT_SETTINGS: AppSettings = {
  llm: {
    provider: 'ollama',
    baseUrl: 'http://localhost:11434/v1',
    model: 'gemma4:e4b',
    temperature: 0.7,
    contextLimit: 8,
  },
  voice: {
    enabled: true,
    engine: 'voicevox',
    baseUrl: 'http://127.0.0.1:50021',
    /** 春日部つむぎ（ノーマル） */
    speakerId: 8,
    speedScale: 1,
    pitchScale: 0,
    volumeScale: 1,
  },
  character: {
    name: 'つむぎ',
    modelPath: '',
    scale: 1,
    emotionMap: {
      neutral: '',
      happy: 'kira',
      sad: 'tear',
      angry: 'shock',
      surprised: 'blush',
    },
  },
  behavior: {
    randomTalk: false,
    randomTalkIntervalMinSec: 180,
    randomTalkIntervalMaxSec: 600,
    alwaysOnTop: true,
    openAtLogin: false,
  },
  debug: {
    enabled: false,
  },
  balloon: {
    x: 12,
    y: 12,
  },
  window: {
    width: 420,
    height: 880,
  },
}
