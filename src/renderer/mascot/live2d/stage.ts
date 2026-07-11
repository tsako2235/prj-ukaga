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

function layoutModel(
  app: PIXI.Application,
  model: Live2DModelType,
  userScale: number,
): void {
  const fit = Math.min(
    app.screen.width / model.width,
    app.screen.height / model.height,
  )
  model.scale.set(fit * 0.9 * userScale)
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
