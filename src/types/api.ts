import type { Reminder, ReminderInput } from './reminder'

/**
 * Contrato da API exposta pelo preload em window.notifyme.
 *
 * Definida num arquivo compartilhado pra que tanto o Renderer (via
 * src/global.d.ts) quanto o preload (via electron/electron-env.d.ts)
 * importem o mesmo tipo. Renomear um campo aqui propaga pros dois lados.
 */
export interface NotifyMeAPI {
  reminders: {
    list: () => Promise<Reminder[]>
    create: (input: ReminderInput) => Promise<Reminder>
    delete: (id: string) => Promise<boolean>
    markCompleted: (id: string) => Promise<Reminder | null>

    /**
     * Subscreve a eventos de mudança vindos do Main.
     * Usado quando o scheduler dispara um recorrente e atualiza o
     * triggerAt em background — o Renderer precisa refazer a query.
     *
     * Retorna função pra desinscrever.
     */
    onChanged: (callback: () => void) => () => void
  }
}
