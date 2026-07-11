const FADE_MS = 10_000
const MAX_LINES = 40

export type BalloonController = {
  containsPoint: (clientX: number, clientY: number) => boolean
  show: () => void
  hide: () => void
  appendAssistant: (text: string, emotion?: string) => void
  showWarning: (message: string | null) => void
  bumpFade: () => void
  dispose: () => void
}

export type BalloonOptions = {
  onBeforeSend?: () => void
}

/**
 * 吹き出し UI（発話・入力・思考中・エラー）
 */
export function createBalloon(
  root: HTMLElement,
  options: BalloonOptions = {},
): BalloonController {
  const panel = document.createElement('div')
  panel.id = 'balloon'
  panel.innerHTML = `
    <div class="balloon-body">
      <div class="balloon-status" id="balloon-status" hidden></div>
      <div class="balloon-error" id="balloon-error" hidden></div>
      <div class="balloon-warning" id="balloon-warning" hidden></div>
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
  const warningEl = panel.querySelector('#balloon-warning') as HTMLElement
  const form = panel.querySelector('#balloon-form') as HTMLFormElement
  const input = panel.querySelector('#balloon-input') as HTMLInputElement

  let fadeTimer: ReturnType<typeof setTimeout> | null = null

  function setVisible(next: boolean): void {
    panel.classList.toggle('visible', next)
    if (!next && document.activeElement === input) {
      input.blur()
    }
  }

  function bumpFade(): void {
    if (fadeTimer) clearTimeout(fadeTimer)
    setVisible(true)
    fadeTimer = setTimeout(() => {
      if (document.activeElement === input && input.value.trim()) {
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

  function hide(): void {
    if (fadeTimer) clearTimeout(fadeTimer)
    fadeTimer = null
    setVisible(false)
  }

  function trimMessages(): void {
    while (messagesEl.children.length > MAX_LINES) {
      messagesEl.firstElementChild?.remove()
    }
  }

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
    trimMessages()
    messagesEl.scrollTop = messagesEl.scrollHeight
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const text = input.value.trim()
    if (!text) return
    input.value = ''
    options.onBeforeSend?.()
    appendMessage('user', text)
    bumpFade()
    window.ukaga.sendChat({ text })
  })

  panel.addEventListener('mousedown', (event) => {
    event.stopPropagation()
    bumpFade()
    window.ukaga.setIgnoreMouseEvents({ ignore: false })
  })

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panel.classList.contains('visible')) {
      hide()
    }
  })

  const unsubThinking = window.ukaga.onThinking(({ thinking }) => {
    statusEl.hidden = !thinking
    statusEl.textContent = thinking ? '考え中…' : ''
    if (thinking) bumpFade()
  })

  const unsubError = window.ukaga.onError(({ message }) => {
    if (message && message.includes('音声合成')) {
      warningEl.hidden = false
      warningEl.textContent = message
      errorEl.hidden = true
      bumpFade()
      return
    }
    if (!message) {
      errorEl.hidden = true
      errorEl.textContent = ''
      return
    }
    errorEl.hidden = false
    errorEl.textContent = message
    bumpFade()
  })

  // 起動時は閉じた状態（発話・クリックで開く）
  setVisible(false)

  return {
    containsPoint(clientX: number, clientY: number): boolean {
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
    hide,
    appendAssistant(text: string, emotion?: string): void {
      appendMessage('assistant', text, emotion)
      bumpFade()
    },
    showWarning(message: string | null): void {
      if (!message) {
        warningEl.hidden = true
        warningEl.textContent = ''
        return
      }
      warningEl.hidden = false
      warningEl.textContent = message
      bumpFade()
    },
    bumpFade,
    dispose(): void {
      if (fadeTimer) clearTimeout(fadeTimer)
      unsubThinking()
      unsubError()
      panel.remove()
    },
  }
}
