import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeImage,
  Tray,
} from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import { ConversationOrchestrator } from './conversation/orchestrator'
import { createDefaultPromptLoader } from './conversation/promptLoader'
import { getSettings, setSettings } from './settings/store'
import { IpcChannels } from '../shared/ipc'
import type {
  ChatSendPayload,
  MascotSetIgnoreMouseEventsPayload,
  MascotSetPositionPayload,
  SettingsSetPayload,
} from '../shared/ipc'
import { createMascotWindow } from './windows/mascotWindow'

let mascotWindow: BrowserWindow | null = null
let tray: Tray | null = null
let orchestrator: ConversationOrchestrator | null = null

/** 開発時はプロジェクトルート、本番は resources 配下を参照 */
function resolveResource(...parts: string[]): string {
  if (!app.isPackaged) {
    return join(process.cwd(), 'resources', ...parts)
  }
  return join(process.resourcesPath, ...parts)
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

  ipcMain.handle(IpcChannels.settingsGet, () => getSettings())

  ipcMain.handle(
    IpcChannels.settingsSet,
    (_event, payload: SettingsSetPayload) => {
      return setSettings(payload.patch)
    },
  )
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
      label: 'マスコットを表示',
      click: () => {
        if (!mascotWindow || mascotWindow.isDestroyed()) {
          mascotWindow = createMascotWindow()
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

  const promptLoader = createDefaultPromptLoader(resolveResource)
  orchestrator = new ConversationOrchestrator({
    getSettings,
    promptLoader,
    getMascotWindow: () => mascotWindow,
  })

  registerIpcHandlers()
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
  tray?.destroy()
  tray = null
})
