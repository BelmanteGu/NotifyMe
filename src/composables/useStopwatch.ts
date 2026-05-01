import { ref, computed } from 'vue'
import type { StopwatchState } from '@/types/timer'

/**
 * Composable do Cronômetro — STUB IPC.
 *
 * Mesma estrutura do useTimer: state real no Main, Renderer só
 * recebe ticks e dispara comandos. Tick a 50ms (20fps) — suficiente
 * pra centésimos parecerem fluidos no display.
 */

const elapsedMs = ref(0)
const isRunning = ref(false)
let initialized = false

function applyState(state: StopwatchState) {
  elapsedMs.value = state.elapsedMs
  isRunning.value = state.isRunning
}

const formattedTime = computed(() => {
  const total = elapsedMs.value
  const totalCs = Math.floor(total / 10) // centésimos
  const cs = totalCs % 100
  const totalSecs = Math.floor(totalCs / 100)
  const secs = totalSecs % 60
  const mins = Math.floor(totalSecs / 60) % 60
  const hours = Math.floor(totalSecs / 3600)
  return (
    `${String(hours).padStart(2, '0')}:` +
    `${String(mins).padStart(2, '0')}:` +
    `${String(secs).padStart(2, '0')}.` +
    `${String(cs).padStart(2, '0')}`
  )
})

export function useStopwatch() {
  if (!initialized) {
    initialized = true
    window.notifyme.stopwatch
      .getState()
      .then(applyState)
      .catch((e) => console.error('[useStopwatch] getState failed:', e))
    window.notifyme.stopwatch.onTick(applyState)
  }

  return {
    elapsedMs,
    isRunning,
    formattedTime,
    start: () => window.notifyme.stopwatch.start(),
    pause: () => window.notifyme.stopwatch.pause(),
    reset: () => window.notifyme.stopwatch.reset(),
  }
}
