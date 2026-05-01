/**
 * IPC handlers do domínio "lists" + import/export .md via dialog nativo.
 */

import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'node:fs/promises'
import type { ListsService } from '../services/lists'
import type { TaskListInput, TaskListPatch } from '../../src/types/list'
import { listToMarkdown, markdownToList } from '../services/markdown'

interface RegisterContext {
  service: ListsService
  onChange: () => void
  /** Janela main usada como parent dos dialogs nativos. */
  getMainWindow: () => BrowserWindow | null
}

export function registerListsIPC(ctx: RegisterContext): void {
  const { service, onChange, getMainWindow } = ctx

  ipcMain.handle('lists:list', () => service.list())

  ipcMain.handle('lists:create', (_event, input: TaskListInput) => {
    const list = service.create(input)
    onChange()
    return list
  })

  ipcMain.handle('lists:update', (_event, id: string, patch: TaskListPatch) => {
    const list = service.update(id, patch)
    if (list) onChange()
    return list
  })

  ipcMain.handle('lists:delete', (_event, id: string) => {
    const ok = service.delete(id)
    if (ok) onChange()
    return ok
  })

  ipcMain.handle('lists:addItem', (_event, listId: string, text: string) => {
    const list = service.addItem(listId, text)
    if (list) onChange()
    return list
  })

  ipcMain.handle(
    'lists:toggleItem',
    (_event, listId: string, itemId: string) => {
      const list = service.toggleItem(listId, itemId)
      if (list) onChange()
      return list
    }
  )

  ipcMain.handle(
    'lists:updateItem',
    (_event, listId: string, itemId: string, text: string) => {
      const list = service.updateItemText(listId, itemId, text)
      if (list) onChange()
      return list
    }
  )

  ipcMain.handle(
    'lists:removeItem',
    (_event, listId: string, itemId: string) => {
      const list = service.removeItem(listId, itemId)
      if (list) onChange()
      return list
    }
  )

  // ─── Export pra .md via dialog nativo ────────────────────────
  ipcMain.handle('lists:exportMd', async (_event, listId: string) => {
    const list = service.findById(listId)
    if (!list) return { success: false, reason: 'not_found' as const }

    const win = getMainWindow()
    const defaultName = `${list.date}-${slugify(list.title)}.md`

    const result = await dialog.showSaveDialog(win ?? undefined!, {
      title: 'Exportar lista',
      defaultPath: defaultName,
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    })

    if (result.canceled || !result.filePath) {
      return { success: false, reason: 'canceled' as const }
    }

    try {
      const content = listToMarkdown(list)
      await fs.writeFile(result.filePath, content, 'utf8')
      return { success: true as const, path: result.filePath }
    } catch (e) {
      return {
        success: false as const,
        reason: 'write_failed' as const,
        message: (e as Error).message,
      }
    }
  })

  // ─── Export como imagem PNG ─────────────────────────────────
  ipcMain.handle(
    'lists:exportImage',
    async (
      _event,
      listId: string,
      rect: { x: number; y: number; width: number; height: number }
    ) => {
      const list = service.findById(listId)
      if (!list) return { success: false, reason: 'not_found' as const }

      const win = getMainWindow()
      if (!win)
        return { success: false, reason: 'no_window' as const }

      // Captura só a região da página de caderno via Electron API
      const image = await win.webContents.capturePage({
        x: Math.max(0, Math.floor(rect.x)),
        y: Math.max(0, Math.floor(rect.y)),
        width: Math.max(1, Math.ceil(rect.width)),
        height: Math.max(1, Math.ceil(rect.height)),
      })
      const buffer = image.toPNG()

      const defaultName = `${list.date}-${slugify(list.title)}.png`
      const result = await dialog.showSaveDialog(win, {
        title: 'Exportar como imagem',
        defaultPath: defaultName,
        filters: [{ name: 'PNG', extensions: ['png'] }],
      })

      if (result.canceled || !result.filePath) {
        return { success: false, reason: 'canceled' as const }
      }

      try {
        await fs.writeFile(result.filePath, buffer)
        return { success: true as const, path: result.filePath }
      } catch (e) {
        return {
          success: false as const,
          reason: 'write_failed' as const,
          message: (e as Error).message,
        }
      }
    }
  )

  // ─── Import de .md via dialog nativo ─────────────────────────
  ipcMain.handle('lists:importMd', async () => {
    const win = getMainWindow()

    const result = await dialog.showOpenDialog(win ?? undefined!, {
      title: 'Importar lista',
      filters: [{ name: 'Markdown', extensions: ['md'] }],
      properties: ['openFile'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, reason: 'canceled' as const }
    }

    try {
      const content = await fs.readFile(result.filePaths[0], 'utf8')
      const parsed = markdownToList(content)
      const list = service.createFromImport(parsed)
      onChange()
      return { success: true as const, list }
    } catch (e) {
      return {
        success: false as const,
        reason: 'parse_failed' as const,
        message: (e as Error).message,
      }
    }
  })
}

/** "Compras de mercado" → "compras-de-mercado". */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'lista'
}
