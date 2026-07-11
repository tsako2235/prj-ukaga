import type { UkagaApi } from '../shared/ipc'

declare global {
  interface Window {
    ukaga: UkagaApi
  }
}

export {}
