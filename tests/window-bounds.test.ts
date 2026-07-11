import { describe, expect, it } from 'vitest'
import {
  growBoundsToFit,
  MASCOT_MIN_HEIGHT,
  MASCOT_MIN_WIDTH,
  resizeBoundsAnchoredBottom,
  type Bounds,
} from '../src/shared/windowBounds'

const workArea: Bounds = { x: 0, y: 25, width: 1920, height: 1055 }

describe('resizeBoundsAnchoredBottom', () => {
  it('下端中央を保って拡大する', () => {
    const current: Bounds = { x: 1000, y: 400, width: 420, height: 600 }
    const next = resizeBoundsAnchoredBottom(current, 620, 800, workArea)
    // 下端: 400+600=1000 を維持
    expect(next.y + next.height).toBe(1000)
    // 中央: 1000+210=1210 を維持
    expect(next.x + next.width / 2).toBe(1210)
    expect(next.width).toBe(620)
    expect(next.height).toBe(800)
  })

  it('下端中央を保って縮小する', () => {
    const current: Bounds = { x: 1000, y: 200, width: 600, height: 800 }
    const next = resizeBoundsAnchoredBottom(current, 400, 500, workArea)
    expect(next.y + next.height).toBe(1000)
    expect(next.x + next.width / 2).toBe(1300)
  })

  it('下限サイズより小さくできない', () => {
    const current: Bounds = { x: 100, y: 100, width: 420, height: 880 }
    const next = resizeBoundsAnchoredBottom(current, 10, 10, workArea)
    expect(next.width).toBe(MASCOT_MIN_WIDTH)
    expect(next.height).toBe(MASCOT_MIN_HEIGHT)
  })

  it('作業領域よりは大きくできない', () => {
    const current: Bounds = { x: 100, y: 100, width: 420, height: 880 }
    const next = resizeBoundsAnchoredBottom(current, 5000, 5000, workArea)
    expect(next.width).toBe(workArea.width)
    expect(next.height).toBe(workArea.height)
  })

  it('拡大で作業領域からはみ出す場合は位置を補正する', () => {
    // 画面右下ぎりぎりに置かれたウィンドウ
    const current: Bounds = { x: 1600, y: 800, width: 300, height: 280 }
    const next = resizeBoundsAnchoredBottom(current, 600, 600, workArea)
    expect(next.x).toBeGreaterThanOrEqual(workArea.x)
    expect(next.x + next.width).toBeLessThanOrEqual(workArea.x + workArea.width)
    expect(next.y).toBeGreaterThanOrEqual(workArea.y)
    expect(next.y + next.height).toBeLessThanOrEqual(
      workArea.y + workArea.height,
    )
  })
})

describe('growBoundsToFit', () => {
  it('足りていればそのまま返す', () => {
    const current: Bounds = { x: 100, y: 100, width: 420, height: 880 }
    expect(growBoundsToFit(current, 400, 800, workArea)).toBe(current)
  })

  it('足りない軸だけ広げる（縮小しない）', () => {
    const current: Bounds = { x: 100, y: 100, width: 420, height: 880 }
    const next = growBoundsToFit(current, 500, 300, workArea)
    expect(next.width).toBe(500)
    expect(next.height).toBe(880)
  })

  it('小数は切り上げて要求する', () => {
    const current: Bounds = { x: 100, y: 100, width: 420, height: 880 }
    const next = growBoundsToFit(current, 420.4, 880.2, workArea)
    expect(next.width).toBe(421)
    expect(next.height).toBe(881)
  })
})
