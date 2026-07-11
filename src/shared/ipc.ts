/** IPCチャンネル名とペイロード型の定義 */

import type { AppSettings } from './settings'

export const IpcChannels = {
  mascotSetPosition: 'mascot:setPosition',
  mascotSetIgnoreMouseEvents: 'mascot:setIgnoreMouseEvents',
  chatSend: 'chat:send',
  chatInterrupt: 'chat:interrupt',
  speechSegment: 'speech:segment',
  speechEnd: 'speech:end',
  stateThinking: 'state:thinking',
  stateError: 'state:error',
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
} as const

export type MascotSetPositionPayload = {
  x: number
  y: number
}

export type MascotSetIgnoreMouseEventsPayload = {
  ignore: boolean
  /** 透過中も mousemove を受け取る */
  forward?: boolean
}

export type ChatSendPayload = {
  text: string
}

export type SpeechSegmentPayload = {
  text: string
  /** フェーズ3以降で WAV。フェーズ2は未使用 */
  wav?: ArrayBuffer
  emotion: string
}

export type StateThinkingPayload = {
  thinking: boolean
}

export type StateErrorPayload = {
  message: string | null
}

export type SettingsSetPayload = {
  /** 部分更新（深いマージは呼び出し側で行う） */
  patch: DeepPartial<AppSettings>
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

/** レンダラから preload 経由で公開する API */
export type UkagaApi = {
  setPosition: (payload: MascotSetPositionPayload) => void
  setIgnoreMouseEvents: (payload: MascotSetIgnoreMouseEventsPayload) => void
  sendChat: (payload: ChatSendPayload) => void
  interruptChat: () => void
  getSettings: () => Promise<AppSettings>
  setSettings: (payload: SettingsSetPayload) => Promise<AppSettings>
  onSpeechSegment: (handler: (payload: SpeechSegmentPayload) => void) => () => void
  onSpeechEnd: (handler: () => void) => () => void
  onThinking: (handler: (payload: StateThinkingPayload) => void) => () => void
  onError: (handler: (payload: StateErrorPayload) => void) => () => void
}
