/**
 * NotifyMe — Preload Script
 *
 * Roda ANTES do Renderer (Vue) carregar.
 * Ponte segura entre o Renderer e o Main: expõe APIs específicas
 * via window.notifyme — o Renderer não toca direto em Node, IPC
 * ou banco.
 *
 * Veja docs/03-ipc.md.
 */

import { contextBridge, ipcRenderer } from 'electron'
import type { Reminder, ReminderInput } from '../src/types/reminder'

const api = {
  reminders: {
    list: (): Promise<Reminder[]> =>
      ipcRenderer.invoke('reminders:list'),

    create: (input: ReminderInput): Promise<Reminder> =>
      ipcRenderer.invoke('reminders:create', input),

    delete: (id: string): Promise<boolean> =>
      ipcRenderer.invoke('reminders:delete', id),

    markCompleted: (id: string): Promise<Reminder | null> =>
      ipcRenderer.invoke('reminders:markCompleted', id),
  },
}

contextBridge.exposeInMainWorld('notifyme', api)

export type NotifyMeAPI = typeof api
