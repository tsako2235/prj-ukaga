import { useEffect, useState } from 'react'
import type { AppSettings } from '../../../shared/settings'
import type { DeepPartial } from '../../../shared/ipc'

type Props = {
  settings: AppSettings
  patchSettings: (patch: DeepPartial<AppSettings>) => Promise<AppSettings>
  notifySaved?: () => void
}

const EMOTION_KEYS = ['neutral', 'happy', 'sad', 'angry', 'surprised'] as const

export function CharacterTab({ settings, patchSettings, notifySaved }: Props) {
  const character = settings.character
  const [persona, setPersona] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    void window.ukaga.getPersona().then(setPersona)
    return window.ukaga.onPersonaChanged(setPersona)
  }, [])

  async function savePersona(content: string) {
    setPersona(content)
    await window.ukaga.setPersona({ content })
    notifySaved?.()
  }

  async function resetPersona() {
    const content = await window.ukaga.resetPersona()
    setPersona(content)
    setStatus('人格プロンプトをデフォルトに戻しました')
    notifySaved?.()
  }

  async function pickModel() {
    const path = await window.ukaga.pickCharacterModel()
    if (path) {
      setStatus(`モデルを変更しました: ${path}`)
      notifySaved?.()
    }
  }

  async function updateEmotion(key: string, value: string) {
    await patchSettings({
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
      <p className="tab-lead">名前・モデル・人格を編集します。</p>

      <label className="field">
        <span>名前</span>
        <input
          type="text"
          value={character.name}
          onChange={(e) =>
            void patchSettings({ character: { name: e.target.value } })
          }
        />
      </label>

      <div className="field">
        <span>Live2Dモデル</span>
        <div className="row">
          <input
            type="text"
            readOnly
            value={character.modelPath || '（同梱サンプルを使用）'}
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
            void patchSettings({ character: { scale: Number(e.target.value) } })
          }
        />
      </label>

      <label className="field">
        <span>人格プロンプト</span>
        <textarea
          rows={8}
          value={persona}
          onChange={(e) => void savePersona(e.target.value)}
        />
      </label>
      <div className="actions">
        <button type="button" onClick={() => void resetPersona()}>
          リセット
        </button>
      </div>

      <h2>感情マッピング</h2>
      <p className="tab-lead">
        感情タグ → Live2D の表情 / モーション名（空なら変更なし）
      </p>
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
