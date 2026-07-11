import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppSettings } from '../../shared/settings'
import type { DeepPartial } from '../../shared/ipc'
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

const SAVED_TOAST_MS = 1800

export function App() {
  const [tab, setTab] = useState<TabId>('llm')
  const [settings, setSettingsState] = useState<AppSettings | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [savedVisible, setSavedVisible] = useState(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const notifySaved = useCallback(() => {
    setSavedVisible(true)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => {
      setSavedVisible(false)
      savedTimer.current = null
    }, SAVED_TOAST_MS)
  }, [])

  useEffect(() => {
    void window.ukaga
      .getSettings()
      .then(setSettingsState)
      .catch((error) => setLoadError(String(error)))

    return window.ukaga.onSettingsChanged((next) => {
      setSettingsState(next)
    })
  }, [])

  useEffect(() => {
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current)
    }
  }, [])

  const patchSettings = useCallback(
    async (patch: DeepPartial<AppSettings>) => {
      const next = await window.ukaga.setSettings({ patch })
      setSettingsState(next)
      notifySaved()
      return next
    },
    [notifySaved],
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
          <CharacterTab
            settings={settings}
            patchSettings={patchSettings}
            notifySaved={notifySaved}
          />
        )}
        {tab === 'behavior' && (
          <BehaviorTab settings={settings} patchSettings={patchSettings} />
        )}
      </main>
      <div
        className={
          savedVisible ? 'save-toast visible' : 'save-toast'
        }
        role="status"
        aria-live="polite"
      >
        保存済み ✓
      </div>
    </div>
  )
}
