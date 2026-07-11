import type { AppSettings, VoiceEngineKind } from '../../shared/settings'
import type { VoiceEngine } from './types'
import { VoicevoxCompatEngine } from './voicevoxCompat'

/** エンジン種別ごとのデフォルト URL */
export const VOICE_ENGINE_DEFAULT_URLS: Record<
  Exclude<VoiceEngineKind, 'custom'>,
  string
> = {
  voicevox: 'http://127.0.0.1:50021',
  aivisspeech: 'http://127.0.0.1:10101',
  coeiroink: 'http://127.0.0.1:50032',
}

export function createVoiceEngine(
  settings: AppSettings['voice'],
): VoiceEngine {
  return new VoicevoxCompatEngine({ baseUrl: settings.baseUrl })
}
