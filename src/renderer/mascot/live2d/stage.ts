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
  setUserScale: (userScale: number) => void
  replaceModel: (modelPath: string, userScale?: number) => Promise<void>
}

/** 吹き出しを上に置けるよう、モデル配置から除外する上部余白（px） */
const TOP_BALLOON_ZONE_MIN = 220
const TOP_BALLOON_ZONE_RATIO = 0.34

function layoutModel(
  app: PIXI.Application,
  model: Live2DModelType,
  userScale: number,
): void {
  // model.width/height は scale 込みのため、一度 1 に戻して基準サイズを測る
  model.scale.set(1)
  const baseW = Math.max(1, model.width)
  const baseH = Math.max(1, model.height)
  // 上部にバルーン用スペースを残し、キャラは下側に収める
  const topZone = Math.max(
    TOP_BALLOON_ZONE_MIN,
    Math.round(app.screen.height * TOP_BALLOON_ZONE_RATIO),
  )
  const usableH = Math.max(120, app.screen.height - topZone)
  const fit = Math.min(app.screen.width / baseW, usableH / baseH)
  model.scale.set(fit * 0.92 * userScale)
  model.x = app.screen.width / 2
  model.y = app.screen.height
  model.anchor.set(0.5, 1)
}

/**
 * Pixi アプリケーションと Live2D モデルを初期化する
 */
export async function createLive2DStage(
  container: HTMLElement,
  modelPath: string,
  Live2DModel: Live2DModelConstructor,
  userScale = 1,
): Promise<Live2DStage> {
  const app = new PIXI.Application({
    backgroundAlpha: 0,
    resizeTo: window,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  })

  container.appendChild(app.view as HTMLCanvasElement)

  let model = await Live2DModel.from(modelPath, {
    autoHitTest: false,
    autoFocus: false,
  })
  let currentUserScale = userScale

  layoutModel(app, model, currentUserScale)
  app.stage.addChild(model)

  console.info(
    `[ukaga] Live2D モデルを読み込みました: ${modelPath} (${Math.round(model.width)}x${Math.round(model.height)})`,
  )

  try {
    void model.motion('Idle')
  } catch {
    // Idle グループが無いモデルもある
  }

  const onResize = () => {
    layoutModel(app, model, currentUserScale)
  }
  window.addEventListener('resize', onResize)

  return {
    app,
    get model() {
      return model
    },
    setUserScale(next: number) {
      currentUserScale = next
      layoutModel(app, model, currentUserScale)
    },
    async replaceModel(nextPath: string, nextUserScale = currentUserScale) {
      app.stage.removeChild(model)
      model.destroy()
      model = await Live2DModel.from(nextPath, {
        autoHitTest: false,
        autoFocus: false,
      })
      currentUserScale = nextUserScale
      layoutModel(app, model, currentUserScale)
      app.stage.addChild(model)
      console.info(`[ukaga] Live2D モデルを差し替えました: ${nextPath}`)
      try {
        void model.motion('Idle')
      } catch {
        // ignore
      }
    },
  }
}
