/**
 * Tipos globais visíveis pro Renderer (Vue).
 *
 * Declaramos aqui que `window.notifyme` é a NotifyMeAPI definida em
 * src/types/api.ts. O preload expõe esse objeto via contextBridge
 * quando a janela abre.
 */

import type { NotifyMeAPI } from './types/api'

declare global {
  interface Window {
    notifyme: NotifyMeAPI
  }
}

export {}
