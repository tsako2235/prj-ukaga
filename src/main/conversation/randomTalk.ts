import type { AppSettings } from '../../shared/settings'

export type RandomTalkSchedulerDeps = {
  getSettings: () => AppSettings
  /** 発火してよいか（busy / 直近対話など） */
  canFire: () => boolean
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
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (this.stopped) return

    const settings = this.deps.getSettings()
    if (!settings.behavior.randomTalk) return

    const min = Math.max(5, settings.behavior.randomTalkIntervalMinSec)
    const max = Math.max(min, settings.behavior.randomTalkIntervalMaxSec)
    const delaySec = min + Math.random() * (max - min)
    this.timer = setTimeout(() => {
      void this.tick()
    }, delaySec * 1000)
  }

  private async tick(): Promise<void> {
    this.timer = null
    if (this.stopped) return

    const settings = this.deps.getSettings()
    if (!settings.behavior.randomTalk) {
      this.reschedule()
      return
    }

    if (this.deps.canFire()) {
      try {
        await this.deps.onFire()
      } catch (error) {
        console.warn('[randomTalk] 発火に失敗:', error)
      }
    }

    this.reschedule()
  }
}
