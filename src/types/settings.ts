/**
 * Tipos das configurações do app — persistidas via electron-store
 * num arquivo separado dos lembretes (`settings.json`).
 */

export interface Settings {
  /** Mostra o widget flutuante quando timer ou cronômetro estão rodando. */
  showWidget: boolean

  /**
   * Posição do widget na tela (último estado salvo).
   * `null` = ainda não foi posicionado, usar default (canto inferior direito).
   */
  widgetX: number | null
  widgetY: number | null

  /** Tamanho do widget. */
  widgetWidth: number
  widgetHeight: number

  /** Espalha sticky notes na tela como overlay always-on-top. */
  showNotesCanvas: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  showWidget: true,
  widgetX: null,
  widgetY: null,
  widgetWidth: 280,
  widgetHeight: 150,
  showNotesCanvas: false,
}
