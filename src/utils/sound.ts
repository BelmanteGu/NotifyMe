/**
 * Sons gerados via Web Audio API — sem arquivo externo, sem dependência.
 *
 * Usamos osciladores sine puros pra um som limpo, com envelope (ataque +
 * decay) pra evitar clicks. Cada função toca uma sequência de notas curtas.
 */

let audioContext: AudioContext | null = null

function getContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)()
  }
  // Se o contexto ficou suspended (políticas de autoplay), tenta resumir
  if (audioContext.state === 'suspended') {
    audioContext.resume()
  }
  return audioContext
}

function playNote(
  ctx: AudioContext,
  frequency: number,
  startAt: number,
  duration: number,
  volume = 0.22
): void {
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.frequency.value = frequency
  oscillator.type = 'sine'

  // Envelope ADR (Attack-Decay-Release) pra evitar clicks
  gainNode.gain.setValueAtTime(0, startAt)
  gainNode.gain.linearRampToValueAtTime(volume, startAt + 0.02)
  gainNode.gain.exponentialRampToValueAtTime(0.001, startAt + duration)

  oscillator.start(startAt)
  oscillator.stop(startAt + duration + 0.05)
}

/**
 * Som usado quando a janela de alerta abre (lembrete disparou).
 * Duas notas suaves, agradáveis (C5 → E5).
 */
export function playAlertSound(): void {
  try {
    const ctx = getContext()
    const now = ctx.currentTime
    playNote(ctx, 523.25, now, 0.4)         // C5
    playNote(ctx, 659.25, now + 0.18, 0.55) // E5
  } catch (e) {
    console.warn('[sound] failed to play alert sound:', e)
  }
}

/**
 * Som usado quando o timer chega a zero.
 * Mais urgente: 3 notas em padrão "ring-ring-RING".
 */
export function playTimerEndSound(): void {
  try {
    const ctx = getContext()
    const now = ctx.currentTime
    playNote(ctx, 659.25, now, 0.18, 0.25)         // E5
    playNote(ctx, 659.25, now + 0.25, 0.18, 0.25)  // E5
    playNote(ctx, 783.99, now + 0.55, 0.5, 0.28)   // G5 (mais alto, mais longo)
  } catch (e) {
    console.warn('[sound] failed to play timer sound:', e)
  }
}

// ─── Alarme em loop (timer) ────────────────────────────────────────

let alarmIntervalId: number | null = null
let alarmTimeoutId: number | null = null

/**
 * Inicia o alarme do timer. Toca um padrão de 3 notas (A5+A5+C#6) e
 * **repete a cada 1.4s** até o usuário parar via stopTimerAlarm().
 *
 * Auto-stop após 2 minutos (mesmo se ninguém clicar) — evita barulho
 * infinito caso a janela fique aberta sem usuário por perto.
 */
export function startTimerAlarm(): void {
  stopTimerAlarm() // garante que não tem outro loop rodando

  const playPattern = () => {
    try {
      const ctx = getContext()
      const now = ctx.currentTime
      playNote(ctx, 880.0, now, 0.15, 0.3)          // A5
      playNote(ctx, 880.0, now + 0.2, 0.15, 0.3)    // A5
      playNote(ctx, 1108.73, now + 0.45, 0.3, 0.32) // C#6 (mais agudo)
    } catch (e) {
      console.warn('[sound] alarm pattern failed:', e)
    }
  }

  playPattern() // toca imediatamente ao chamar
  alarmIntervalId = window.setInterval(playPattern, 1400)

  // Safety: para sozinho após 2 min se ninguém parou manualmente
  alarmTimeoutId = window.setTimeout(() => {
    stopTimerAlarm()
  }, 120_000)
}

/**
 * Para o alarme em loop. Idempotente — pode chamar várias vezes
 * sem problema.
 */
export function stopTimerAlarm(): void {
  if (alarmIntervalId !== null) {
    clearInterval(alarmIntervalId)
    alarmIntervalId = null
  }
  if (alarmTimeoutId !== null) {
    clearTimeout(alarmTimeoutId)
    alarmTimeoutId = null
  }
}
