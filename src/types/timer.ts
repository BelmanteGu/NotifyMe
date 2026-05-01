/**
 * Tipos do estado do Timer e Cronômetro.
 *
 * Compartilhados entre Main process (services em electron/services/)
 * e Renderer (composables em src/composables/). Ambos precisam concordar
 * com o shape do estado pra serialização IPC funcionar.
 */

export interface TimerState {
  totalSeconds: number
  remainingSeconds: number
  isRunning: boolean
}

export interface StopwatchState {
  elapsedMs: number
  isRunning: boolean
}
