/**
 * StopwatchService — estado do cronômetro no Main process.
 *
 * Mesma motivação do TimerService: state canônico no Main, multiplas
 * janelas sincronizadas via broadcast, sobrevive a fechar a main window.
 *
 * Anti-drift: salvamos `startedAt: Date.now()` no início e calculamos
 * `elapsedMs = Date.now() - startedAt` em cada tick. Mais robusto que
 * incrementar elapsedMs += INTERVAL.
 *
 * Frequência do tick: 50ms (20fps). Suficiente pra centésimos parecerem
 * fluidos visualmente, sem sobrecarregar IPC.
 */

import { EventEmitter } from 'node:events'
import type { StopwatchState } from '../../src/types/timer'

const TICK_INTERVAL_MS = 50

export class StopwatchService extends EventEmitter {
  private elapsedMs = 0
  private isRunning = false
  private startedAt = 0
  private intervalId: NodeJS.Timeout | null = null

  getState(): StopwatchState {
    return {
      elapsedMs: this.elapsedMs,
      isRunning: this.isRunning,
    }
  }

  start(): void {
    if (this.isRunning) return
    this.startedAt = Date.now() - this.elapsedMs
    this.isRunning = true
    this.intervalId = setInterval(() => this.tick(), TICK_INTERVAL_MS)
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
    this.elapsedMs = 0
    this.emitState()
  }

  destroy(): void {
    if (this.intervalId) clearInterval(this.intervalId)
    this.intervalId = null
    this.removeAllListeners()
  }

  private tick(): void {
    this.elapsedMs = Date.now() - this.startedAt
    this.emitState()
  }

  private emitState(): void {
    this.emit('tick', this.getState())
  }
}
