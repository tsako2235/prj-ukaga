import type { Application } from 'pixi.js'
import type { Live2DModel } from 'pixi-live2d-display'

const HIT_THROTTLE_MS = 30

export type InteractionOptions = {
  getModel: () => Live2DModel
  isOverUi?: (clientX: number, clientY: number) => boolean
  onModelClick?: () => void
}

/**
 * ドラッグ移動・クリック透過・視線追従を設定する
 */
export function setupInteraction(
  app: Application,
  options: InteractionOptions,
): void {
  let dragging = false
  let dragOffsetX = 0
  let dragOffsetY = 0
  let lastHitCheck = 0
  let interactive = false
  let dragMoved = false

  const canvas = app.view as HTMLCanvasElement

  function canvasPoint(clientX: number, clientY: number): { x: number; y: number } {
    const bounds = canvas.getBoundingClientRect()
    return {
      x: clientX - bounds.left,
      y: clientY - bounds.top,
    }
  }

  function isOverModel(clientX: number, clientY: number): boolean {
    const model = options.getModel()
    const { x, y } = canvasPoint(clientX, clientY)

    try {
      const hits = model.hitTest(x, y)
      if (hits.length > 0) return true
    } catch {
      // fallback
    }

    const bounds = model.getBounds(true)
    return bounds.contains(x, y)
  }

  function isInteractive(clientX: number, clientY: number): boolean {
    if (options.isOverUi?.(clientX, clientY)) return true
    return isOverModel(clientX, clientY)
  }

  function setClickThrough(enable: boolean): void {
    if (enable) {
      window.ukaga.setIgnoreMouseEvents({ ignore: true, forward: true })
    } else {
      window.ukaga.setIgnoreMouseEvents({ ignore: false })
    }
  }

  function onMouseMove(event: MouseEvent): void {
    const model = options.getModel()
    const { x, y } = canvasPoint(event.clientX, event.clientY)
    model.focus(x, y)

    if (dragging) {
      dragMoved = true
      window.ukaga.setPosition({
        x: event.screenX - dragOffsetX,
        y: event.screenY - dragOffsetY,
      })
      return
    }

    const now = performance.now()
    if (now - lastHitCheck < HIT_THROTTLE_MS) return
    lastHitCheck = now

    const hit = isInteractive(event.clientX, event.clientY)
    if (hit === interactive) return
    interactive = hit
    setClickThrough(!hit)
  }

  function onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return
    if (options.isOverUi?.(event.clientX, event.clientY)) {
      interactive = true
      setClickThrough(false)
      return
    }
    if (!isOverModel(event.clientX, event.clientY)) return

    dragging = true
    dragMoved = false
    interactive = true
    setClickThrough(false)
    dragOffsetX = event.clientX
    dragOffsetY = event.clientY
  }

  function onMouseUp(event: MouseEvent): void {
    if (dragging && !dragMoved) {
      options.onModelClick?.()
    }
    dragging = false
    dragMoved = false
    const hit = isInteractive(event.clientX, event.clientY)
    interactive = hit
    setClickThrough(!hit)
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('blur', () => {
    dragging = false
  })

  interactive = false
  setClickThrough(true)
}
