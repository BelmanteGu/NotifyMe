import { ref, computed } from 'vue'
import type { TimerState } from '@/types/timer'

/**
 * Composable do Timer — STUB IPC.
 *
 * O state real vive no Main process (electron/services/timer.ts).
 * Este composable só:
 *   1. Faz `getState()` na primeira vez pra hidratar os refs locais
 *   2. Subscreve `onTick(state)` pra atualizar quando o Main muda
 *   3. Expõe métodos start/pause/reset/setSeconds que enviam IPC
 *
 * Vantagens vs antiga implementação no Renderer:
 *   - Timer continua rodando se a janela main for hidden
 *   - Múltiplas janelas (futuro widget flutuante) sincronizadas
 *   - Renderer destruído → reabre, faz getState e ressincroniza
 */

const totalSeconds = ref(25 * 60)
const remainingSeconds = ref(25 * 60)
const isRunning = ref(false)
let initialized = false

function applyState(state: TimerState) {
  totalSeconds.value = state.totalSeconds
  remainingSeconds.value = state.remainingSeconds
  isRunning.value = state.isRunning
}

const formattedTime = computed(() => {
  const total = Math.max(0, remainingSeconds.value)
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
})

const progress = computed(() => {
  if (totalSeconds.value === 0) return 0
  const elapsed = totalSeconds.value - remainingSeconds.value
  return Math.min(100, (elapsed / totalSeconds.value) * 100)
})

export function useTimer() {
  if (!initialized) {
    initialized = true
    window.notifyme.timer
      .getState()
      .then(applyState)
      .catch((e) => console.error('[useTimer] getState failed:', e))
    window.notifyme.timer.onTick(applyState)
  }

  return {
    totalSeconds,
    remainingSeconds,
    isRunning,
    formattedTime,
    progress,
    start: () => window.notifyme.timer.start(),
    pause: () => window.notifyme.timer.pause(),
    reset: () => window.notifyme.timer.reset(),
    setMinutes: (mins: number) =>
      window.notifyme.timer.setSeconds(mins * 60),
    setSeconds: (seconds: number) =>
      window.notifyme.timer.setSeconds(seconds),
  }
}
