/**
 * RemindersService — toda a lógica de CRUD do domínio "lembrete".
 *
 * Este service NÃO conhece IPC. Recebe um `Database` e expõe métodos
 * síncronos. O arquivo electron/ipc/reminders.ts é quem envelopa esses
 * métodos como handlers IPC chamados pelo Renderer.
 *
 * Separação:
 *   Renderer → IPC handler → Service → SQLite
 */

import type { Database } from 'node-sqlite3-wasm'
import { randomUUID } from 'node:crypto'
import type {
  Reminder,
  ReminderInput,
  ReminderStatus,
  Recurrence,
} from '../../src/types/reminder'

interface RawRow {
  id: string
  title: string
  description: string | null
  trigger_at: string
  recurrence: string
  status: string
  created_at: string
}

function mapRow(row: RawRow): Reminder {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    triggerAt: row.trigger_at,
    recurrence: row.recurrence as Recurrence,
    status: row.status as ReminderStatus,
    createdAt: row.created_at,
  }
}

export class RemindersService {
  constructor(private db: Database) {}

  list(): Reminder[] {
    const rows = this.db
      .prepare('SELECT * FROM reminders ORDER BY trigger_at ASC')
      .all() as unknown as RawRow[]
    return rows.map(mapRow)
  }

  findById(id: string): Reminder | null {
    const row = this.db
      .prepare('SELECT * FROM reminders WHERE id = ?')
      .get([id]) as unknown as RawRow | undefined
    return row ? mapRow(row) : null
  }

  create(input: ReminderInput): Reminder {
    const reminder: Reminder = {
      ...input,
      id: randomUUID(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    }

    this.db
      .prepare(
        `INSERT INTO reminders
         (id, title, description, trigger_at, recurrence, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run([
        reminder.id,
        reminder.title,
        reminder.description ?? null,
        reminder.triggerAt,
        reminder.recurrence,
        reminder.status,
        reminder.createdAt,
      ])

    return reminder
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM reminders WHERE id = ?').run([id])
    return (result.changes ?? 0) > 0
  }

  markCompleted(id: string): Reminder | null {
    this.db
      .prepare("UPDATE reminders SET status = 'completed' WHERE id = ?")
      .run([id])
    return this.findById(id)
  }
}
