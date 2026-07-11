import type { Live2DModel } from 'pixi-live2d-display'
import { resolveTapMotion } from '../../../shared/live2dTap'

export { resolveTapMotion }

/**
 * 感情タグを emotionMap 経由で Live2D の表情 / モーションに反映する。
 * マップが空、またはモデルに無い名前の場合は何もしない（オプショナル）。
 */
export function applyEmotion(
  model: Live2DModel,
  emotion: string,
  emotionMap: Record<string, string>,
): void {
  const key = emotion || 'neutral'
  const mapped = (emotionMap[key] || emotionMap.neutral || '').trim()
  if (!mapped) return

  try {
    void model.expression(mapped)
  } catch {
    // 表情が無いモデルもある
  }

  try {
    void model.motion(mapped)
  } catch {
    // モーションが無い場合も無視
  }
}

export function playMotionSafe(model: Live2DModel, group: string): void {
  try {
    void model.motion(group)
  } catch {
    // グループが無いモデルは無視
  }
}
