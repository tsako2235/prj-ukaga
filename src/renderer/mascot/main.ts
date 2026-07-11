import * as PIXI from 'pixi.js'
import { createSpeechPlayer } from './audio/player'
import { createBalloon, type BalloonController } from './balloon/balloon'
import './balloon/balloon.css'
import { setupInteraction } from './interaction'
import { findModelPath, loadCubismCore, showMessage } from './live2d/loader'
import { createLive2DStage } from './live2d/stage'

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

  const modelPath = await findModelPath()
  if (!modelPath) {
    showMessage(
      'Live2D モデルが見つかりません。\n\n' +
        'README の手順に従い、サンプルモデル（.model3.json 一式）を\n' +
        'resources/models/ 配下に配置してから再起動してください。',
    )
    window.ukaga.setIgnoreMouseEvents({ ignore: false })
    return
  }

  Live2DModel.registerTicker(PIXI.Ticker)

  const { app, model } = await createLive2DStage(appRoot, modelPath, Live2DModel)

  let volumeScale = 1
  void window.ukaga.getSettings().then((settings) => {
    volumeScale = settings.voice.volumeScale
  })

  let balloon!: BalloonController

  const player = createSpeechPlayer({
    model,
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

  const unsubSegment = window.ukaga.onSpeechSegment((payload) => {
    player.enqueue(payload)
  })

  const unsubEnd = window.ukaga.onSpeechEnd(() => {
    balloon.bumpFade()
  })

  setupInteraction(app, model, {
    isOverUi: (x, y) => balloon.containsPoint(x, y),
    onModelClick: () => balloon.show(),
  })

  window.addEventListener('beforeunload', () => {
    unsubSegment()
    unsubEnd()
    player.dispose()
    balloon.dispose()
  })
}

main().catch((error) => {
  showMessage(`起動に失敗しました。\n\n${String(error)}`)
  window.ukaga.setIgnoreMouseEvents({ ignore: false })
})
