import { contextBridge, ipcRenderer } from 'electron'
import {
  IpcChannels,
  type ChatSendPayload,
  type MascotSetIgnoreMouseEventsPayload,
  type MascotSetPositionPayload,
  type SettingsSetPayload,
  type SpeechSegmentPayload,
  type StateErrorPayload,
  type StateThinkingPayload,
  type UkagaApi,
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
    ipcRenderer.invoke(IpcChannels.settingsSet, payload) as Promise<AppSettings>,
  onSpeechSegment: (handler) =>
    subscribe<SpeechSegmentPayload>(IpcChannels.speechSegment, handler),
  onSpeechEnd: (handler) =>
    subscribe<undefined>(IpcChannels.speechEnd, () => handler()),
  onThinking: (handler) =>
    subscribe<StateThinkingPayload>(IpcChannels.stateThinking, handler),
  onError: (handler) =>
    subscribe<StateErrorPayload>(IpcChannels.stateError, handler),
}

contextBridge.exposeInMainWorld('ukaga', api)
