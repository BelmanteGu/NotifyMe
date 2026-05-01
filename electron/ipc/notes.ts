/**
 * IPC handlers do domínio "notes".
 */

import { ipcMain } from 'electron'
import type { NotesService } from '../services/notes'
import type { NoteInput, NotePatch } from '../../src/types/note'

export function registerNotesIPC(
  service: NotesService,
  onChange: () => void
): void {
  ipcMain.handle('notes:list', () => service.list())

  ipcMain.handle('notes:create', (_event, input: NoteInput) => {
    const note = service.create(input)
    onChange()
    return note
  })

  ipcMain.handle('notes:update', (_event, id: string, patch: NotePatch) => {
    const note = service.update(id, patch)
    if (note) onChange()
    return note
  })

  ipcMain.handle('notes:delete', (_event, id: string) => {
    const ok = service.delete(id)
    if (ok) onChange()
    return ok
  })

  ipcMain.handle('notes:clear', () => {
    const count = service.clear()
    if (count > 0) onChange()
    return count
  })
}
