/**
 * Janela de alerta persistente — o diferencial do NotifyMe.
 *
 * Quando um lembrete dispara, em vez de notificação nativa que some
 * em 5s, abre uma BrowserWindow `always-on-top`, sem `frame` (sem botão X
 * nativo), centralizada, com 2 botões grandes:
 *   - Concluído  → marca como completed e fecha a janela
 *   - Adiar 10m  → adia o triggerAt em 10 min e fecha a janela
 *
 * O usuário pode forçar fechar com Alt+F4 — não tentamos prevenir, seria
 * draconian. O ponto é tornar a notificação **muito difícil de ignorar**,
 * não impossível de fechar.
 *
 * Cada lembrete tem no máximo uma janela aberta por vez — se o trigger
 * dispara enquanto a janela de uma instância anterior ainda está aberta,
 * a janela existente recebe foco em vez de abrir outra.
 *
 * Veja docs/06-notificacao-persistente.md.
 */

import { BrowserWindow } from 'electron'
import path from 'node:path'
import type { Reminder } from '../../src/types/reminder'

interface OpenAlertContext {
  /** Pasta com os builds compilados — definido em main.ts. */
  rendererDist: string
  /** URL do Vite em modo dev. Vazio em produção. */
  devServerUrl?: string
  /** Caminho absoluto pro preload.mjs. */
  preloadPath: string
  /** Map mantido em main.ts pra controlar janelas abertas e evitar duplicatas. */
  openWindows: Map<string, BrowserWindow>
}

export function openAlertWindow(
  reminder: Reminder,
  ctx: OpenAlertContext
): void {
  // Se já existe uma janela pra esse reminder, foca nela em vez de criar outra
  const existing = ctx.openWindows.get(reminder.id)
  if (existing && !existing.isDestroyed()) {
    if (existing.isMinimized()) existing.restore()
    existing.show()
    existing.focus()
    return
  }

  const win = new BrowserWindow({
    width: 480,
    height: 320,
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    center: true,
    show: false,
    backgroundColor: '#0D0D0E',
    title: `Lembrete: ${reminder.title}`,
    webPreferences: {
      preload: ctx.preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  ctx.openWindows.set(reminder.id, win)

  win.on('closed', () => {
    ctx.openWindows.delete(reminder.id)
  })

  win.once('ready-to-show', () => {
    win.show()
    win.focus()
    // Pisca o ícone na barra de tarefas pra atrair atenção
    win.flashFrame(true)
  })

  // Visível em todos os workspaces virtuais do Windows
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  // Carrega o mesmo bundle Vue, mas com URL params indicando a view de alerta
  if (ctx.devServerUrl) {
    win.loadURL(`${ctx.devServerUrl}?view=alert&id=${reminder.id}`)
  } else {
    win.loadFile(path.join(ctx.rendererDist, 'index.html'), {
      search: `view=alert&id=${reminder.id}`,
    })
  }
}

export function closeAllAlertWindows(
  openWindows: Map<string, BrowserWindow>
): void {
  for (const win of openWindows.values()) {
    if (!win.isDestroyed()) {
      win.destroy()
    }
  }
  openWindows.clear()
}
