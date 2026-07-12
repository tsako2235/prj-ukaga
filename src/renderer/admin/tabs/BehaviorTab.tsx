import { useEffect, useState } from 'react'
import type { AppSettings } from '../../../shared/settings'
import type { DeepPartial } from '../../../shared/ipc'
import {
  MASCOT_MIN_HEIGHT,
  MASCOT_MIN_WIDTH,
} from '../../../shared/windowBounds'

type Props = {
  settings: AppSettings
  updateDraft: (patch: DeepPartial<AppSettings>) => void
}

export function BehaviorTab({ settings, updateDraft }: Props) {
  const behavior = settings.behavior

  // 数値入力フィールド用のローカル状態
  const [minSecStr, setMinSecStr] = useState(String(behavior.randomTalkIntervalMinSec))
  const [maxSecStr, setMaxSecStr] = useState(String(behavior.randomTalkIntervalMaxSec))
  const [widthStr, setWidthStr] = useState(String(settings.window.width))
  const [heightStr, setHeightStr] = useState(String(settings.window.height))

  // props 変更時の同期
  useEffect(() => {
    setMinSecStr(String(behavior.randomTalkIntervalMinSec))
  }, [behavior.randomTalkIntervalMinSec])

  useEffect(() => {
    setMaxSecStr(String(behavior.randomTalkIntervalMaxSec))
  }, [behavior.randomTalkIntervalMaxSec])

  useEffect(() => {
    setWidthStr(String(settings.window.width))
  }, [settings.window.width])

  useEffect(() => {
    setHeightStr(String(settings.window.height))
  }, [settings.window.height])

  const commitMinSec = () => {
    const val = Math.max(30, Number(minSecStr) || 30)
    setMinSecStr(String(val))
    updateDraft({ behavior: { randomTalkIntervalMinSec: val } })
  }

  const commitMaxSec = () => {
    const val = Math.max(30, Number(maxSecStr) || 30)
    setMaxSecStr(String(val))
    updateDraft({ behavior: { randomTalkIntervalMaxSec: val } })
  }

  const commitWidth = () => {
    const val = Math.max(MASCOT_MIN_WIDTH, Number(widthStr) || MASCOT_MIN_WIDTH)
    setWidthStr(String(val))
    updateDraft({ window: { width: val } })
  }

  const commitHeight = () => {
    const val = Math.max(MASCOT_MIN_HEIGHT, Number(heightStr) || MASCOT_MIN_HEIGHT)
    setHeightStr(String(val))
    updateDraft({ window: { height: val } })
  }

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
            updateDraft({ behavior: { randomTalk: e.target.checked } })
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
            value={minSecStr}
            onChange={(e) => setMinSecStr(e.target.value)}
            onBlur={commitMinSec}
            onKeyDown={(e) => e.key === 'Enter' && commitMinSec()}
          />
        </label>
        <label className="field">
          <span>間隔 最大（秒）</span>
          <input
            type="number"
            min={30}
            value={maxSecStr}
            onChange={(e) => setMaxSecStr(e.target.value)}
            onBlur={commitMaxSec}
            onKeyDown={(e) => e.key === 'Enter' && commitMaxSec()}
          />
        </label>
      </div>

      <label className="field checkbox">
        <input
          type="checkbox"
          checked={behavior.alwaysOnTop}
          onChange={(e) =>
            updateDraft({ behavior: { alwaysOnTop: e.target.checked } })
          }
        />
        <span>常に最前面</span>
      </label>

      <label className="field checkbox">
        <input
          type="checkbox"
          checked={behavior.adminAlwaysOnTop ?? false}
          onChange={(e) =>
            updateDraft({ behavior: { adminAlwaysOnTop: e.target.checked } })
          }
        />
        <span>管理画面を常に最前面に表示</span>
      </label>

      <label className="field checkbox">
        <input
          type="checkbox"
          checked={behavior.openAtLogin}
          onChange={(e) =>
            updateDraft({ behavior: { openAtLogin: e.target.checked } })
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
            value={widthStr}
            onChange={(e) => setWidthStr(e.target.value)}
            onBlur={commitWidth}
            onKeyDown={(e) => e.key === 'Enter' && commitWidth()}
          />
        </label>
        <label className="field">
          <span>ウィンドウ高さ（px）</span>
          <input
            type="number"
            min={MASCOT_MIN_HEIGHT}
            step={20}
            value={heightStr}
            onChange={(e) => setHeightStr(e.target.value)}
            onBlur={commitHeight}
            onKeyDown={(e) => e.key === 'Enter' && commitHeight()}
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
            updateDraft({ debug: { enabled: e.target.checked } })
          }
        />
        <span>デバッグモード（バルーンに感情タグを表示）</span>
      </label>
    </section>
  )
}
