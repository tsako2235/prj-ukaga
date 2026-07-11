import type { AppSettings } from '../../shared/settings'

export type RandomTalkSchedulerDeps = {
  getSettings: () => AppSettings
  /** 発火してよいか（busy / 直近対話など） */
  canFire: () => boolean
  /** クールダウン残り秒。0 ならすぐ発火可 */
  getCooldownRemainingSec: () => number
  /** ランダムトークを実行 */
  onFire: () => void | Promise<void>
}

/**
 * アイドル時の自発発話スケジューラ
 */
export class RandomTalkScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null
  private stopped = true

  constructor(private readonly deps: RandomTalkSchedulerDeps) {}

  start(): void {
    this.stopped = false
    this.reschedule()
  }

  stop(): void {
    this.stopped = true
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  /** 設定変更時などに呼び直す */
  reschedule(): void {
    if (this.stopped) return

    const settings = this.deps.getSettings()
    if (!settings.behavior.randomTalk) {
      this.clearTimer()
      console.info('[randomTalk] OFF のため停止')
      return
    }

    const min = Math.max(5, settings.behavior.randomTalkIntervalMinSec)
    const max = Math.max(min, settings.behavior.randomTalkIntervalMaxSec)
    const delaySec = min + Math.random() * (max - min)
    this.scheduleIn(delaySec, `間隔 ${min}〜${max}s から抽選`)
  }

  private scheduleIn(delaySec: number, reason: string): void {
    this.clearTimer()
    const sec = Math.max(1, delaySec)
    console.info(
      `[randomTalk] 次の候補まで約 ${sec.toFixed(0)} 秒（${reason}）`,
    )
    this.timer = setTimeout(() => {
      void this.tick()
    }, sec * 1000)
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  private async tick(): Promise<void> {
    this.timer = null
    if (this.stopped) return

    const settings = this.deps.getSettings()
    if (!settings.behavior.randomTalk) {
      console.info('[randomTalk] OFF のためスキップ')
      return
    }

    const remaining = this.deps.getCooldownRemainingSec()
    if (remaining > 0 || !this.deps.canFire()) {
      // 計画: 最終対話から60秒以内はスキップ → 残りだけ待って再挑戦
      const wait = Math.max(1, remaining || 5)
      console.info(
        `[randomTalk] クールダウン中のためスキップ（残り約 ${wait.toFixed(0)} 秒）`,
      )
      this.scheduleIn(wait + 0.5, 'クールダウン待ち')
      return
    }

    console.info('[randomTalk] 発火')
    try {
      await this.deps.onFire()
    } catch (error) {
      console.warn('[randomTalk] 発火に失敗:', error)
    }

    this.reschedule()
  }
}
