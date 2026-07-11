/** Cubism Core / モデルの読込とメッセージ表示 */

/**
 * レンダラ直下の静的アセット URL を返す。
 * 開発時は Vite、配布時は out/renderer 基準（mascot/ からの相対）で解決する。
 */
function assetUrl(pathFromRendererRoot: string): string {
  const cleaned = pathFromRendererRoot.replace(/^\//, '')
  return new URL(`../${cleaned}`, window.location.href).href
}

const CUBISM_CORE_URL = assetUrl('live2dcubismcore.min.js')

/** よくあるサンプルモデルの候補パス（レンダラ直下からの相対） */
const MODEL_CANDIDATES = [
  'models/Hiyori/Hiyori.model3.json',
  'models/hiyori/hiyori_pro_t11.model3.json',
  'models/hiyori/Hiyori.model3.json',
  'models/Haru/Haru.model3.json',
  'models/haru/Haru.model3.json',
  'models/Rice/Rice.model3.json',
  'models/sample/sample.model3.json',
]

export function showMessage(text: string): void {
  const el = document.getElementById('message')
  if (!el) return
  el.textContent = text
  el.classList.add('visible')
}

/**
 * Cubism Core を script タグで読み込む。
 * 公式配布の live2dcubismcore.min.js が window.Live2DCubismCore を定義する。
 */
export function loadCubismCore(): Promise<void> {
  return new Promise((resolve, reject) => {
    const w = window as Window & { Live2DCubismCore?: unknown }
    if (w.Live2DCubismCore) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = CUBISM_CORE_URL
    script.async = false
    script.onload = () => {
      if (w.Live2DCubismCore) {
        resolve()
      } else {
        reject(
          new Error(
            'スクリプトは読み込めましたが Live2DCubismCore が定義されていません',
          ),
        )
      }
    }
    script.onerror = () => {
      reject(new Error(`${CUBISM_CORE_URL} の読み込みに失敗しました`))
    }
    document.head.appendChild(script)
  })
}

async function urlExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' })
    if (res.ok) return true
    // 一部環境では HEAD 非対応のため GET で確認
    const getRes = await fetch(url, { method: 'GET' })
    return getRes.ok
  } catch {
    return false
  }
}

/** resources/models 配下の .model3.json を探す（絶対 URL を返す） */
export async function findModelPath(): Promise<string | null> {
  for (const candidate of MODEL_CANDIDATES) {
    const url = assetUrl(candidate)
    if (await urlExists(url)) {
      return url
    }
  }

  // マニフェストがあればそれを使う（任意）
  const manifestUrl = assetUrl('models/model-path.txt')
  if (await urlExists(manifestUrl)) {
    try {
      const text = (await (await fetch(manifestUrl)).text()).trim()
      if (!text) return null
      const resolved = text.startsWith('http')
        ? text
        : assetUrl(text.replace(/^\//, ''))
      if (await urlExists(resolved)) {
        return resolved
      }
    } catch {
      // 無視
    }
  }

  return null
}
