const SENTENCE_END = /[。！？!?\n]/
const MIN_FRAGMENT_LENGTH = 4

function contentLength(sentence: string): number {
  return sentence.replace(SENTENCE_END, '').trim().length
}

/**
 * ストリームトークンを文単位に分割する。
 * 「。」「!」「?」「\n」で区切る。短すぎる断片は次と結合。
 * カギ括弧「」内の句点は区切らない。
 */
export class SentenceSplitter {
  private buffer = ''
  private pending = ''
  private inQuote = false

  push(chunk: string): string[] {
    const out: string[] = []
    for (const ch of chunk) {
      this.buffer += ch
      if (ch === '「') this.inQuote = true
      if (ch === '」') this.inQuote = false

      if (!this.inQuote && SENTENCE_END.test(ch)) {
        let sentence = this.buffer.trim()
        this.buffer = ''
        if (!sentence) continue

        if (this.pending) {
          sentence = `${this.pending}${sentence}`
          this.pending = ''
        }

        if (contentLength(sentence) < MIN_FRAGMENT_LENGTH) {
          this.pending = sentence
          continue
        }

        out.push(sentence)
      }
    }
    return out
  }

  /** ストリーム終了時に残バッファを返す */
  flush(): string | null {
    let rest = this.buffer.trim()
    this.buffer = ''
    this.inQuote = false
    if (this.pending) {
      rest = rest ? `${this.pending}${rest}` : this.pending
      this.pending = ''
    }
    return rest || null
  }

  reset(): void {
    this.buffer = ''
    this.pending = ''
    this.inQuote = false
  }
}
