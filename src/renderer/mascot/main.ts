import * as PIXI from 'pixi.js'
import { createBalloon } from './balloon/balloon'
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
  const balloon = createBalloon(appRoot)

  setupInteraction(app, model, {
    isOverUi: (x, y) => balloon.containsPoint(x, y),
    onModelClick: () => balloon.show(),
  })
}

main().catch((error) => {
  showMessage(`起動に失敗しました。\n\n${String(error)}`)
  window.ukaga.setIgnoreMouseEvents({ ignore: false })
})
