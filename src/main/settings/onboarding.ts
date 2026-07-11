import Store from 'electron-store'

type OnboardingState = {
  completedFirstRun: boolean
}

let store: Store<OnboardingState> | null = null

function getStore(): Store<OnboardingState> {
  if (!store) {
    store = new Store<OnboardingState>({
      name: 'onboarding',
      defaults: {
        completedFirstRun: false,
      },
    })
  }
  return store
}

export function isFirstRunCompleted(): boolean {
  return getStore().get('completedFirstRun')
}

export function markFirstRunCompleted(): void {
  getStore().set('completedFirstRun', true)
}
