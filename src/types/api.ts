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

    /** Apaga todos os lembretes com status 'completed'. Retorna quantos foram apagados. */
    clearCompleted: () => Promise<number>

    /** Busca um único lembrete pelo id. Usado pela janela de alerta. */
    getById: (id: string) => Promise<Reminder | null>

    /** Adia um lembrete em N minutos (atualiza triggerAt). Re-agenda no scheduler. */
    snooze: (id: string, minutes: number) => Promise<Reminder | null>

    /**
     * Subscreve a eventos de mudança vindos do Main.
     * Usado quando o scheduler dispara um recorrente e atualiza o
     * triggerAt em background — o Renderer precisa refazer a query.
     *
     * Retorna função pra desinscrever.
     */
    onChanged: (callback: () => void) => () => void
  }

  timer: {
    /**
     * Abre a janela de alarme do timer (always-on-top com botão "Parar").
     * Chamada por useTimer.handleComplete() quando o countdown zera.
     */
    openAlert: () => Promise<void>
  }

  system: {
    /** Abre uma URL HTTP/HTTPS no navegador padrão do usuário (não no Electron). */
    openExternal: (url: string) => Promise<void>

    /** Controles da janela main (usados pela title bar customizada). */
    window: {
      minimize: () => void
      toggleMaximize: () => void
      close: () => void
      isMaximized: () => Promise<boolean>
      onMaximizedChanged: (callback: (value: boolean) => void) => () => void
    }
  }
}
