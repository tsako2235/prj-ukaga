import type { AppSettings } from '../../../shared/settings'
import type { DeepPartial } from '../../../shared/ipc'
import {
  MASCOT_MIN_HEIGHT,
  MASCOT_MIN_WIDTH,
} from '../../../shared/windowBounds'

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

      <h2>ウィンドウ</h2>
      <p className="tab-lead">
        マスコットウィンドウの大きさです。広げると吹き出しを動かせる範囲が広がります（キャラの大きさは変わりません。キャラの大きさはキャラクタータブの表示スケールで調整します）。
        画面の作業領域より大きい値は自動で切り詰められます。
      </p>
      <div className="row-fields">
        <label className="field">
          <span>ウィンドウ幅（px）</span>
          <input
            type="number"
            min={MASCOT_MIN_WIDTH}
            step={20}
            value={settings.window.width}
            onChange={(e) =>
              void patchSettings({
                window: {
                  width: Math.max(
                    MASCOT_MIN_WIDTH,
                    Number(e.target.value) || MASCOT_MIN_WIDTH,
                  ),
                },
              })
            }
          />
        </label>
        <label className="field">
          <span>ウィンドウ高さ（px）</span>
          <input
            type="number"
            min={MASCOT_MIN_HEIGHT}
            step={20}
            value={settings.window.height}
            onChange={(e) =>
              void patchSettings({
                window: {
                  height: Math.max(
                    MASCOT_MIN_HEIGHT,
                    Number(e.target.value) || MASCOT_MIN_HEIGHT,
                  ),
                },
              })
            }
          />
        </label>
      </div>

      <h2>デバッグ</h2>
      <p className="tab-lead">
        動確用です。ON にすると吹き出しに感情タグ（例: [happy]）も表示します。
      </p>
      <label className="field checkbox">
        <input
          type="checkbox"
          checked={settings.debug?.enabled ?? false}
          onChange={(e) =>
            void patchSettings({ debug: { enabled: e.target.checked } })
          }
        />
        <span>デバッグモード（バルーンに感情タグを表示）</span>
      </label>
    </section>
  )
}
