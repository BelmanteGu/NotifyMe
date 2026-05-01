/**
 * NotifyMe — Preload Script
 *
 * Roda ANTES do Renderer (Vue) carregar.
 * Ponte segura entre o Renderer e o Main: expõe APIs específicas
 * via window.notifyme.
 *
 * Veja docs/03-ipc.md.
 */

import { contextBridge, ipcRenderer } from 'electron'
import type { Reminder, ReminderInput } from '../src/types/reminder'
import type { NotifyMeAPI } from '../src/types/api'

const api: NotifyMeAPI = {
  reminders: {
    list: (): Promise<Reminder[]> =>
      ipcRenderer.invoke('reminders:list'),

    create: (input: ReminderInput): Promise<Reminder> =>
      ipcRenderer.invoke('reminders:create', input),

    delete: (id: string): Promise<boolean> =>
      ipcRenderer.invoke('reminders:delete', id),

    markCompleted: (id: string): Promise<Reminder | null> =>
      ipcRenderer.invoke('reminders:markCompleted', id),

    onChanged: (callback: () => void): (() => void) => {
      const handler = () => callback()
      ipcRenderer.on('reminders:changed', handler)
      return () => {
        ipcRenderer.removeListener('reminders:changed', handler)
      }
    },
  },
}

contextBridge.exposeInMainWorld('notifyme', api)
