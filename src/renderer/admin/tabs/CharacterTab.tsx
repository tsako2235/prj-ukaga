import { useState } from 'react'
import type { AppSettings } from '../../../shared/settings'
import type { DeepPartial } from '../../../shared/ipc'

type Props = {
  settings: AppSettings
  updateDraft: (patch: DeepPartial<AppSettings>) => void
  draftPersona: string
  setDraftPersona: (content: string) => void
  notifySaved?: () => void
}

const EMOTION_KEYS = ['neutral', 'happy', 'sad', 'angry', 'surprised'] as const

export function CharacterTab({ settings, updateDraft, draftPersona, setDraftPersona, notifySaved }: Props) {
  const character = settings.character
  const [status, setStatus] = useState<string | null>(null)

  async function savePersona(content: string) {
    setDraftPersona(content)
  }

  async function resetPersona() {
    // personaReset はデフォルト値を取得するクエリに修正されたため、
    // ファイル自体は書き換えずにドラフトに設定する
    const content = await window.ukaga.resetPersona()
    setDraftPersona(content)
    setStatus('人格プロンプトをデフォルトにリセットしました (保存ボタンを押すと適用されます)')
  }

  async function pickModel() {
    const path = await window.ukaga.pickCharacterModel()
    if (path) {
      updateDraft({ character: { modelPath: path } })
      setStatus(`モデルを選択しました: ${path} (保存ボタンを押すと適用されます)`)
    }
  }

  async function applyRecommendedEmotionMap() {
    const fetchUrl = '/models/Tsumugi/emotion-map.recommended.json'
    try {
      const res = await fetch(fetchUrl)
      if (!res.ok) {
        setStatus('推奨 emotion-map.recommended.json が見つかりません')
        return
      }
      const map = (await res.json()) as Record<string, string>
      updateDraft({ character: { emotionMap: map } })
      setStatus('推奨の感情マップを選択しました (保存ボタンを押すと適用されます)')
    } catch (error) {
      setStatus(`推奨マップの読込に失敗: ${String(error)}`)
    }
  }

  async function updateEmotion(key: string, value: string) {
    updateDraft({
      character: {
        emotionMap: {
          ...character.emotionMap,
          [key]: value,
        },
      },
    })
  }

  return (
    <section className="tab-panel">
      <h1>キャラクター設定</h1>
      <p className="tab-lead">設定は下部のボタンで保存されるまで適用されません。</p>

      <label className="field">
        <span>名前</span>
        <input
          type="text"
          value={character.name}
          onChange={(e) =>
            updateDraft({ character: { name: e.target.value } })
          }
        />
      </label>

      <div className="field">
        <span>Live2Dモデル</span>
        <div className="row">
          <input
            type="text"
            readOnly
            value={character.modelPath || '（同梱サンプル / model-path.txt）'}
          />
          <button type="button" onClick={() => void pickModel()}>
            選択…
          </button>
        </div>
      </div>

      <label className="field">
        <span>表示スケール（{character.scale.toFixed(2)}）</span>
        <input
          type="range"
          min={0.3}
          max={2}
          step={0.05}
          value={character.scale}
          onChange={(e) =>
            updateDraft({ character: { scale: Number(e.target.value) } })
          }
        />
        <span className="field-hint">
          拡大してウィンドウに収まらない場合は、ウィンドウが自動で広がります
        </span>
      </label>

      <label className="field">
        <span>人格プロンプト</span>
        <textarea
          rows={8}
          value={draftPersona}
          onChange={(e) => void savePersona(e.target.value)}
        />
      </label>
      <div className="actions">
        <button type="button" onClick={() => void resetPersona()}>
          デフォルトに戻す
        </button>
      </div>

      <h2>感情マッピング</h2>
      <p className="tab-lead">
        感情タグ → Live2D の表情 / モーション名（空なら変更なし）
      </p>
      <div className="actions" style={{ marginBottom: 12 }}>
        <button type="button" onClick={() => void applyRecommendedEmotionMap()}>
          つむぎ推奨マップを適用
        </button>
      </div>
      <div className="emotion-table">
        {EMOTION_KEYS.map((key) => (
          <label key={key} className="field">
            <span>{key}</span>
            <input
              type="text"
              value={character.emotionMap[key] ?? ''}
              onChange={(e) => void updateEmotion(key, e.target.value)}
              placeholder="expression / motion 名"
            />
          </label>
        ))}
      </div>

      {status && <p className="status-text">{status}</p>}
    </section>
  )
}
