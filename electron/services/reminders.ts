/**
 * RemindersService — toda a lógica de CRUD do domínio "lembrete".
 *
 * Lê e escreve em um arquivo JSON via electron-store. Cada operação:
 *   1. Lê o array atual de `store.get('reminders')`
 *   2. Faz a transformação (push, filter, map)
 *   3. Escreve de volta com `store.set('reminders', ...)`
 *
 * O electron-store cuida da escrita atômica (tempfile + rename),
 * então não tem corrida e não tem lock.
 *
 * Pra centenas de lembretes isso é instantâneo.
 */

import type Store from 'electron-store'
import { randomUUID } from 'node:crypto'
import type { Reminder, ReminderInput } from '../../src/types/reminder'

interface StoreSchema {
  reminders: Reminder[]
  schemaVersion: number
}

export class RemindersService {
  constructor(private store: Store<StoreSchema>) {}

  list(): Reminder[] {
    return this.store.get('reminders', []).slice()
  }

  findById(id: string): Reminder | null {
    const all = this.store.get('reminders', [])
    return all.find((r) => r.id === id) ?? null
  }

  create(input: ReminderInput): Reminder {
    const reminder: Reminder = {
      ...input,
      id: randomUUID(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    }

    const all = this.store.get('reminders', [])
    this.store.set('reminders', [...all, reminder])
    return reminder
  }

  delete(id: string): boolean {
    const all = this.store.get('reminders', [])
    const filtered = all.filter((r) => r.id !== id)
    if (filtered.length === all.length) return false
    this.store.set('reminders', filtered)
    return true
  }

  markCompleted(id: string): Reminder | null {
    const all = this.store.get('reminders', [])
    const idx = all.findIndex((r) => r.id === id)
    if (idx === -1) return null

    const updated: Reminder = { ...all[idx], status: 'completed' }
    const next = [...all]
    next[idx] = updated
    this.store.set('reminders', next)
    return updated
  }

  updateTriggerAt(id: string, triggerAt: string): Reminder | null {
    const all = this.store.get('reminders', [])
    const idx = all.findIndex((r) => r.id === id)
    if (idx === -1) return null

    const updated: Reminder = { ...all[idx], triggerAt }
    const next = [...all]
    next[idx] = updated
    this.store.set('reminders', next)
    return updated
  }

  clearCompleted(): number {
    const all = this.store.get('reminders', [])
    const remaining = all.filter((r) => r.status !== 'completed')
    const removed = all.length - remaining.length
    if (removed > 0) {
      this.store.set('reminders', remaining)
    }
    return removed
  }

  /**
   * Adia o lembrete em N minutos a partir de AGORA (não do triggerAt original).
   * Usado pelo botão "Adiar 10 min" da janela de alerta.
   */
  snooze(id: string, minutes: number): Reminder | null {
    const newTriggerAt = new Date(Date.now() + minutes * 60_000).toISOString()
    return this.updateTriggerAt(id, newTriggerAt)
  }
}
