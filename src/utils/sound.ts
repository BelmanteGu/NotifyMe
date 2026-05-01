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
