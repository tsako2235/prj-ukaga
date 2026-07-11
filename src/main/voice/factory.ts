import type { AppSettings } from '../../shared/settings'
import type { VoiceEngine } from './types'
import { VoicevoxCompatEngine } from './voicevoxCompat'

export function createVoiceEngine(
  settings: AppSettings['voice'],
): VoiceEngine {
  return new VoicevoxCompatEngine({ baseUrl: settings.baseUrl })
}
