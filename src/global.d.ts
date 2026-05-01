/**
 * Tipos globais visíveis pro Renderer (Vue).
 *
 * Declaramos aqui o `window.notifyme` exposto pelo preload —
 * o `electron/electron-env.d.ts` não é visto pelo vue-tsc
 * (escopos diferentes de tsconfig).
 */

import type { Reminder, ReminderInput } from './types/reminder'

declare global {
  interface Window {
    notifyme: {
      reminders: {
        list: () => Promise<Reminder[]>
        create: (input: ReminderInput) => Promise<Reminder>
        delete: (id: string) => Promise<boolean>
        markCompleted: (id: string) => Promise<Reminder | null>
      }
    }
  }
}

export {}
