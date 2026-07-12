import { BrowserWindow } from 'electron'
import { join } from 'path'
import { getSettings } from '../settings/store'

let adminWindow: BrowserWindow | null = null

/**
 * 管理画面ウィンドウ（通常・リサイズ可）
 */
export function createAdminWindow(): BrowserWindow {
  if (adminWindow && !adminWindow.isDestroyed()) {
    adminWindow.focus()
    return adminWindow
  }

  const settings = getSettings()
  const alwaysOnTop = settings.behavior.adminAlwaysOnTop ?? false

  const win = new BrowserWindow({
    width: 880,
    height: 640,
    minWidth: 720,
    minHeight: 480,
    title: 'ukaga 設定',
    show: false,
    alwaysOnTop,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/admin/index.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/admin/index.html'))
  }

  win.once('ready-to-show', () => {
    win.show()
  })

  win.on('closed', () => {
    adminWindow = null
  })

  adminWindow = win
  return win
}

export function getAdminWindow(): BrowserWindow | null {
  if (adminWindow && !adminWindow.isDestroyed()) return adminWindow
  return null
}
