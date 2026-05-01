import type { Reminder, ReminderInput } from './reminder'
import type { TimerState, StopwatchState } from './timer'
import type { Settings } from './settings'
import type { Note, NoteInput, NotePatch } from './note'

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

  /**
   * Timer (countdown) — state vive no Main process. Renderer subscreve
   * via onTick e dispara mudanças via start/pause/reset/setSeconds.
   */
  timer: {
    getState: () => Promise<TimerState>
    start: () => void
    pause: () => void
    reset: () => void
    setSeconds: (seconds: number) => void
    onTick: (callback: (state: TimerState) => void) => () => void
  }

  /**
   * Cronômetro — mesmo padrão do timer.
   */
  stopwatch: {
    getState: () => Promise<StopwatchState>
    start: () => void
    pause: () => void
    reset: () => void
    onTick: (callback: (state: StopwatchState) => void) => () => void
  }

  /**
   * Notas adesivas (sticky notes) espalhadas na tela.
   * State no Main, broadcast via 'notes:changed' pra todas as janelas.
   */
  notes: {
    list: () => Promise<Note[]>
    create: (input: NoteInput) => Promise<Note>
    update: (id: string, patch: NotePatch) => Promise<Note | null>
    delete: (id: string) => Promise<boolean>
    clear: () => Promise<number>
    onChanged: (callback: () => void) => () => void
    /** Liga/desliga captura de mouse na canvas (chamar em hover enter/leave). */
    setMouseInteractive: (interactive: boolean) => void
  }

  /**
   * Configurações persistidas — vivem em settings.json no Main.
   * Composables usam useSettings() pra acessar/mutar.
   */
  settings: {
    getAll: () => Promise<Settings>
    set: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>
    onChanged: (callback: (settings: Settings) => void) => () => void
  }

  system: {
    /** Abre uma URL HTTP/HTTPS no navegador padrão do usuário (não no Electron). */
    openExternal: (url: string) => Promise<void>

    /** Controles da janela main (usados pela title bar customizada e pelo widget). */
    window: {
      minimize: () => void
      toggleMaximize: () => void
      close: () => void
      isMaximized: () => Promise<boolean>
      onMaximizedChanged: (callback: (value: boolean) => void) => () => void
      /** Mostra/foca a janela main (usado pelo botão "Abrir" do widget). */
      showMain: () => void
    }
  }
}
