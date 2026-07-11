import { describe, expect, it } from 'vitest'
import { resolveTapMotion } from '../src/shared/live2dTap'

describe('resolveTapMotion', () => {
  it('Head ヒットは TapHead', () => {
    expect(resolveTapMotion(['Head'])).toBe('TapHead')
  })

  it('Body ヒットは TapBody', () => {
    expect(resolveTapMotion(['Body'])).toBe('TapBody')
  })

  it('不明なヒットは TapBody', () => {
    expect(resolveTapMotion(['HitArea'])).toBe('TapBody')
  })
})
