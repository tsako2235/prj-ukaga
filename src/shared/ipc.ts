/** IPCチャンネル名とペイロード型の定義 */

import type { AppSettings } from './settings'

export type ModelInfo = {
  id: string
  name: string
}

export type SpeakerInfo = {
  id: number
  name: string
  styleName: string
}

export const IpcChannels = {
  mascotSetPosition: 'mascot:setPosition',
  mascotSetIgnoreMouseEvents: 'mascot:setIgnoreMouseEvents',
  mascotReloadCharacter: 'mascot:reloadCharacter',
  mascotEnsureWindowSize: 'mascot:ensureWindowSize',
  mascotHighlight: 'mascot:highlight',
  chatSend: 'chat:send',
  chatInterrupt: 'chat:interrupt',
  speechSegment: 'speech:segment',
  speechEnd: 'speech:end',
  stateThinking: 'state:thinking',
  stateError: 'state:error',
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  settingsChanged: 'settings:changed',
  personaGet: 'persona:get',
  personaSet: 'persona:set',
  personaReset: 'persona:reset',
  personaChanged: 'persona:changed',
  llmListModels: 'llm:listModels',
  llmHealthCheck: 'llm:healthCheck',
  voiceListSpeakers: 'voice:listSpeakers',
  voiceHealthCheck: 'voice:healthCheck',
  voiceTestPlay: 'voice:testPlay',
  characterPickModel: 'character:pickModel',
  adminOpen: 'admin:open',
  setupOpen: 'setup:open',
  onboardingGet: 'onboarding:get',
  onboardingComplete: 'onboarding:complete',
  shellOpenExternal: 'shell:openExternal',
} as const

export type OnboardingStatePayload = {
  completedFirstRun: boolean
}

export type OpenExternalPayload = {
  url: string
}

export type MascotSetPositionPayload = {
  x: number
  y: number
}

export type MascotSetIgnoreMouseEventsPayload = {
  ignore: boolean
  forward?: boolean
}

export type MascotReloadCharacterPayload = {
  modelPath?: string
  scale?: number
}

/** キャラが収まるようウィンドウの最低サイズを要求する（拡大のみ・縮小しない） */
export type MascotEnsureWindowSizePayload = {
  width: number
  height: number
}

export type ChatSendPayload = {
  text: string
}

export type SpeechSegmentPayload = {
  text: string
  wav?: ArrayBuffer
  emotion: string
}

export type StateThinkingPayload = {
  thinking: boolean
}

export type StateErrorPayload = {
  message: string | null
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

export type SettingsSetPayload = {
  patch: DeepPartial<AppSettings>
}

export type HealthCheckResult = {
  ok: boolean
  detail?: string
}

export type PersonaSetPayload = {
  content: string
}

export type VoiceTestPlayPayload = {
  text?: string
}

/** レンダラから preload 経由で公開する API */
export type UkagaApi = {
  setPosition: (payload: MascotSetPositionPayload) => void
  setIgnoreMouseEvents: (payload: MascotSetIgnoreMouseEventsPayload) => void
  ensureWindowSize: (payload: MascotEnsureWindowSizePayload) => void
  setMascotHighlight: (payload: { highlight: boolean }) => void
  sendChat: (payload: ChatSendPayload) => void
  interruptChat: () => void
  getSettings: () => Promise<AppSettings>
  setSettings: (payload: SettingsSetPayload) => Promise<AppSettings>
  getPersona: () => Promise<string>
  setPersona: (payload: PersonaSetPayload) => Promise<string>
  resetPersona: () => Promise<string>
  listLlmModels: () => Promise<ModelInfo[]>
  healthCheckLlm: () => Promise<HealthCheckResult>
  listVoiceSpeakers: () => Promise<SpeakerInfo[]>
  healthCheckVoice: () => Promise<HealthCheckResult>
  testPlayVoice: (
    payload?: VoiceTestPlayPayload,
  ) => Promise<HealthCheckResult & { wav?: ArrayBuffer }>
  pickCharacterModel: () => Promise<string | null>
  openAdmin: () => void
  openSetup: () => void
  getOnboarding: () => Promise<OnboardingStatePayload>
  completeFirstRun: () => Promise<OnboardingStatePayload>
  openExternal: (url: string) => Promise<void>
  onSpeechSegment: (
    handler: (payload: SpeechSegmentPayload) => void,
  ) => () => void
  onSpeechEnd: (handler: () => void) => () => void
  onThinking: (handler: (payload: StateThinkingPayload) => void) => () => void
  onError: (handler: (payload: StateErrorPayload) => void) => () => void
  onSettingsChanged: (handler: (settings: AppSettings) => void) => () => void
  onPersonaChanged: (handler: (content: string) => void) => () => void
  onReloadCharacter: (
    handler: (payload: MascotReloadCharacterPayload) => void,
  ) => () => void
  onMascotHighlight: (
    handler: (payload: { highlight: boolean }) => void,
  ) => () => void
}
