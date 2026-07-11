/**
 * ヒットエリア名からタップ用モーション名を決める
 */
export function resolveTapMotion(hits: string[]): string {
  const lower = hits.map((h) => h.toLowerCase())
  if (lower.some((h) => h.includes('head'))) {
    return 'TapHead'
  }
  if (lower.some((h) => h.includes('body'))) {
    return 'TapBody'
  }
  if (hits.length > 0) return 'TapBody'
  return 'TapBody'
}
