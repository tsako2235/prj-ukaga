import * as PIXI from 'pixi.js'
import type { Live2DModel as Live2DModelType } from 'pixi-live2d-display'

type Live2DModelConstructor = {
  from: (
    source: string,
    options?: { autoHitTest?: boolean; autoFocus?: boolean },
  ) => Promise<Live2DModelType>
  registerTicker: (tickerClass: typeof PIXI.Ticker) => void
}

export type Live2DStage = {
  app: PIXI.Application
  model: Live2DModelType
}

/**
 * Pixi アプリケーションと Live2D モデルを初期化する
 */
export async function createLive2DStage(
  container: HTMLElement,
  modelPath: string,
  Live2DModel: Live2DModelConstructor,
): Promise<Live2DStage> {
  const app = new PIXI.Application({
    backgroundAlpha: 0,
    resizeTo: window,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  })

  container.appendChild(app.view as HTMLCanvasElement)

  const model = await Live2DModel.from(modelPath, {
    // 視線・ヒットは自前実装するため自動操作はオフ
    autoHitTest: false,
    autoFocus: false,
  })

  // ウィンドウに収まるようスケール調整
  const scaleX = app.screen.width / model.width
  const scaleY = app.screen.height / model.height
  const scale = Math.min(scaleX, scaleY) * 0.9
  model.scale.set(scale)
  model.x = app.screen.width / 2
  model.y = app.screen.height
  model.anchor.set(0.5, 1)

  app.stage.addChild(model)

  console.info(
    `[ukaga] Live2D モデルを読み込みました: ${modelPath} (${Math.round(model.width)}x${Math.round(model.height)})`,
  )

  // Idle モーション（グループがあれば再生）
  try {
    void model.motion('Idle')
  } catch {
    // Idle グループが無いモデルもある
  }

  window.addEventListener('resize', () => {
    const nextScaleX = app.screen.width / model.width
    const nextScaleY = app.screen.height / model.height
    const nextScale = Math.min(nextScaleX, nextScaleY) * 0.9
    model.scale.set(nextScale)
    model.x = app.screen.width / 2
    model.y = app.screen.height
  })

  return { app, model }
}
