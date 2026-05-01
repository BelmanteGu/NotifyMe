/**
 * Widget flutuante — janela pequena always-on-top que mostra o
 * tempo do timer ou cronômetro quando algum está rodando.
 *
 * Aparece automaticamente quando user inicia timer/cronômetro e
 * fecha quando ambos param. Toggle em Configurações pra desabilitar.
 *
 * Características:
 *   - frame: false (sem barra de título nativa)
 *   - alwaysOnTop: true (sempre por cima)
 *   - skipTaskbar: true (não polui a barra de tarefas)
 *   - resizable: true (user pode redimensionar)
 *   - movível via drag region
 *   - Posição/tamanho persistidos em settings (move/resize → save)
 *
 * Singleton: só uma instância por vez.
 */

import { BrowserWindow, screen } from 'electron'
import path from 'node:path'
import type { Settings } from '../../src/types/settings'

interface WidgetContext {
  rendererDist: string
  devServerUrl?: string
  preloadPath: string
  settings: Settings
  saveSettings: (partial: Partial<Settings>) => void
}

let widget: BrowserWindow | null = null

export function openWidgetWindow(ctx: WidgetContext): void {
  if (widget && !widget.isDestroyed()) {
    widget.show()
    return
  }

  // Se nunca foi posicionado, default = canto inferior direito da tela
  let x = ctx.settings.widgetX
  let y = ctx.settings.widgetY
  if (x === null || y === null) {
    const { workArea } = screen.getPrimaryDisplay()
    x = workArea.x + workArea.width - ctx.settings.widgetWidth - 24
    y = workArea.y + workArea.height - ctx.settings.widgetHeight - 24
  }

  widget = new BrowserWindow({
    width: ctx.settings.widgetWidth,
    height: ctx.settings.widgetHeight,
    x,
    y,
    minWidth: 220,
    minHeight: 100,
    maxWidth: 600,
    maxHeight: 300,
    frame: false,
    resizable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    backgroundColor: '#0D0D0E',
    title: 'NotifyMe — Widget',
    webPreferences: {
      preload: ctx.preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  widget.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  // Salva posição quando user move
  widget.on('move', () => {
    if (!widget || widget.isDestroyed()) return
    const [px, py] = widget.getPosition()
    ctx.saveSettings({ widgetX: px, widgetY: py })
  })

  // Salva tamanho quando user redimensiona
  widget.on('resize', () => {
    if (!widget || widget.isDestroyed()) return
    const [w, h] = widget.getSize()
    ctx.saveSettings({ widgetWidth: w, widgetHeight: h })
  })

  widget.once('ready-to-show', () => {
    widget?.show()
  })

  widget.on('closed', () => {
    widget = null
  })

  if (ctx.devServerUrl) {
    widget.loadURL(`${ctx.devServerUrl}?view=widget`)
  } else {
    widget.loadFile(path.join(ctx.rendererDist, 'index.html'), {
      search: 'view=widget',
    })
  }
}

export function closeWidgetWindow(): void {
  if (widget && !widget.isDestroyed()) {
    widget.destroy()
  }
  widget = null
}

export function isWidgetOpen(): boolean {
  return widget !== null && !widget.isDestroyed()
}
