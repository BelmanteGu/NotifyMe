/**
 * Notificações nativas do SO.
 *
 * Esta é a notificação simples — aparece e some sozinha (Fase 3).
 * A notificação persistente (always-on-top, sem X) entra na Fase 4
 * como uma BrowserWindow customizada.
 */

import { Notification, type BrowserWindow } from 'electron'
import type { Reminder } from '../../src/types/reminder'

interface ShowOptions {
  /** Janela principal — pra trazer foco ao clicar na notificação */
  mainWin: BrowserWindow | null
}

export function showReminderNotification(
  reminder: Reminder,
  options: ShowOptions
): void {
  if (!Notification.isSupported()) {
    console.warn('[notifications] sistema nao suporta notificacoes nativas')
    return
  }

  const notif = new Notification({
    title: `Lembrete: ${reminder.title}`,
    body: reminder.description ?? 'Hora de fazer isso',
    silent: false,
  })

  notif.on('click', () => {
    const win = options.mainWin
    if (win) {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    }
  })

  notif.show()
  console.log(`[notifications] disparou: ${reminder.title}`)
}
