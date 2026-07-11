import * as PIXI from 'pixi.js'
import type { Live2DModel } from 'pixi-live2d-display'
import { createSpeechPlayer } from './audio/player'
import { createBalloon, type BalloonController } from './balloon/balloon'
import './balloon/balloon.css'
import { setupInteraction } from './interaction'
import { findModelPath, loadCubismCore, showMessage } from './live2d/loader'
import { createLive2DStage } from './live2d/stage'

/** 設定の modelPath を Live2D が読める URL にする */
function toModelUrl(modelPath: string): string {
  if (
    modelPath.startsWith('http://') ||
    modelPath.startsWith('https://') ||
    modelPath.startsWith('file://') ||
    modelPath.startsWith('/')
  ) {
    // Vite public 配下の相対 URL はそのまま
    if (modelPath.startsWith('/') && !modelPath.startsWith('/Users') && !modelPath.match(/^\/[A-Za-z]:/)) {
      return modelPath
    }
    if (modelPath.startsWith('http') || modelPath.startsWith('file')) {
      return modelPath
    }
  }
  const normalized = modelPath.replace(/\\/g, '/')
  const withSlash = normalized.startsWith('/') ? normalized : `/${normalized}`
  return encodeURI(`file://${withSlash}`)
}

async function main(): Promise<void> {
  const appRoot = document.getElementById('app')
  if (!appRoot) return

  try {
    await loadCubismCore()
  } catch (error) {
    showMessage(
      'Live2D Cubism Core が見つかりません。\n\n' +
        'README の手順に従い、公式サイトから live2dcubismcore.min.js を取得し、\n' +
        'resources/live2dcubismcore.min.js に配置してから再起動してください。\n\n' +
        String(error),
    )
    window.ukaga.setIgnoreMouseEvents({ ignore: false })
    return
  }

  const { Live2DModel } = await import('pixi-live2d-display/cubism4')
  Live2DModel.registerTicker(PIXI.Ticker)

  const settings = await window.ukaga.getSettings()
  let modelPath =
    (settings.character.modelPath &&
      toModelUrl(settings.character.modelPath)) ||
    (await findModelPath())

  if (!modelPath) {
    showMessage(
      'Live2D モデルが見つかりません。\n\n' +
        'README の手順に従い、サンプルモデルを配置するか、\n' +
        '管理画面から .model3.json を指定してください。',
    )
    window.ukaga.setIgnoreMouseEvents({ ignore: false })
    return
  }

  const stage = await createLive2DStage(
    appRoot,
    modelPath,
    Live2DModel,
    settings.character.scale,
  )

  let volumeScale = settings.voice.volumeScale
  let balloon!: BalloonController

  const player = createSpeechPlayer({
    getModel: () => stage.model,
    getVolumeScale: () => volumeScale,
    onSegmentStart: (segment) => {
      balloon.appendAssistant(segment.text, segment.emotion)
    },
  })

  balloon = createBalloon(appRoot, {
    onBeforeSend: () => {
      player.clear()
      balloon.showWarning(null)
    },
  })

  window.ukaga.onSpeechSegment((payload) => {
    player.enqueue(payload)
  })

  window.ukaga.onSpeechEnd(() => {
    balloon.bumpFade()
  })

  window.ukaga.onSettingsChanged((next) => {
    volumeScale = next.voice.volumeScale
    stage.setUserScale(next.character.scale)
  })

  window.ukaga.onReloadCharacter(async (payload) => {
    try {
      if (payload.modelPath) {
        await stage.replaceModel(
          toModelUrl(payload.modelPath),
          payload.scale ?? settings.character.scale,
        )
      } else if (payload.scale != null) {
        stage.setUserScale(payload.scale)
      }
    } catch (error) {
      console.error('[ukaga] モデル差し替え失敗', error)
      balloon.showWarning(`モデルの読み込みに失敗しました: ${String(error)}`)
    }
  })

  setupInteraction(stage.app, {
    getModel: () => stage.model,
    isOverUi: (x, y) => balloon.containsPoint(x, y),
    onModelClick: () => balloon.show(),
  })

  window.addEventListener('contextmenu', (event) => {
    event.preventDefault()
    window.ukaga.openAdmin()
  })
}

main().catch((error) => {
  showMessage(`起動に失敗しました。\n\n${String(error)}`)
  window.ukaga.setIgnoreMouseEvents({ ignore: false })
})
