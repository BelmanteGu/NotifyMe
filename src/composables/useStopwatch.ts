import { ref, computed } from 'vue'

/**
 * Composable global do Cronômetro.
 *
 * Diferente do timer: aqui o tempo aumenta a partir de zero,
 * sem estado-alvo. Estado singleton (escopo do módulo) — continua
 * rodando ao trocar de view.
 *
 * Implementação: salvamos `startedAt` (Date.now() do início) e
 * computamos `elapsedMs = Date.now() - startedAt` no tick. Isso é
 * mais robusto que `elapsedMs += 100` porque corrige drift se o
 * navegador atrasa setInterval (que é comum em background tabs).
 */

const elapsedMs = ref(0)
const isRunning = ref(false)
let startedAt = 0
let intervalId: number | null = null

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

function tick() {
  elapsedMs.value = Date.now() - startedAt
}

function start() {
  if (isRunning.value) return
  startedAt = Date.now() - elapsedMs.value
  isRunning.value = true
  intervalId = window.setInterval(tick, 50) // 20fps — suficiente pra centésimos lisos
}

function pause() {
  isRunning.value = false
  if (intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
}

function reset() {
  pause()
  elapsedMs.value = 0
}

export function useStopwatch() {
  return {
    elapsedMs,
    isRunning,
    formattedTime,
    start,
    pause,
    reset,
  }
}
