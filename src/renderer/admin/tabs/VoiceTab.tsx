import { useState } from 'react'
import type { AppSettings, VoiceEngineKind } from '../../../shared/settings'
import { VOICE_ENGINE_DEFAULT_URLS } from '../../../shared/defaults'
import type { DeepPartial, SpeakerInfo } from '../../../shared/ipc'

type Props = {
  settings: AppSettings
  patchSettings: (patch: DeepPartial<AppSettings>) => Promise<AppSettings>
}

export function VoiceTab({ settings, patchSettings }: Props) {
  const voice = settings.voice
  const [speakers, setSpeakers] = useState<SpeakerInfo[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onEngineChange(engine: VoiceEngineKind) {
    const baseUrl =
      engine === 'custom'
        ? voice.baseUrl
        : VOICE_ENGINE_DEFAULT_URLS[engine]
    await patchSettings({ voice: { engine, baseUrl } })
    setSpeakers([])
    setStatus(null)
  }

  async function fetchSpeakers() {
    setBusy(true)
    setStatus('話者一覧を取得中…')
    try {
      const health = await window.ukaga.healthCheckVoice()
      if (!health.ok) {
        setStatus(health.detail ?? '接続に失敗しました')
        setSpeakers([])
        return
      }
      const list = await window.ukaga.listVoiceSpeakers()
      setSpeakers(list)
      setStatus(`接続成功（話者スタイル ${list.length} 件）`)
      if (list.length > 0 && !list.some((s) => s.id === voice.speakerId)) {
        await patchSettings({ voice: { speakerId: list[0].id } })
      }
    } catch (error) {
      setStatus(String(error))
      setSpeakers([])
    } finally {
      setBusy(false)
    }
  }

  async function testPlay() {
    setBusy(true)
    setStatus('合成中…')
    try {
      const result = await window.ukaga.testPlayVoice()
      if (!result.ok) {
        setStatus(result.detail ?? 'テスト再生に失敗しました')
        return
      }
      const wav = (result as { wav?: ArrayBuffer }).wav
      if (!wav) {
        setStatus('WAV が空でした')
        return
      }
      const ctx = new AudioContext()
      const buffer = await ctx.decodeAudioData(wav.slice(0))
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      source.start()
      setStatus('テスト再生中')
      source.onended = () => {
        void ctx.close()
        setStatus('テスト再生が完了しました')
      }
    } catch (error) {
      setStatus(String(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="tab-panel">
      <h1>音声設定</h1>
      <p className="tab-lead">VOICEVOX 互換エンジンに接続します。</p>

      <label className="field checkbox">
        <input
          type="checkbox"
          checked={voice.enabled}
          onChange={(e) =>
            void patchSettings({ voice: { enabled: e.target.checked } })
          }
        />
        <span>音声を使う</span>
      </label>

      <label className="field">
        <span>エンジン</span>
        <select
          value={voice.engine}
          onChange={(e) => void onEngineChange(e.target.value as VoiceEngineKind)}
        >
          <option value="voicevox">VOICEVOX</option>
          <option value="aivisspeech">AivisSpeech</option>
          <option value="coeiroink">COEIROINK</option>
          <option value="custom">カスタム</option>
        </select>
      </label>

      <label className="field">
        <span>接続先URL</span>
        <input
          type="text"
          value={voice.baseUrl}
          onChange={(e) => void patchSettings({ voice: { baseUrl: e.target.value } })}
        />
      </label>

      <label className="field">
        <span>話者</span>
        {speakers.length > 0 ? (
          <select
            value={voice.speakerId}
            onChange={(e) =>
              void patchSettings({ voice: { speakerId: Number(e.target.value) } })
            }
          >
            {speakers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} / {s.styleName} ({s.id})
              </option>
            ))}
          </select>
        ) : (
          <input
            type="number"
            value={voice.speakerId}
            onChange={(e) =>
              void patchSettings({
                voice: { speakerId: Number(e.target.value) || 0 },
              })
            }
          />
        )}
      </label>

      <label className="field">
        <span>話速（{voice.speedScale.toFixed(2)}）</span>
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.05}
          value={voice.speedScale}
          onChange={(e) =>
            void patchSettings({ voice: { speedScale: Number(e.target.value) } })
          }
        />
      </label>

      <label className="field">
        <span>音高（{voice.pitchScale.toFixed(2)}）</span>
        <input
          type="range"
          min={-0.15}
          max={0.15}
          step={0.01}
          value={voice.pitchScale}
          onChange={(e) =>
            void patchSettings({ voice: { pitchScale: Number(e.target.value) } })
          }
        />
      </label>

      <label className="field">
        <span>音量（{voice.volumeScale.toFixed(2)}）</span>
        <input
          type="range"
          min={0}
          max={2}
          step={0.05}
          value={voice.volumeScale}
          onChange={(e) =>
            void patchSettings({ voice: { volumeScale: Number(e.target.value) } })
          }
        />
      </label>

      <div className="actions">
        <button type="button" disabled={busy} onClick={() => void fetchSpeakers()}>
          接続テスト / 話者取得
        </button>
        <button type="button" disabled={busy} onClick={() => void testPlay()}>
          テスト再生
        </button>
        {status && <span className="status-text">{status}</span>}
      </div>
    </section>
  )
}
