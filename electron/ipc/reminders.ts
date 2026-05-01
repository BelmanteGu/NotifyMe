/**
 * IPC handlers do domínio "reminders".
 *
 * Cada `ipcMain.handle('canal', fn)` registra um endpoint que o Renderer
 * pode chamar via `ipcRenderer.invoke('canal', ...args)`.
 *
 * Cria/deleta/markCompleted também sincronizam o scheduler:
 *   - create  → schedule()
 *   - delete  → cancel()
 *   - mark    → cancel() (deixou de ser pending)
 *
 * Veja docs/03-ipc.md.
 */

import { ipcMain } from 'electron'
import type { RemindersService } from '../services/reminders'
import type { ReminderScheduler } from '../scheduler'
import type { ReminderInput } from '../../src/types/reminder'

export function registerRemindersIPC(
  service: RemindersService,
  scheduler: ReminderScheduler
): void {
  ipcMain.handle('reminders:list', () => service.list())

  ipcMain.handle('reminders:create', (_event, input: ReminderInput) => {
    const reminder = service.create(input)
    scheduler.schedule(reminder)
    return reminder
  })

  ipcMain.handle('reminders:delete', (_event, id: string) => {
    const ok = service.delete(id)
    if (ok) scheduler.cancel(id)
    return ok
  })

  ipcMain.handle('reminders:markCompleted', (_event, id: string) => {
    const reminder = service.markCompleted(id)
    if (reminder) scheduler.cancel(id)
    return reminder
  })
}
