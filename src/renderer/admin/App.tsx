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

function deepMerge<T extends object>(target: T, patch: any): T {
  const result = { ...target } as any
  for (const key in patch) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      const value = patch[key]
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = deepMerge(result[key] || {}, value)
      } else {
        result[key] = value
      }
    }
  }
  return result
}

export function App() {
  const [tab, setTab] = useState<TabId>('llm')
  const [settings, setSettingsState] = useState<AppSettings | null>(null)
  const [draft, setDraft] = useState<AppSettings | null>(null)
  const [persona, setPersona] = useState<string>('')
  const [draftPersona, setDraftPersona] = useState<string>('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [savedVisible, setSavedVisible] = useState(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const settingsRef = useRef<AppSettings | null>(null)
  const personaRef = useRef<string>('')

  settingsRef.current = settings
  personaRef.current = persona

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
      .then((data) => {
        setSettingsState(data)
        setDraft(data)
      })
      .catch((error) => setLoadError(String(error)))

    void window.ukaga
      .getPersona()
      .then((content) => {
        setPersona(content)
        setDraftPersona(content)
      })
      .catch((error) => console.error('Failed to get persona:', error))

    const unsubSettings = window.ukaga.onSettingsChanged((next) => {
      setSettingsState(next)
      setDraft((prev) => {
        if (!prev) return next
        // 未保存の変更がない場合は完全に同期
        const isDirty = JSON.stringify(settingsRef.current) !== JSON.stringify(prev)
        if (!isDirty) return next
        // 編集中の場合はバルーン位置とウィンドウサイズのみ最新をマージ
        return {
          ...prev,
          balloon: next.balloon,
          window: next.window,
        }
      })
    })

    const unsubPersona = window.ukaga.onPersonaChanged((content) => {
      setPersona(content)
      setDraftPersona((prev) => {
        // 未保存の変更がない場合のみ同期
        const isDirty = personaRef.current !== prev
        if (!isDirty) return content
        return prev
      })
    })

    return () => {
      unsubSettings()
      unsubPersona()
    }
  }, [])

  useEffect(() => {
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current)
    }
  }, [])

  const updateDraft = useCallback((patch: DeepPartial<AppSettings>) => {
    setDraft((prev) => {
      if (!prev) return null
      return deepMerge(prev, patch)
    })
  }, [])

  const handleSave = useCallback(async () => {
    if (!draft) return
    const nextSettings = await window.ukaga.setSettings({ patch: draft })
    setSettingsState(nextSettings)
    setDraft(nextSettings)

    if (persona !== draftPersona) {
      const nextPersona = await window.ukaga.setPersona({ content: draftPersona })
      setPersona(nextPersona)
      setDraftPersona(nextPersona)
    }

    notifySaved()
  }, [draft, draftPersona, persona, notifySaved])

  const handleCancel = useCallback(() => {
    if (settings) {
      setDraft(settings)
    }
    setDraftPersona(persona)
  }, [settings, persona])

  if (loadError) {
    return <div className="page-error">設定の読み込みに失敗しました: {loadError}</div>
  }

  if (!settings || !draft) {
    return <div className="page-loading">読み込み中…</div>
  }

  const isDirty =
    JSON.stringify(settings) !== JSON.stringify(draft) ||
    persona !== draftPersona

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
      <div className="admin-content-area">
        <main className="admin-main">
          {tab === 'llm' && (
            <LlmTab settings={draft} updateDraft={updateDraft} />
          )}
          {tab === 'voice' && (
            <VoiceTab settings={draft} updateDraft={updateDraft} />
          )}
          {tab === 'character' && (
            <CharacterTab
              settings={draft}
              updateDraft={updateDraft}
              draftPersona={draftPersona}
              setDraftPersona={setDraftPersona}
              notifySaved={notifySaved}
            />
          )}
          {tab === 'behavior' && (
            <BehaviorTab settings={draft} updateDraft={updateDraft} />
          )}
        </main>
        <footer className="admin-footer">
          {isDirty && (
            <span className="dirty-indicator">未保存の変更があります</span>
          )}
          <button
            type="button"
            className="button-cancel"
            disabled={!isDirty}
            onClick={handleCancel}
          >
            変更を破棄
          </button>
          <button
            type="button"
            className="button-save"
            disabled={!isDirty}
            onClick={() => void handleSave()}
          >
            変更を保存
          </button>
        </footer>
      </div>
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
