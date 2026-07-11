const FADE_MS = 10_000
const MAX_LOG = 80
const DEFAULT_X = 12
const DEFAULT_Y = 12
const EDGE_PAD = 4
/** 非表示時など offset が 0 のときのフォールバック */
const MIN_PANEL_W = 160
const MIN_PANEL_H = 100

type LogLine = {
  role: 'user' | 'assistant'
  text: string
  emotion?: string
}

export type BalloonPosition = {
  x: number
  y: number
}

export type BalloonController = {
  containsPoint: (clientX: number, clientY: number) => boolean
  show: () => void
  hide: () => void
  appendAssistant: (text: string, emotion?: string) => void
  showWarning: (message: string | null) => void
  bumpFade: () => void
  setPosition: (pos: BalloonPosition) => void
  getPosition: () => BalloonPosition
  dispose: () => void
}

export type BalloonOptions = {
  onBeforeSend?: () => void
  initialPosition?: BalloonPosition
  onPositionChange?: (pos: BalloonPosition) => void
}

/**
 * 吹き出し UI（発話・入力・思考中・エラー）
 * 通常は直近ターンのみ表示。過去ログは「履歴」で展開。
 * ツールバーをドラッグして位置移動（設定に永続化）。
 */
export function createBalloon(
  root: HTMLElement,
  options: BalloonOptions = {},
): BalloonController {
  const panel = document.createElement('div')
  panel.id = 'balloon'
  panel.innerHTML = `
    <div class="balloon-body">
      <div class="balloon-toolbar" id="balloon-toolbar" title="ドラッグして移動">
        <span class="balloon-drag-hint" aria-hidden="true">⋮⋮</span>
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
  const toolbar = panel.querySelector('#balloon-toolbar') as HTMLElement

  /** セッション内の全ログ（LLM 履歴とは別） */
  const log: LogLine[] = []
  /** 通常表示用の直近ターン */
  let currentTurn: LogLine[] = []
  let historyOpen = false
  let fadeTimer: ReturnType<typeof setTimeout> | null = null
  let pos: BalloonPosition = {
    x: options.initialPosition?.x ?? DEFAULT_X,
    y: options.initialPosition?.y ?? DEFAULT_Y,
  }

  let dragging = false
  let dragOffsetX = 0
  let dragOffsetY = 0

  function applyPosition(next: BalloonPosition, clamp = true): void {
    const parent = root
    const panelW = Math.max(MIN_PANEL_W, panel.offsetWidth)
    const panelH = Math.max(MIN_PANEL_H, panel.offsetHeight)
    const maxX = Math.max(EDGE_PAD, parent.clientWidth - panelW - EDGE_PAD)
    const maxY = Math.max(EDGE_PAD, parent.clientHeight - panelH - EDGE_PAD)
    const x = clamp ? Math.min(maxX, Math.max(EDGE_PAD, next.x)) : next.x
    const y = clamp ? Math.min(maxY, Math.max(EDGE_PAD, next.y)) : next.y
    pos = { x, y }
    panel.style.left = `${x}px`
    panel.style.top = `${y}px`
  }

  function setVisible(next: boolean): void {
    panel.classList.toggle('visible', next)
    if (!next && document.activeElement === input) {
      input.blur()
    }
    if (next) {
      // 表示時にサイズが分かるのでクランプし直す
      requestAnimationFrame(() => applyPosition(pos, true))
    }
  }

  function bumpFade(): void {
    if (dragging) return
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

  function isInteractiveTarget(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false
    return Boolean(
      target.closest(
        'button, input, textarea, select, a, .balloon-messages, .balloon-form',
      ),
    )
  }

  function onDragMove(event: MouseEvent): void {
    if (!dragging) return
    const parentRect = root.getBoundingClientRect()
    applyPosition(
      {
        x: event.clientX - parentRect.left - dragOffsetX,
        y: event.clientY - parentRect.top - dragOffsetY,
      },
      true,
    )
  }

  function onDragEnd(): void {
    if (!dragging) return
    dragging = false
    panel.classList.remove('dragging')
    window.removeEventListener('mousemove', onDragMove)
    window.removeEventListener('mouseup', onDragEnd)
    options.onPositionChange?.({ ...pos })
    bumpFade()
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

  toolbar.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return
    if (isInteractiveTarget(event.target)) return
    event.preventDefault()
    event.stopPropagation()
    dragging = true
    panel.classList.add('dragging')
    if (fadeTimer) clearTimeout(fadeTimer)
    const rect = panel.getBoundingClientRect()
    dragOffsetX = event.clientX - rect.left
    dragOffsetY = event.clientY - rect.top
    window.addEventListener('mousemove', onDragMove)
    window.addEventListener('mouseup', onDragEnd)
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

  const onResize = () => {
    applyPosition(pos, true)
  }
  window.addEventListener('resize', onResize)

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

  // 初期位置を適用（起動時は閉じた状態）
  applyPosition(pos, false)
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
    setPosition(next: BalloonPosition): void {
      applyPosition(next, true)
    },
    getPosition(): BalloonPosition {
      return { ...pos }
    },
    dispose(): void {
      if (fadeTimer) clearTimeout(fadeTimer)
      window.removeEventListener('mousemove', onDragMove)
      window.removeEventListener('mouseup', onDragEnd)
      window.removeEventListener('resize', onResize)
      unsubThinking()
      unsubError()
      panel.remove()
    },
  }
}
