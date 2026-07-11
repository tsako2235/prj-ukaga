import * as PIXI from 'pixi.js'
import { createSpeechPlayer } from './audio/player'
import { createBalloon, type BalloonController } from './balloon/balloon'
import './balloon/balloon.css'
import { setupInteraction } from './interaction'
import {
  applyEmotion,
  playMotionSafe,
  resolveTapMotion,
} from './live2d/emotion'
import {
  fetchRecommendedEmotionMap,
  findModelPath,
  isEmotionMapEmpty,
  loadCubismCore,
  showMessage,
} from './live2d/loader'
import { createLive2DStage } from './live2d/stage'
import type { AppSettings } from '../../shared/settings'

/** 設定の modelPath を Live2D が読める URL にする */
function toModelUrl(modelPath: string): string {
  if (
    modelPath.startsWith('http://') ||
    modelPath.startsWith('https://') ||
    modelPath.startsWith('file://') ||
    modelPath.startsWith('/')
  ) {
    if (
      modelPath.startsWith('/') &&
      !modelPath.startsWith('/Users') &&
      !modelPath.match(/^\/[A-Za-z]:/)
    ) {
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

function tapPrompt(hits: string[]): string {
  const lower = hits.map((h) => h.toLowerCase())
  if (lower.some((h) => h.includes('head'))) {
    return '（頭をなでられた。短くひとこと反応して）'
  }
  if (lower.some((h) => h.includes('body'))) {
    return '（体をつつかれた。短くひとこと反応して）'
  }
  return '（触られた。短くひとこと反応して）'
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

  let settings = await window.ukaga.getSettings()
  let emotionMap = settings.character.emotionMap

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

  // 未設定ならモデル同梱の推奨 emotionMap を使う（設定ファイルは書き換えない）
  if (isEmotionMapEmpty(emotionMap)) {
    const recommended = await fetchRecommendedEmotionMap(modelPath)
    if (recommended) {
      emotionMap = { ...emotionMap, ...recommended }
      console.info('[ukaga] 推奨 emotionMap を適用しました')
    }
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
      applyEmotion(stage.model, segment.emotion, emotionMap)
      const showTag = settings.debug?.enabled
      const display =
        showTag && segment.emotion
          ? `[${segment.emotion}]${segment.text}`
          : segment.text
      balloon.appendAssistant(display, segment.emotion)
    },
  })

  balloon = createBalloon(appRoot, {
    initialPosition: {
      x: settings.balloon?.x ?? 12,
      y: settings.balloon?.y ?? 12,
    },
    onBeforeSend: () => {
      player.clear()
      balloon.showWarning(null)
    },
    onPositionChange: (pos) => {
      void window.ukaga.setSettings({
        patch: { balloon: { x: pos.x, y: pos.y } },
      })
    },
  })

  window.ukaga.onSpeechSegment((payload) => {
    player.enqueue(payload)
  })

  window.ukaga.onSpeechEnd(() => {
    balloon.bumpFade()
  })

  window.ukaga.onSettingsChanged((next: AppSettings) => {
    const prevScale = settings.character.scale
    settings = next
    volumeScale = next.voice.volumeScale
    emotionMap = next.character.emotionMap
    if (next.balloon) {
      balloon.setPosition({ x: next.balloon.x, y: next.balloon.y })
    }
    // スケールが変わったときだけ再レイアウト（他設定のトグルで拡大しない）
    if (next.character.scale !== prevScale) {
      stage.setUserScale(next.character.scale)
    }
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
    onModelClick: (info) => {
      const hits = info.hits
      if (hits.length > 0) {
        const motion = resolveTapMotion(hits)
        playMotionSafe(stage.model, motion)
        balloon.show()
        player.clear()
        window.ukaga.sendChat({ text: tapPrompt(hits) })
        return
      }
      // ヒットエリア外だがモデル上 → バルーンを開く
      balloon.show()
    },
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
