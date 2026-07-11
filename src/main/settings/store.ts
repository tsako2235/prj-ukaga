import Store from 'electron-store'
import { DEFAULT_SETTINGS, type AppSettings } from '../../shared/settings'

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

let store: Store<AppSettings> | null = null

function getStore(): Store<AppSettings> {
  if (!store) {
    store = new Store<AppSettings>({
      name: 'settings',
      defaults: DEFAULT_SETTINGS,
    })
  }
  return store
}

export function getSettings(): AppSettings {
  return getStore().store
}

function deepMerge<T extends object>(base: T, patch: DeepPartial<T>): T {
  const result = { ...base }
  for (const key of Object.keys(patch) as (keyof T)[]) {
    const patchValue = patch[key]
    if (patchValue === undefined) continue
    const baseValue = base[key]
    if (
      patchValue !== null &&
      typeof patchValue === 'object' &&
      !Array.isArray(patchValue) &&
      typeof baseValue === 'object' &&
      baseValue !== null &&
      !Array.isArray(baseValue)
    ) {
      result[key] = deepMerge(
        baseValue as object,
        patchValue as DeepPartial<object>,
      ) as T[keyof T]
    } else {
      result[key] = patchValue as T[keyof T]
    }
  }
  return result
}

export function setSettings(patch: DeepPartial<AppSettings>): AppSettings {
  const next = deepMerge(getSettings(), patch)
  getStore().store = next
  return next
}
