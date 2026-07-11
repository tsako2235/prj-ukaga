import type { SpeechSegmentPayload } from '../../../shared/ipc'

const FADE_MS = 12_000

export type BalloonController = {
  /** バルーン Dom 上かどうか（クリック透過判定用） */
  containsPoint: (clientX: number, clientY: number) => boolean
  /** バルーンを表示して入力にフォーカス */
  show: () => void
  dispose: () => void
}

/**
 * 吹き出し UI（発話・入力・思考中・エラー）
 */
export function createBalloon(root: HTMLElement): BalloonController {
  const panel = document.createElement('div')
  panel.id = 'balloon'
  panel.innerHTML = `
    <div class="balloon-body">
      <div class="balloon-status" id="balloon-status" hidden></div>
      <div class="balloon-error" id="balloon-error" hidden></div>
      <div class="balloon-messages" id="balloon-messages"></div>
      <form class="balloon-form" id="balloon-form">
        <input
          id="balloon-input"
          type="text"
          autocomplete="off"
          placeholder="話しかけてみよう…"
        />
        <button type="submit" id="balloon-send">送信</button>
      </form>
    </div>
  `
  root.appendChild(panel)

  const messagesEl = panel.querySelector('#balloon-messages') as HTMLElement
  const statusEl = panel.querySelector('#balloon-status') as HTMLElement
  const errorEl = panel.querySelector('#balloon-error') as HTMLElement
  const form = panel.querySelector('#balloon-form') as HTMLFormElement
  const input = panel.querySelector('#balloon-input') as HTMLInputElement

  let fadeTimer: ReturnType<typeof setTimeout> | null = null
  let visible = false

  function setVisible(next: boolean): void {
    visible = next
    panel.classList.toggle('visible', next)
    panel.classList.toggle('faded', !next)
  }

  function bumpFade(): void {
    if (fadeTimer) clearTimeout(fadeTimer)
    setVisible(true)
    fadeTimer = setTimeout(() => {
      // 入力中は消さない
      if (document.activeElement === input) {
        bumpFade()
        return
      }
      setVisible(false)
    }, FADE_MS)
  }

  function show(): void {
    bumpFade()
    input.focus()
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const text = input.value.trim()
    if (!text) return
    input.value = ''
    appendMessage('user', text)
    bumpFade()
    window.ukaga.sendChat({ text })
  })

  // バルーン上ではクリックを受け付ける
  panel.addEventListener('mousedown', (event) => {
    event.stopPropagation()
    bumpFade()
    window.ukaga.setIgnoreMouseEvents({ ignore: false })
  })

  const unsubSegment = window.ukaga.onSpeechSegment(
    (payload: SpeechSegmentPayload) => {
      appendMessage('assistant', payload.text, payload.emotion)
      bumpFade()
    },
  )

  const unsubEnd = window.ukaga.onSpeechEnd(() => {
    bumpFade()
  })

  const unsubThinking = window.ukaga.onThinking(({ thinking }) => {
    statusEl.hidden = !thinking
    statusEl.textContent = thinking ? '考え中…' : ''
    if (thinking) bumpFade()
  })

  const unsubError = window.ukaga.onError(({ message }) => {
    if (!message) {
      errorEl.hidden = true
      errorEl.textContent = ''
      return
    }
    errorEl.hidden = false
    errorEl.textContent = message
    bumpFade()
  })

  function appendMessage(
    role: 'user' | 'assistant',
    text: string,
    emotion?: string,
  ): void {
    const row = document.createElement('div')
    row.className = `balloon-line balloon-${role}`
    if (emotion) row.dataset.emotion = emotion
    row.textContent = text
    messagesEl.appendChild(row)
    messagesEl.scrollTop = messagesEl.scrollHeight
  }

  // 初期は少し見せて入力を促す
  setVisible(true)
  bumpFade()

  return {
    containsPoint(clientX: number, clientY: number): boolean {
      if (!visible && panel.classList.contains('faded')) {
        // フェード中でもヒット領域は残すと操作しづらいので非表示時は false
        if (!panel.classList.contains('visible')) return false
      }
      if (!panel.classList.contains('visible')) return false
      const rect = panel.getBoundingClientRect()
      return (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      )
    },
    show,
    dispose(): void {
      if (fadeTimer) clearTimeout(fadeTimer)
      unsubSegment()
      unsubEnd()
      unsubThinking()
      unsubError()
      panel.remove()
    },
  }
}
