/** マスコットウィンドウのサイズ変更計算（純粋関数・テスト対象） */

export type Bounds = {
  x: number
  y: number
  width: number
  height: number
}

/** これ以上小さくすると入力欄やキャラが操作不能になる下限 */
export const MASCOT_MIN_WIDTH = 240
export const MASCOT_MIN_HEIGHT = 320

/**
 * ウィンドウを「下端中央」を基準にリサイズした新しい矩形を返す。
 * 足元の位置を保ったまま拡縮し、作業領域からはみ出す場合は
 * サイズ・位置とも作業領域内にクランプする。
 */
export function resizeBoundsAnchoredBottom(
  current: Bounds,
  nextWidth: number,
  nextHeight: number,
  workArea: Bounds,
): Bounds {
  const width = Math.round(
    Math.min(Math.max(nextWidth, MASCOT_MIN_WIDTH), workArea.width),
  )
  const height = Math.round(
    Math.min(Math.max(nextHeight, MASCOT_MIN_HEIGHT), workArea.height),
  )

  // 下端中央を維持
  let x = current.x + Math.round((current.width - width) / 2)
  let y = current.y + (current.height - height)

  // 作業領域内へ位置補正
  x = Math.min(Math.max(x, workArea.x), workArea.x + workArea.width - width)
  y = Math.min(Math.max(y, workArea.y), workArea.y + workArea.height - height)

  return { x, y, width, height }
}

/**
 * 「少なくともこのサイズ」を満たすようウィンドウを広げた矩形を返す（縮小はしない）。
 * 現在サイズで足りていれば current をそのまま返す。
 */
export function growBoundsToFit(
  current: Bounds,
  minWidth: number,
  minHeight: number,
  workArea: Bounds,
): Bounds {
  const width = Math.max(current.width, Math.ceil(minWidth))
  const height = Math.max(current.height, Math.ceil(minHeight))
  if (width === current.width && height === current.height) {
    return current
  }
  return resizeBoundsAnchoredBottom(current, width, height, workArea)
}
