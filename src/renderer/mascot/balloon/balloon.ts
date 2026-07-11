const FADE_MS = 10_000
const MAX_LOG = 80

type LogLine = {
  role: 'user' | 'assistant'
  text: string
  emotion?: string
}

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
 * 通常は直近ターンのみ表示。過去ログは「履歴」で展開。
 */
export function createBalloon(
  root: HTMLElement,
  options: BalloonOptions = {},
): BalloonController {
  const panel = document.createElement('div')
  panel.id = 'balloon'
  panel.innerHTML = `
    <div class="balloon-body">
      <div class="balloon-toolbar">
        <button type="button" class="balloon-history" id="balloon-history" disabled>
          履歴
        </button>
        <button type="button" class="balloon-close" id="balloon-close" aria-label="閉じる" title="閉じる">×</button>
      </div>
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
  const closeBtn = panel.querySelector('#balloon-close') as HTMLButtonElement
  const historyBtn = panel.querySelector('#balloon-history') as HTMLButtonElement

  /** セッション内の全ログ（LLM 履歴とは別） */
  const log: LogLine[] = []
  /** 通常表示用の直近ターン */
  let currentTurn: LogLine[] = []
  let historyOpen = false
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
      // 履歴を開いている間は自動フェードしない
      if (historyOpen) {
        bumpFade()
        return
      }
      setVisible(false)
      // フェード後は通常表示を空に（ログは残す）
      currentTurn = []
      historyOpen = false
      renderMessages()
    }, FADE_MS)
  }

  function show(): void {
    bumpFade()
    input.focus()
  }

  function hide(): void {
    if (fadeTimer) clearTimeout(fadeTimer)
    fadeTimer = null
    historyOpen = false
    currentTurn = []
    renderMessages()
    setVisible(false)
    // 閉じた直後は下のアプリへクリックを通す（次の mousemove でヒット再判定）
    window.ukaga.setIgnoreMouseEvents({ ignore: true, forward: true })
  }

  function trimLog(): void {
    while (log.length > MAX_LOG) {
      log.shift()
    }
  }

  function createRow(line: LogLine): HTMLElement {
    const row = document.createElement('div')
    row.className = `balloon-line balloon-${line.role}`
    if (line.emotion) row.dataset.emotion = line.emotion
    row.textContent = line.text
    return row
  }

  function renderMessages(): void {
    messagesEl.replaceChildren()
    const lines = historyOpen ? log : currentTurn
    for (const line of lines) {
      messagesEl.appendChild(createRow(line))
    }
    messagesEl.classList.toggle('history-mode', historyOpen)
    messagesEl.scrollTop = messagesEl.scrollHeight

    historyBtn.disabled = log.length === 0
    historyBtn.textContent = historyOpen ? '戻す' : '履歴'
    historyBtn.title = historyOpen
      ? '直近の発話だけ表示'
      : log.length > 0
        ? 'これまでの会話を表示'
        : 'まだ履歴がありません'
    historyBtn.setAttribute('aria-pressed', historyOpen ? 'true' : 'false')
  }

  function pushLog(line: LogLine): void {
    log.push(line)
    trimLog()
  }

  function startUserTurn(text: string): void {
    historyOpen = false
    const line: LogLine = { role: 'user', text }
    pushLog(line)
    currentTurn = [line]
    renderMessages()
  }

  function appendAssistantLine(text: string, emotion?: string): void {
    const line: LogLine = { role: 'assistant', text, emotion }
    pushLog(line)
    if (historyOpen) {
      historyOpen = false
    }
    currentTurn.push(line)
    renderMessages()
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const text = input.value.trim()
    if (!text) return
    input.value = ''
    options.onBeforeSend?.()
    startUserTurn(text)
    bumpFade()
    window.ukaga.sendChat({ text })
  })

  panel.addEventListener('mousedown', (event) => {
    event.stopPropagation()
    bumpFade()
    window.ukaga.setIgnoreMouseEvents({ ignore: false })
  })

  closeBtn.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    hide()
  })

  historyBtn.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (log.length === 0) return
    historyOpen = !historyOpen
    renderMessages()
    bumpFade()
  })

  // 入力欄フォーカス中の Escape で閉じる（ウィンドウにキーボードフォーカスがあるときのみ届く）
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return
    if (!panel.classList.contains('visible')) return
    if (document.activeElement !== input) return
    event.preventDefault()
    hide()
  })

  const unsubThinking = window.ukaga.onThinking(({ thinking }) => {
    statusEl.hidden = !thinking
    statusEl.textContent = thinking ? '考え中…' : ''
    if (thinking) {
      // タップ／ランダムトーク等、入力欄以外からの発話開始時は表示を切り替える
      const last = currentTurn[currentTurn.length - 1]
      if (!last || last.role === 'assistant') {
        historyOpen = false
        currentTurn = []
        renderMessages()
      }
      bumpFade()
    }
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
  renderMessages()

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
      appendAssistantLine(text, emotion)
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
