import { useState } from 'react'
import type { AppSettings, LlmProviderKind } from '../../../shared/settings'
import { LLM_PROVIDER_DEFAULT_URLS } from '../../../shared/defaults'
import type { DeepPartial, ModelInfo } from '../../../shared/ipc'

type Props = {
  settings: AppSettings
  patchSettings: (patch: DeepPartial<AppSettings>) => Promise<AppSettings>
}

export function LlmTab({ settings, patchSettings }: Props) {
  const llm = settings.llm
  const [models, setModels] = useState<ModelInfo[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)

  async function onProviderChange(provider: LlmProviderKind) {
    await patchSettings({
      llm: {
        provider,
        baseUrl: LLM_PROVIDER_DEFAULT_URLS[provider],
      },
    })
    setModels([])
    setStatus(null)
  }

  async function runHealthCheck() {
    setTesting(true)
    setStatus('接続テスト中…')
    try {
      const result = await window.ukaga.healthCheckLlm()
      if (!result.ok) {
        setStatus(result.detail ?? '接続に失敗しました')
        setModels([])
        return
      }
      const list = await window.ukaga.listLlmModels()
      setModels(list)
      setStatus(
        list.length > 0
          ? `接続成功（モデル ${list.length} 件）`
          : '接続成功（モデルなし）',
      )
      if (list.length > 0 && !list.some((m) => m.id === llm.model)) {
        await patchSettings({ llm: { model: list[0].id } })
      }
    } catch (error) {
      setStatus(String(error))
      setModels([])
    } finally {
      setTesting(false)
    }
  }

  return (
    <section className="tab-panel">
      <h1>LLM設定</h1>
      <p className="tab-lead">変更は即時保存・反映されます（右下に「保存済み ✓」）。</p>

      <label className="field">
        <span>プロバイダ</span>
        <select
          value={llm.provider}
          onChange={(e) => void onProviderChange(e.target.value as LlmProviderKind)}
        >
          <option value="ollama">Ollama</option>
          <option value="openai-compat">OpenAI互換</option>
        </select>
      </label>

      <label className="field">
        <span>接続先URL</span>
        <input
          type="text"
          value={llm.baseUrl}
          onChange={(e) => void patchSettings({ llm: { baseUrl: e.target.value } })}
        />
      </label>

      {llm.provider === 'openai-compat' && (
        <label className="field">
          <span>APIキー</span>
          <input
            type="password"
            value={llm.apiKey ?? ''}
            onChange={(e) =>
              void patchSettings({ llm: { apiKey: e.target.value || undefined } })
            }
            placeholder="不要な場合は空欄"
          />
        </label>
      )}

      <label className="field">
        <span>モデル</span>
        {models.length > 0 ? (
          <select
            value={llm.model}
            onChange={(e) => void patchSettings({ llm: { model: e.target.value } })}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={llm.model}
            onChange={(e) => void patchSettings({ llm: { model: e.target.value } })}
            placeholder="接続テストで一覧取得、または直接入力"
          />
        )}
      </label>

      <label className="field">
        <span>Temperature（{llm.temperature.toFixed(2)}）</span>
        <input
          type="range"
          min={0}
          max={2}
          step={0.05}
          value={llm.temperature}
          onChange={(e) =>
            void patchSettings({ llm: { temperature: Number(e.target.value) } })
          }
        />
      </label>

      <label className="field">
        <span>履歴送信数（往復）</span>
        <input
          type="number"
          min={1}
          max={50}
          value={llm.contextLimit}
          onChange={(e) =>
            void patchSettings({
              llm: { contextLimit: Math.max(1, Number(e.target.value) || 1) },
            })
          }
        />
      </label>

      <div className="actions">
        <button type="button" disabled={testing} onClick={() => void runHealthCheck()}>
          接続テスト
        </button>
        {status && <span className="status-text">{status}</span>}
      </div>
    </section>
  )
}
