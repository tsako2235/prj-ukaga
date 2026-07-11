const EMOTION_TAG =
  /^\s*\[(neutral|happy|sad|angry|surprised)\]\s*/i

const VALID = new Set([
  'neutral',
  'happy',
  'sad',
  'angry',
  'surprised',
])

export type ParsedEmotion = {
  emotion: string
  text: string
}

/**
 * 文頭の感情タグを抽出し、テキストから除去する。
 * タグがない/不正な場合は neutral にフォールバック。
 */
export function parseEmotion(sentence: string): ParsedEmotion {
  const match = sentence.match(EMOTION_TAG)
  if (!match) {
    return { emotion: 'neutral', text: sentence.trim() }
  }
  const raw = match[1].toLowerCase()
  const emotion = VALID.has(raw) ? raw : 'neutral'
  const text = sentence.slice(match[0].length).trim()
  return { emotion, text }
}
