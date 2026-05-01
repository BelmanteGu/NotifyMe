/**
 * TimerService — estado do countdown timer no Main process.
 *
 * Antes vivia no Renderer (composable singleton). Mudamos pra Main
 * porque:
 *   1. Permite múltiplas janelas (main + futuro widget flutuante)
 *      sempre sincronizadas com o mesmo estado canônico
 *   2. Timer continua rodando se a janela main for hidden (ou destruída
 *      e recriada) — só fica vinculado ao processo do Main, que vive
 *      enquanto o app não recebe Quit
 *   3. Refactor pré-requisito pro futuro adiar 5 min do alarme
 *
 * EventEmitter:
 *   - 'tick' → TimerState a cada segundo + após start/pause/reset/setSeconds
 *   - 'complete' → quando remainingSeconds chega a 0
 *
 * O main.ts subscreve esses eventos pra:
 *   - Broadcast 'timer:tick' pra todas as BrowserWindows
 *   - Abrir a TimerAlertWindow no 'complete'
 */

import { EventEmitter } from 'node:events'
import type { TimerState } from '../../src/types/timer'

const MIN_SECONDS = 1
const MAX_SECONDS = 99 * 60 + 59 // 99:59

export class TimerService extends EventEmitter {
  private totalSeconds = 25 * 60 // default: Pomodoro 25 min
  private remainingSeconds = 25 * 60
  private isRunning = false
  private intervalId: NodeJS.Timeout | null = null

  getState(): TimerState {
    return {
      totalSeconds: this.totalSeconds,
      remainingSeconds: this.remainingSeconds,
      isRunning: this.isRunning,
    }
  }

  start(): void {
    if (this.isRunning || this.remainingSeconds <= 0) return
    this.isRunning = true
    this.intervalId = setInterval(() => this.tick(), 1000)
    this.emitState()
  }

  pause(): void {
    if (!this.isRunning) return
    this.isRunning = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.emitState()
  }

  reset(): void {
    this.pause()
    this.remainingSeconds = this.totalSeconds
    this.emitState()
  }

  setSeconds(seconds: number): void {
    this.pause()
    this.totalSeconds = Math.max(
      MIN_SECONDS,
      Math.min(MAX_SECONDS, Math.floor(seconds))
    )
    this.remainingSeconds = this.totalSeconds
    this.emitState()
  }

  destroy(): void {
    if (this.intervalId) clearInterval(this.intervalId)
    this.intervalId = null
    this.removeAllListeners()
  }

  private tick(): void {
    this.remainingSeconds--
    if (this.remainingSeconds <= 0) {
      this.handleComplete()
    } else {
      this.emitState()
    }
  }

  private handleComplete(): void {
    this.pause()
    this.remainingSeconds = 0
    this.emitState()
    this.emit('complete')
  }

  private emitState(): void {
    this.emit('tick', this.getState())
  }
}
