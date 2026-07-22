import { isDemoModeEnabled } from './demoMode'

export function isDemoRuntime(): boolean {
  return isDemoModeEnabled()
}

export function shouldUseRealtime(): boolean {
  // Realtime is opt-in to avoid noisy websocket failures in unstable/dev environments.
  return !isDemoRuntime() && import.meta.env.VITE_ENABLE_REALTIME === 'true'
}
