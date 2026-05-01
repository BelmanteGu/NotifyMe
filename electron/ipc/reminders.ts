/**
 * IPC handlers do domínio "reminders".
 *
 * Cada `ipcMain.handle('canal', fn)` registra um endpoint que o Renderer
 * pode chamar via `ipcRenderer.invoke('canal', ...args)`.
 *
 * Cria/deleta/mark/snooze/clear sincronizam:
 *   - scheduler (cancel/schedule)
 *   - onChange (notifica Renderer pra refresh — útil quando a mutação
 *     vem da janela de alerta secundária ou do scheduler em background)
 *
 * Veja docs/03-ipc.md.
 */

import { ipcMain } from 'electron'
import type { RemindersService } from '../services/reminders'
import type { ReminderScheduler } from '../scheduler'
import type { ReminderInput } from '../../src/types/reminder'

export function registerRemindersIPC(
  service: RemindersService,
  scheduler: ReminderScheduler,
  onChange: () => void
): void {
  ipcMain.handle('reminders:list', () => service.list())

  ipcMain.handle('reminders:getById', (_event, id: string) =>
    service.findById(id)
  )

  ipcMain.handle('reminders:create', (_event, input: ReminderInput) => {
    const reminder = service.create(input)
    scheduler.schedule(reminder)
    onChange()
    return reminder
  })

  ipcMain.handle('reminders:delete', (_event, id: string) => {
    const ok = service.delete(id)
    if (ok) {
      scheduler.cancel(id)
      onChange()
    }
    return ok
  })

  ipcMain.handle('reminders:markCompleted', (_event, id: string) => {
    const reminder = service.markCompleted(id)
    if (reminder) {
      scheduler.cancel(id)
      onChange()
    }
    return reminder
  })

  ipcMain.handle('reminders:snooze', (_event, id: string, minutes: number) => {
    const reminder = service.snooze(id, minutes)
    if (reminder) {
      scheduler.cancel(id)
      scheduler.schedule(reminder)
      onChange()
    }
    return reminder
  })

  ipcMain.handle('reminders:clearCompleted', () => {
    const removed = service.clearCompleted()
    if (removed > 0) onChange()
    return removed
  })
}
