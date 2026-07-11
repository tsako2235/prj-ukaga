import { useCallback, useEffect, useState } from 'react'
import type { HealthCheckResult } from '../../shared/ipc'

type CheckState = 'idle' | 'checking' | HealthCheckResult

export function SetupApp() {
  const [llm, setLlm] = useState<CheckState>('idle')
  const [voice, setVoice] = useState<CheckState>('idle')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    setLlm('checking')
    setVoice('checking')
    const [llmResult, voiceResult] = await Promise.all([
      window.ukaga.healthCheckLlm(),
      window.ukaga.healthCheckVoice(),
    ])
    setLlm(llmResult)
    setVoice(voiceResult)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const finish = async (): Promise<void> => {
    setBusy(true)
    try {
      await window.ukaga.completeFirstRun()
      window.ukaga.openAdmin()
      window.close()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="setup-shell">
      <header className="setup-header">
        <p className="setup-eyebrow">デスクトップマスコット</p>
        <h1>ukaga</h1>
        <p className="setup-lead">
          会話と音声には、別途インストールしたローカルソフトが必要です。
          この画面で接続を確認してからはじめましょう。
        </p>
      </header>

      <section className="setup-card">
        <h2>1. Ollama（または OpenAI 互換サーバー）</h2>
        <p>
          応答生成用のローカル LLM です。未導入なら公式サイトからインストールし、
          ターミナルで <code>ollama serve</code> とモデル取得（例:{' '}
          <code>ollama pull gemma3:4b</code>）を行ってください。
        </p>
        <div className="setup-actions">
          <button
            type="button"
            className="btn"
            onClick={() => void window.ukaga.openExternal('https://ollama.com/')}
          >
            Ollama を開く
          </button>
          <StatusBadge state={llm} label="LLM" />
        </div>
      </section>

      <section className="setup-card">
        <h2>2. VOICEVOX 互換エンジン（任意）</h2>
        <p>
          音声合成用です。VOICEVOX / AivisSpeech / COEIROINK などを起動してください。
          未起動でもテキスト会話はできます（管理画面で音声をオフにもできます）。
        </p>
        <div className="setup-actions">
          <button
            type="button"
            className="btn"
            onClick={() =>
              void window.ukaga.openExternal('https://voicevox.hiroshiba.jp/')
            }
          >
            VOICEVOX を開く
          </button>
          <StatusBadge state={voice} label="音声" />
        </div>
      </section>

      <section className="setup-card">
        <h2>3. つぎのステップ</h2>
        <ul>
          <li>トレイまたはキャラ右クリックから「管理画面を開く」</li>
          <li>モデル名・話者・人格を好みに合わせる</li>
          <li>バルーンから話しかけてみる</li>
        </ul>
      </section>

      <footer className="setup-footer">
        <button type="button" className="btn ghost" onClick={() => void refresh()}>
          再チェック
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={busy}
          onClick={() => void finish()}
        >
          {busy ? '保存中…' : 'はじめる'}
        </button>
      </footer>
    </div>
  )
}

function StatusBadge({
  state,
  label,
}: {
  state: CheckState
  label: string
}) {
  if (state === 'idle' || state === 'checking') {
    return (
      <span className="status pending">
        {label}: {state === 'checking' ? '確認中…' : '未確認'}
      </span>
    )
  }
  if (state.ok) {
    return <span className="status ok">{label}: 接続OK</span>
  }
  return (
    <span className="status ng" title={state.detail ?? ''}>
      {label}: 未接続
    </span>
  )
}
