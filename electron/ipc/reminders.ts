/**
 * IPC handlers do domínio "reminders".
 *
 * Cada `ipcMain.handle('canal', fn)` registra um endpoint que o Renderer
 * pode chamar via `ipcRenderer.invoke('canal', ...args)`.
 *
 * Veja docs/03-ipc.md.
 */

import { ipcMain } from 'electron'
import type { RemindersService } from '../services/reminders'
import type { ReminderInput } from '../../src/types/reminder'

export function registerRemindersIPC(service: RemindersService): void {
  ipcMain.handle('reminders:list', () => service.list())

  ipcMain.handle('reminders:create', (_event, input: ReminderInput) =>
    service.create(input)
  )

  ipcMain.handle('reminders:delete', (_event, id: string) =>
    service.delete(id)
  )

  ipcMain.handle('reminders:markCompleted', (_event, id: string) =>
    service.markCompleted(id)
  )
}
