import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  Tray,
} from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import { ConversationOrchestrator } from './conversation/orchestrator'
import {
  createDefaultPromptLoader,
  type PromptLoader,
} from './conversation/promptLoader'
import { RandomTalkScheduler } from './conversation/randomTalk'
import { createLLMProvider } from './llm/factory'
import { getSettings, setSettings } from './settings/store'
import { createVoiceEngine } from './voice/factory'
import { IpcChannels } from '../shared/ipc'
import type {
  ChatSendPayload,
  MascotSetIgnoreMouseEventsPayload,
  MascotSetPositionPayload,
  PersonaSetPayload,
  SettingsSetPayload,
  VoiceTestPlayPayload,
} from '../shared/ipc'
import type { AppSettings } from '../shared/settings'
import { createAdminWindow, getAdminWindow } from './windows/adminWindow'
import { createMascotWindow } from './windows/mascotWindow'

let mascotWindow: BrowserWindow | null = null
let tray: Tray | null = null
let orchestrator: ConversationOrchestrator | null = null
let promptLoader: PromptLoader | null = null
let randomTalk: RandomTalkScheduler | null = null

function resolveResource(...parts: string[]): string {
  if (!app.isPackaged) {
    return join(process.cwd(), 'resources', ...parts)
  }
  return join(process.resourcesPath, ...parts)
}

function broadcastSettings(settings: AppSettings): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(IpcChannels.settingsChanged, settings)
    }
  }
}

function applyBehaviorSettings(settings: AppSettings): void {
  if (mascotWindow && !mascotWindow.isDestroyed()) {
    const onTop = settings.behavior.alwaysOnTop
    if (process.platform === 'darwin') {
      mascotWindow.setAlwaysOnTop(onTop, 'floating')
    } else if (process.platform === 'win32') {
      mascotWindow.setAlwaysOnTop(onTop, onTop ? 'screen-saver' : 'normal')
    } else {
      mascotWindow.setAlwaysOnTop(onTop)
    }
  }

  app.setLoginItemSettings({
    openAtLogin: settings.behavior.openAtLogin,
  })
}

function notifyMascotReload(settings: AppSettings): void {
  if (!mascotWindow || mascotWindow.isDestroyed()) return
  mascotWindow.webContents.send(IpcChannels.mascotReloadCharacter, {
    modelPath: settings.character.modelPath || undefined,
    scale: settings.character.scale,
  })
}

function registerIpcHandlers(): void {
  ipcMain.on(
    IpcChannels.mascotSetPosition,
    (_event, payload: MascotSetPositionPayload) => {
      if (!mascotWindow || mascotWindow.isDestroyed()) return
      mascotWindow.setPosition(Math.round(payload.x), Math.round(payload.y))
    },
  )

  ipcMain.on(
    IpcChannels.mascotSetIgnoreMouseEvents,
    (_event, payload: MascotSetIgnoreMouseEventsPayload) => {
      if (!mascotWindow || mascotWindow.isDestroyed()) return
      if (payload.ignore) {
        mascotWindow.setIgnoreMouseEvents(true, {
          forward: payload.forward ?? true,
        })
      } else {
        mascotWindow.setIgnoreMouseEvents(false)
      }
    },
  )

  ipcMain.on(IpcChannels.chatSend, (_event, payload: ChatSendPayload) => {
    void orchestrator?.sendUserMessage(payload.text)
  })

  ipcMain.on(IpcChannels.chatInterrupt, () => {
    orchestrator?.interrupt()
  })

  ipcMain.on(IpcChannels.adminOpen, () => {
    createAdminWindow()
  })

  ipcMain.handle(IpcChannels.settingsGet, () => getSettings())

  ipcMain.handle(
    IpcChannels.settingsSet,
    (_event, payload: SettingsSetPayload) => {
      const prev = getSettings()
      const next = setSettings(payload.patch)
      applyBehaviorSettings(next)
      broadcastSettings(next)
      randomTalk?.reschedule()

      const modelChanged =
        prev.character.modelPath !== next.character.modelPath ||
        prev.character.scale !== next.character.scale
      if (modelChanged) {
        notifyMascotReload(next)
      }
      return next
    },
  )

  ipcMain.handle(IpcChannels.personaGet, () => promptLoader?.getPersona() ?? '')

  ipcMain.handle(
    IpcChannels.personaSet,
    (_event, payload: PersonaSetPayload) => {
      promptLoader?.setPersona(payload.content)
      return promptLoader?.getPersona() ?? ''
    },
  )

  ipcMain.handle(IpcChannels.personaReset, () => {
    return promptLoader?.resetPersona() ?? ''
  })

  ipcMain.handle(IpcChannels.llmListModels, async () => {
    const provider = createLLMProvider(getSettings().llm)
    return provider.listModels()
  })

  ipcMain.handle(IpcChannels.llmHealthCheck, async () => {
    const provider = createLLMProvider(getSettings().llm)
    return provider.healthCheck()
  })

  ipcMain.handle(IpcChannels.voiceListSpeakers, async () => {
    const engine = createVoiceEngine(getSettings().voice)
    return engine.listSpeakers()
  })

  ipcMain.handle(IpcChannels.voiceHealthCheck, async () => {
    const engine = createVoiceEngine(getSettings().voice)
    return engine.healthCheck()
  })

  ipcMain.handle(
    IpcChannels.voiceTestPlay,
    async (_event, payload: VoiceTestPlayPayload = {}) => {
      const settings = getSettings().voice
      const engine = createVoiceEngine(settings)
      const text = payload.text?.trim() || 'これはテスト再生です。こんにちは。'
      try {
        const wav = await engine.synthesize(text, {
          speakerId: settings.speakerId,
          speedScale: settings.speedScale,
          pitchScale: settings.pitchScale,
          volumeScale: settings.volumeScale,
        })
        return { ok: true as const, wav }
      } catch (error) {
        return {
          ok: false as const,
          detail: `テスト再生に失敗しました: ${String(error)}`,
        }
      }
    },
  )

  ipcMain.handle(IpcChannels.characterPickModel, async () => {
    const parent = getAdminWindow()
    const options: Electron.OpenDialogOptions = {
      title: 'Live2D モデルを選択',
      properties: ['openFile'],
      filters: [
        { name: 'Live2D Model (*.model3.json)', extensions: ['json'] },
        { name: 'すべて', extensions: ['*'] },
      ],
    }
    const result = parent
      ? await dialog.showOpenDialog(parent, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return null
    const modelPath = result.filePaths[0]
    if (!modelPath.endsWith('.model3.json')) {
      return null
    }
    const next = setSettings({ character: { modelPath } })
    broadcastSettings(next)
    notifyMascotReload(next)
    return modelPath
  })
}

function loadTrayIcon(): Electron.NativeImage {
  const iconPath = resolveResource('tray-icon.png')
  if (existsSync(iconPath)) {
    const icon = nativeImage.createFromPath(iconPath)
    if (!icon.isEmpty()) {
      return icon.resize({ width: 16, height: 16 })
    }
  }
  const fallback =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  return nativeImage.createFromDataURL(fallback)
}

function createTray(): void {
  tray = new Tray(loadTrayIcon())
  tray.setToolTip('ukaga')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '管理画面を開く',
      click: () => {
        createAdminWindow()
      },
    },
    { type: 'separator' },
    {
      label: 'マスコットを表示',
      click: () => {
        if (!mascotWindow || mascotWindow.isDestroyed()) {
          mascotWindow = createMascotWindow(getSettings().window)
          return
        }
        mascotWindow.show()
      },
    },
    {
      label: 'マスコットを非表示',
      click: () => {
        if (mascotWindow && !mascotWindow.isDestroyed()) {
          mascotWindow.hide()
        }
      },
    },
    { type: 'separator' },
    {
      label: '終了',
      click: () => {
        app.quit()
      },
    },
  ])
  tray.setContextMenu(contextMenu)
}

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide()
  }

  promptLoader = createDefaultPromptLoader(resolveResource)
  promptLoader.setPersonaChangedHandler((content) => {
    const admin = getAdminWindow()
    if (admin && !admin.isDestroyed()) {
      admin.webContents.send(IpcChannels.personaChanged, content)
    }
  })

  orchestrator = new ConversationOrchestrator({
    getSettings,
    promptLoader,
    getMascotWindow: () => mascotWindow,
  })

  randomTalk = new RandomTalkScheduler({
    getSettings,
    canFire: () => orchestrator?.canRandomTalk() ?? false,
    onFire: () => orchestrator?.sendRandomTalk(),
  })
  randomTalk.start()

  registerIpcHandlers()
  applyBehaviorSettings(getSettings())
  mascotWindow = createMascotWindow(getSettings().window)
  createTray()

  app.on('activate', () => {
    if (!mascotWindow || mascotWindow.isDestroyed()) {
      mascotWindow = createMascotWindow(getSettings().window)
    } else {
      mascotWindow.show()
    }
  })
})

app.on('window-all-closed', () => {
  // トレイ常駐
})

app.on('before-quit', () => {
  randomTalk?.stop()
  promptLoader?.dispose()
  tray?.destroy()
  tray = null
})
