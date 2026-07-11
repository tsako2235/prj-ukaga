import { contextBridge, ipcRenderer } from 'electron'
import {
  IpcChannels,
  type ChatSendPayload,
  type HealthCheckResult,
  type MascotReloadCharacterPayload,
  type MascotSetIgnoreMouseEventsPayload,
  type MascotSetPositionPayload,
  type ModelInfo,
  type PersonaSetPayload,
  type SettingsSetPayload,
  type SpeakerInfo,
  type SpeechSegmentPayload,
  type StateErrorPayload,
  type StateThinkingPayload,
  type UkagaApi,
  type VoiceTestPlayPayload,
} from '../shared/ipc'
import type { AppSettings } from '../shared/settings'

function subscribe<T>(
  channel: string,
  handler: (payload: T) => void,
): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: T) => {
    handler(payload)
  }
  ipcRenderer.on(channel, listener)
  return () => {
    ipcRenderer.removeListener(channel, listener)
  }
}

const api: UkagaApi = {
  setPosition: (payload: MascotSetPositionPayload) => {
    ipcRenderer.send(IpcChannels.mascotSetPosition, payload)
  },
  setIgnoreMouseEvents: (payload: MascotSetIgnoreMouseEventsPayload) => {
    ipcRenderer.send(IpcChannels.mascotSetIgnoreMouseEvents, payload)
  },
  sendChat: (payload: ChatSendPayload) => {
    ipcRenderer.send(IpcChannels.chatSend, payload)
  },
  interruptChat: () => {
    ipcRenderer.send(IpcChannels.chatInterrupt)
  },
  getSettings: () =>
    ipcRenderer.invoke(IpcChannels.settingsGet) as Promise<AppSettings>,
  setSettings: (payload: SettingsSetPayload) =>
    ipcRenderer.invoke(
      IpcChannels.settingsSet,
      payload,
    ) as Promise<AppSettings>,
  getPersona: () =>
    ipcRenderer.invoke(IpcChannels.personaGet) as Promise<string>,
  setPersona: (payload: PersonaSetPayload) =>
    ipcRenderer.invoke(IpcChannels.personaSet, payload) as Promise<string>,
  resetPersona: () =>
    ipcRenderer.invoke(IpcChannels.personaReset) as Promise<string>,
  listLlmModels: () =>
    ipcRenderer.invoke(IpcChannels.llmListModels) as Promise<ModelInfo[]>,
  healthCheckLlm: () =>
    ipcRenderer.invoke(
      IpcChannels.llmHealthCheck,
    ) as Promise<HealthCheckResult>,
  listVoiceSpeakers: () =>
    ipcRenderer.invoke(
      IpcChannels.voiceListSpeakers,
    ) as Promise<SpeakerInfo[]>,
  healthCheckVoice: () =>
    ipcRenderer.invoke(
      IpcChannels.voiceHealthCheck,
    ) as Promise<HealthCheckResult>,
  testPlayVoice: (payload?: VoiceTestPlayPayload) =>
    ipcRenderer.invoke(
      IpcChannels.voiceTestPlay,
      payload ?? {},
    ) as Promise<HealthCheckResult & { wav?: ArrayBuffer }>,
  pickCharacterModel: () =>
    ipcRenderer.invoke(IpcChannels.characterPickModel) as Promise<string | null>,
  openAdmin: () => {
    ipcRenderer.send(IpcChannels.adminOpen)
  },
  onSpeechSegment: (handler) =>
    subscribe<SpeechSegmentPayload>(IpcChannels.speechSegment, handler),
  onSpeechEnd: (handler) =>
    subscribe<undefined>(IpcChannels.speechEnd, () => handler()),
  onThinking: (handler) =>
    subscribe<StateThinkingPayload>(IpcChannels.stateThinking, handler),
  onError: (handler) =>
    subscribe<StateErrorPayload>(IpcChannels.stateError, handler),
  onSettingsChanged: (handler) =>
    subscribe<AppSettings>(IpcChannels.settingsChanged, handler),
  onPersonaChanged: (handler) =>
    subscribe<string>(IpcChannels.personaChanged, handler),
  onReloadCharacter: (handler) =>
    subscribe<MascotReloadCharacterPayload>(
      IpcChannels.mascotReloadCharacter,
      handler,
    ),
}

contextBridge.exposeInMainWorld('ukaga', api)
