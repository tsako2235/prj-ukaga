import type { AppSettings } from '../../../shared/settings'
import type { DeepPartial } from '../../../shared/ipc'

type Props = {
  settings: AppSettings
  patchSettings: (patch: DeepPartial<AppSettings>) => Promise<AppSettings>
}

export function BehaviorTab({ settings, patchSettings }: Props) {
  const behavior = settings.behavior

  return (
    <section className="tab-panel">
      <h1>挙動設定</h1>
      <p className="tab-lead">
        ランダムトークや常駐の振る舞いです。間隔は最小〜最大の一様乱数です（両方
        30 なら約30秒ごと）。ただし会話・タップの直後は計画どおり約60秒間発火しません。
      </p>

      <label className="field checkbox">
        <input
          type="checkbox"
          checked={behavior.randomTalk}
          onChange={(e) =>
            void patchSettings({ behavior: { randomTalk: e.target.checked } })
          }
        />
        <span>ランダムトーク</span>
      </label>

      <div className="row-fields">
        <label className="field">
          <span>間隔 最小（秒）</span>
          <input
            type="number"
            min={30}
            value={behavior.randomTalkIntervalMinSec}
            onChange={(e) =>
              void patchSettings({
                behavior: {
                  randomTalkIntervalMinSec: Math.max(
                    30,
                    Number(e.target.value) || 30,
                  ),
                },
              })
            }
          />
        </label>
        <label className="field">
          <span>間隔 最大（秒）</span>
          <input
            type="number"
            min={30}
            value={behavior.randomTalkIntervalMaxSec}
            onChange={(e) =>
              void patchSettings({
                behavior: {
                  randomTalkIntervalMaxSec: Math.max(
                    30,
                    Number(e.target.value) || 30,
                  ),
                },
              })
            }
          />
        </label>
      </div>

      <label className="field checkbox">
        <input
          type="checkbox"
          checked={behavior.alwaysOnTop}
          onChange={(e) =>
            void patchSettings({ behavior: { alwaysOnTop: e.target.checked } })
          }
        />
        <span>常に最前面</span>
      </label>

      <label className="field checkbox">
        <input
          type="checkbox"
          checked={behavior.openAtLogin}
          onChange={(e) =>
            void patchSettings({ behavior: { openAtLogin: e.target.checked } })
          }
        />
        <span>OS起動時に自動起動</span>
      </label>
    </section>
  )
}
