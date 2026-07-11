import { BrowserWindow } from 'electron'
import { join } from 'path'

let setupWindow: BrowserWindow | null = null

/**
 * 初回起動ガイドウィンドウ（Ollama / VOICEVOX のセットアップ誘導）
 */
export function createSetupWindow(): BrowserWindow {
  if (setupWindow && !setupWindow.isDestroyed()) {
    setupWindow.focus()
    return setupWindow
  }

  const win = new BrowserWindow({
    width: 640,
    height: 720,
    minWidth: 520,
    minHeight: 560,
    title: 'ukaga はじめかた',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/setup/index.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/setup/index.html'))
  }

  win.once('ready-to-show', () => {
    win.show()
  })

  win.on('closed', () => {
    setupWindow = null
  })

  setupWindow = win
  return win
}

export function getSetupWindow(): BrowserWindow | null {
  if (setupWindow && !setupWindow.isDestroyed()) return setupWindow
  return null
}
