import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import type { AppSettings } from '../../shared/settings'

const FALLBACK_WIDTH = 420
const FALLBACK_HEIGHT = 720

/**
 * 透過・フレームレス・最前面のマスコットウィンドウを生成する
 */
export function createMascotWindow(
  windowSettings?: AppSettings['window'],
): BrowserWindow {
  const display = screen.getPrimaryDisplay()
  const { width: screenW, height: screenH } = display.workAreaSize
  const width = windowSettings?.width ?? FALLBACK_WIDTH
  const height = windowSettings?.height ?? FALLBACK_HEIGHT
  const x =
    windowSettings?.x ?? Math.round(screenW - width - 40)
  const y =
    windowSettings?.y ?? Math.round(screenH - height - 40)

  const win = new BrowserWindow({
    width,
    height,
    x,
    y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (process.platform === 'darwin') {
    win.setAlwaysOnTop(true, 'floating')
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  } else if (process.platform === 'win32') {
    win.setAlwaysOnTop(true, 'screen-saver')
  } else {
    win.setAlwaysOnTop(true)
  }

  win.setIgnoreMouseEvents(true, { forward: true })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  win.once('ready-to-show', () => {
    win.show()
  })

  win.webContents.on(
    'console-message',
    (_event, level, message, line, sourceId) => {
      if (message.includes('[ukaga]')) {
        console.log(`[renderer] ${message}`)
        return
      }
      if (level < 3) return
      if (message.includes('Deprecation Warning')) return
      if (message.includes('utils.url.')) return
      console.error(`[renderer] ${message} (${sourceId}:${line})`)
    },
  )

  return win
}
