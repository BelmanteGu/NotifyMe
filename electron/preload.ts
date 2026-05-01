/**
 * NotifyMe — Preload Script
 *
 * Roda ANTES do Renderer (Vue) carregar.
 * Ponte segura entre o Renderer e o Main via window.notifyme.
 *
 * Veja docs/03-ipc.md.
 */

import { contextBridge, ipcRenderer } from 'electron'
import type { Reminder, ReminderInput } from '../src/types/reminder'
import type { TimerState, StopwatchState } from '../src/types/timer'
import type { Settings } from '../src/types/settings'
import type { Note, NoteInput, NotePatch } from '../src/types/note'
import type { NotifyMeAPI } from '../src/types/api'

const api: NotifyMeAPI = {
  reminders: {
    list: (): Promise<Reminder[]> =>
      ipcRenderer.invoke('reminders:list'),

    getById: (id: string): Promise<Reminder | null> =>
      ipcRenderer.invoke('reminders:getById', id),

    create: (input: ReminderInput): Promise<Reminder> =>
      ipcRenderer.invoke('reminders:create', input),

    delete: (id: string): Promise<boolean> =>
      ipcRenderer.invoke('reminders:delete', id),

    markCompleted: (id: string): Promise<Reminder | null> =>
      ipcRenderer.invoke('reminders:markCompleted', id),

    snooze: (id: string, minutes: number): Promise<Reminder | null> =>
      ipcRenderer.invoke('reminders:snooze', id, minutes),

    clearCompleted: (): Promise<number> =>
      ipcRenderer.invoke('reminders:clearCompleted'),

    onChanged: (callback: () => void): (() => void) => {
      const handler = () => callback()
      ipcRenderer.on('reminders:changed', handler)
      return () => {
        ipcRenderer.removeListener('reminders:changed', handler)
      }
    },
  },

  timer: {
    getState: (): Promise<TimerState> =>
      ipcRenderer.invoke('timer:getState'),
    start: () => ipcRenderer.send('timer:start'),
    pause: () => ipcRenderer.send('timer:pause'),
    reset: () => ipcRenderer.send('timer:reset'),
    setSeconds: (seconds: number) =>
      ipcRenderer.send('timer:setSeconds', seconds),
    onTick: (callback) => {
      const handler = (_event: unknown, state: TimerState) => callback(state)
      ipcRenderer.on('timer:tick', handler)
      return () => {
        ipcRenderer.removeListener('timer:tick', handler)
      }
    },
  },

  stopwatch: {
    getState: (): Promise<StopwatchState> =>
      ipcRenderer.invoke('stopwatch:getState'),
    start: () => ipcRenderer.send('stopwatch:start'),
    pause: () => ipcRenderer.send('stopwatch:pause'),
    reset: () => ipcRenderer.send('stopwatch:reset'),
    onTick: (callback) => {
      const handler = (_event: unknown, state: StopwatchState) =>
        callback(state)
      ipcRenderer.on('stopwatch:tick', handler)
      return () => {
        ipcRenderer.removeListener('stopwatch:tick', handler)
      }
    },
  },

  notes: {
    list: (): Promise<Note[]> => ipcRenderer.invoke('notes:list'),
    create: (input: NoteInput): Promise<Note> =>
      ipcRenderer.invoke('notes:create', input),
    update: (id: string, patch: NotePatch): Promise<Note | null> =>
      ipcRenderer.invoke('notes:update', id, patch),
    delete: (id: string): Promise<boolean> =>
      ipcRenderer.invoke('notes:delete', id),
    clear: (): Promise<number> => ipcRenderer.invoke('notes:clear'),
    onChanged: (callback) => {
      const handler = () => callback()
      ipcRenderer.on('notes:changed', handler)
      return () => {
        ipcRenderer.removeListener('notes:changed', handler)
      }
    },
    setMouseInteractive: (interactive: boolean) =>
      ipcRenderer.send('notes:setMouseInteractive', interactive),
  },

  settings: {
    getAll: (): Promise<Settings> => ipcRenderer.invoke('settings:getAll'),
    set: <K extends keyof Settings>(key: K, value: Settings[K]) =>
      ipcRenderer.invoke('settings:set', key, value),
    onChanged: (callback) => {
      const handler = (_event: unknown, settings: Settings) =>
        callback(settings)
      ipcRenderer.on('settings:changed', handler)
      return () => {
        ipcRenderer.removeListener('settings:changed', handler)
      }
    },
  },

  system: {
    openExternal: (url: string): Promise<void> =>
      ipcRenderer.invoke('system:openExternal', url),

    window: {
      minimize: () => ipcRenderer.send('window:minimize'),
      toggleMaximize: () => ipcRenderer.send('window:toggleMaximize'),
      close: () => ipcRenderer.send('window:close'),
      isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
      showMain: () => ipcRenderer.send('window:showMain'),
      onMaximizedChanged: (callback) => {
        const handler = (_event: unknown, value: boolean) => callback(value)
        ipcRenderer.on('window:maximizedChanged', handler)
        return () => {
          ipcRenderer.removeListener('window:maximizedChanged', handler)
        }
      },
    },
  },
}

contextBridge.exposeInMainWorld('notifyme', api)
