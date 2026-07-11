/** LLM プロバイダのデフォルト接続先 */
export const LLM_PROVIDER_DEFAULT_URLS = {
  ollama: 'http://127.0.0.1:11434',
  'openai-compat': 'http://127.0.0.1:1234',
} as const

/** 音声エンジン種別ごとのデフォルト URL */
export const VOICE_ENGINE_DEFAULT_URLS = {
  voicevox: 'http://127.0.0.1:50021',
  aivisspeech: 'http://127.0.0.1:10101',
  coeiroink: 'http://127.0.0.1:50032',
} as const
