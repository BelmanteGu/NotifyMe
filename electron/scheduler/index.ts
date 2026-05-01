/**
 * ReminderScheduler — agendador de lembretes baseado em setTimeout.
 *
 * Cada lembrete pendente tem um setTimeout próprio que dispara no
 * triggerAt exato. Quando um lembrete dispara, chama o callback
 * `onTrigger` (que vai mostrar notificação nativa).
 *
 * Recorrência:
 *   - 'once' — fica pendente após disparar (não auto-completa)
 *   - 'daily' — avança triggerAt em +1 dia e re-agenda
 *   - 'weekly' — +7 dias
 *
 * Lembretes cujo triggerAt já passou na hora do start (computer
 * estava desligado) disparam imediatamente. Pra recorrentes, o
 * scheduler avança triggerAt até a próxima ocorrência futura
 * antes de re-agendar.
 *
 * Limitação técnica: setTimeout no Node aceita delay máximo de
 * 2³¹-1 ms (~24.8 dias). Pra triggers muito distantes, agendamos
 * um wake-up nesse limite que apenas re-agenda — tipo um "watchdog".
 *
 * Veja docs/05-agendamento.md pra discussão completa.
 */

import type { RemindersService } from '../services/reminders'
import type { Reminder, Recurrence } from '../../src/types/reminder'

const MAX_TIMEOUT_MS = 2_147_483_647 // 2³¹-1, limite do setTimeout

export class ReminderScheduler {
  private timers = new Map<string, NodeJS.Timeout>()

  constructor(
    private remindersService: RemindersService,
    private onTrigger: (reminder: Reminder) => void,
    private onChange: () => void
  ) {}

  start(): void {
    const all = this.remindersService.list()
    let scheduled = 0
    for (const r of all) {
      if (r.status === 'pending') {
        this.schedule(r)
        scheduled++
      }
    }
    console.log(`[scheduler] iniciado com ${scheduled} lembretes pendentes`)
  }

  schedule(reminder: Reminder): void {
    this.cancel(reminder.id)

    const triggerAt = new Date(reminder.triggerAt).getTime()
    const delay = triggerAt - Date.now()

    if (delay <= 0) {
      // Já passou — dispara assíncrono pra não bloquear o caller
      setImmediate(() => this.fire(reminder.id))
      return
    }

    if (delay > MAX_TIMEOUT_MS) {
      // Muito longe no futuro — agenda um watchdog pra reavaliar
      const timer = setTimeout(() => {
        this.timers.delete(reminder.id)
        const fresh = this.remindersService.findById(reminder.id)
        if (fresh && fresh.status === 'pending') {
          this.schedule(fresh)
        }
      }, MAX_TIMEOUT_MS)
      this.timers.set(reminder.id, timer)
      return
    }

    const timer = setTimeout(() => this.fire(reminder.id), delay)
    this.timers.set(reminder.id, timer)
  }

  cancel(id: string): void {
    const timer = this.timers.get(id)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(id)
    }
  }

  stopAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer)
    }
    this.timers.clear()
  }

  private fire(id: string): void {
    this.timers.delete(id)
    const reminder = this.remindersService.findById(id)
    if (!reminder || reminder.status !== 'pending') return

    this.onTrigger(reminder)

    if (reminder.recurrence === 'once') {
      // Pra 'once', fica pendente — usuário marca como concluído manualmente
      return
    }

    // Recorrência: avança triggerAt até a próxima futura e re-agenda
    const nextTriggerAt = computeNextTrigger(
      reminder.triggerAt,
      reminder.recurrence
    )
    const updated = this.remindersService.updateTriggerAt(
      reminder.id,
      nextTriggerAt
    )
    if (updated) {
      this.schedule(updated)
      this.onChange()
    }
  }
}

function computeNextTrigger(currentISO: string, recurrence: Recurrence): string {
  const next = new Date(currentISO)
  const now = Date.now()

  // Avança até dar futuro (importante quando o computador estava desligado
  // por dias — pula direto pra próxima ocorrência válida em vez de spammar
  // notificações de todos os dias perdidos)
  do {
    if (recurrence === 'daily') {
      next.setDate(next.getDate() + 1)
    } else if (recurrence === 'weekly') {
      next.setDate(next.getDate() + 7)
    } else {
      break
    }
  } while (next.getTime() <= now)

  return next.toISOString()
}
