import { useCallback, useEffect, useState } from 'react'
import type { AppSettings } from '../../shared/settings'
import { BehaviorTab } from './tabs/BehaviorTab'
import { CharacterTab } from './tabs/CharacterTab'
import { LlmTab } from './tabs/LlmTab'
import { VoiceTab } from './tabs/VoiceTab'

type TabId = 'llm' | 'voice' | 'character' | 'behavior'

const TABS: { id: TabId; label: string }[] = [
  { id: 'llm', label: 'LLM' },
  { id: 'voice', label: '音声' },
  { id: 'character', label: 'キャラクター' },
  { id: 'behavior', label: '挙動' },
]

export function App() {
  const [tab, setTab] = useState<TabId>('llm')
  const [settings, setSettingsState] = useState<AppSettings | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    void window.ukaga
      .getSettings()
      .then(setSettingsState)
      .catch((error) => setLoadError(String(error)))

    return window.ukaga.onSettingsChanged((next) => {
      setSettingsState(next)
    })
  }, [])

  const patchSettings = useCallback(
    async (patch: Parameters<typeof window.ukaga.setSettings>[0]['patch']) => {
      const next = await window.ukaga.setSettings({ patch })
      setSettingsState(next)
      return next
    },
    [],
  )

  if (loadError) {
    return <div className="page-error">設定の読み込みに失敗しました: {loadError}</div>
  }

  if (!settings) {
    return <div className="page-loading">読み込み中…</div>
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">ukaga</div>
        <nav className="admin-nav">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={tab === item.id ? 'nav-item active' : 'nav-item'}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="admin-main">
        {tab === 'llm' && (
          <LlmTab settings={settings} patchSettings={patchSettings} />
        )}
        {tab === 'voice' && (
          <VoiceTab settings={settings} patchSettings={patchSettings} />
        )}
        {tab === 'character' && (
          <CharacterTab settings={settings} patchSettings={patchSettings} />
        )}
        {tab === 'behavior' && (
          <BehaviorTab settings={settings} patchSettings={patchSettings} />
        )}
      </main>
    </div>
  )
}
