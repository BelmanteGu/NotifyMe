import { ref, computed } from 'vue'

/**
 * Composable global do Timer (countdown).
 *
 * Estado vive no escopo do módulo (singleton) — toda chamada de
 * useTimer() retorna o mesmo state. Isso garante que o timer continua
 * rodando mesmo quando o usuário troca pra outra view (Lembretes,
 * Cronômetro) e volta.
 *
 * Limitação: o timer roda no Renderer process. Se a janela main fechar
 * (closed/quit, não hide), o timer some. Hide preserva (Renderer fica vivo).
 */

const totalSeconds = ref(25 * 60) // default 25 min (Pomodoro clássico)
const remainingSeconds = ref(25 * 60)
const isRunning = ref(false)
let intervalId: number | null = null

const formattedTime = computed(() => {
  const total = Math.max(0, remainingSeconds.value)
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
})

/** Progresso 0–100 — útil pra circular progress ring. */
const progress = computed(() => {
  if (totalSeconds.value === 0) return 0
  const elapsed = totalSeconds.value - remainingSeconds.value
  return Math.min(100, (elapsed / totalSeconds.value) * 100)
})

function tick() {
  remainingSeconds.value--
  if (remainingSeconds.value <= 0) {
    handleComplete()
  }
}

function start() {
  if (isRunning.value || remainingSeconds.value <= 0) return
  isRunning.value = true
  intervalId = window.setInterval(tick, 1000)
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
  remainingSeconds.value = totalSeconds.value
}

function setMinutes(mins: number) {
  pause()
  totalSeconds.value = Math.max(1, Math.min(600, mins)) * 60
  remainingSeconds.value = totalSeconds.value
}

function handleComplete() {
  pause()
  remainingSeconds.value = 0

  // Em vez de Notification + 3 beeps que somem em segundos, abre uma
  // janela persistente always-on-top com som em loop até o usuário
  // confirmar. Mesmo padrão dos lembretes — diferencial do app.
  window.notifyme.timer.openAlert().catch((e) => {
    console.error('[useTimer] failed to open alert window:', e)
  })
}

export function useTimer() {
  return {
    totalSeconds,
    remainingSeconds,
    isRunning,
    formattedTime,
    progress,
    start,
    pause,
    reset,
    setMinutes,
  }
}
