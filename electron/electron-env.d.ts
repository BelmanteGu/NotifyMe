/// <reference types="vite-plugin-electron/electron-env" />

import type { Reminder, ReminderInput } from '../src/types/reminder'

declare namespace NodeJS {
  interface ProcessEnv {
    APP_ROOT: string
    VITE_PUBLIC: string
  }
}

// Tipos da API exposta no preload, disponíveis no Renderer via window.notifyme
interface NotifyMeAPI {
  reminders: {
    list: () => Promise<Reminder[]>
    create: (input: ReminderInput) => Promise<Reminder>
    delete: (id: string) => Promise<boolean>
    markCompleted: (id: string) => Promise<Reminder | null>
  }
}

declare global {
  interface Window {
    notifyme: NotifyMeAPI
  }
}
