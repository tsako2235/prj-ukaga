import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import type { AppSettings } from '../../shared/settings'
import {
  growBoundsToFit,
  MASCOT_MIN_HEIGHT,
  MASCOT_MIN_WIDTH,
  resizeBoundsAnchoredBottom,
} from '../../shared/windowBounds'

const FALLBACK_WIDTH = 420
const FALLBACK_HEIGHT = 880

/**
 * 透過・フレームレス・最前面のマスコットウィンドウを生成する
 */
export function createMascotWindow(
  windowSettings?: AppSettings['window'],
): BrowserWindow {
  const display = screen.getPrimaryDisplay()
  const { width: screenW, height: screenH } = display.workAreaSize
  // 下限と作業領域の範囲に収める（ユーザーがサイズ変更できるようになったため）
  const width = Math.min(
    Math.max(windowSettings?.width ?? FALLBACK_WIDTH, MASCOT_MIN_WIDTH),
    screenW,
  )
  const height = Math.min(
    Math.max(windowSettings?.height ?? FALLBACK_HEIGHT, MASCOT_MIN_HEIGHT),
    screenH,
  )
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
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/mascot/index.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/mascot/index.html'))
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

/**
 * マスコットウィンドウを「足元（下端中央）」を保ってリサイズする。
 * 作業領域にクランプした適用後のサイズを返す。
 */
export function applyMascotWindowSize(
  win: BrowserWindow,
  width: number,
  height: number,
): { width: number; height: number } {
  const current = win.getBounds()
  const workArea = screen.getDisplayMatching(current).workArea
  const next = resizeBoundsAnchoredBottom(current, width, height, workArea)
  if (
    next.width !== current.width ||
    next.height !== current.height ||
    next.x !== current.x ||
    next.y !== current.y
  ) {
    win.setBounds(next)
  }
  return { width: next.width, height: next.height }
}

/**
 * キャラが収まるようウィンドウを広げる（縮小はしない）。
 * 変更があった場合のみ適用後のサイズを返す。
 */
export function growMascotWindowToFit(
  win: BrowserWindow,
  minWidth: number,
  minHeight: number,
): { width: number; height: number } | null {
  const current = win.getBounds()
  const workArea = screen.getDisplayMatching(current).workArea
  const next = growBoundsToFit(current, minWidth, minHeight, workArea)
  if (next === current) return null
  win.setBounds(next)
  return { width: next.width, height: next.height }
}
