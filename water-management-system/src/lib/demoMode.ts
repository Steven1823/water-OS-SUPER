const DEMO_MODE_STORAGE_KEY = 'wms_demo_mode'

export function isDemoModeEnabled(): boolean {
  return window.localStorage.getItem(DEMO_MODE_STORAGE_KEY) === 'true'
}

export function setDemoModeEnabled(enabled: boolean): void {
  if (enabled) {
    window.localStorage.setItem(DEMO_MODE_STORAGE_KEY, 'true')
    return
  }

  window.localStorage.removeItem(DEMO_MODE_STORAGE_KEY)
}
