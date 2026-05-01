/**
 * Canvas das notas adesivas — UMA janela transparente fullscreen
 * always-on-top que renderiza todas as notas como divs Vue.
 *
 * Por que UMA janela só (em vez de uma por nota):
 *   - BrowserWindow é cara (~30-50MB cada com Chromium)
 *   - Com 5-10 notas, daria 300-500MB extra de RAM
 *   - Canvas única = ~50MB total independente do número de notas
 *
 * Mouse pass-through via setIgnoreMouseEvents(true, { forward: true })
 * por padrão. O Renderer chama setMouseInteractive(true) quando o
 * cursor entra em uma nota (pra clicks/drag funcionarem) e volta pra
 * false quando sai (clicks atravessam pro app de baixo).
 */

import { BrowserWindow, screen } from 'electron'
import path from 'node:path'

interface CanvasContext {
  rendererDist: string
  devServerUrl?: string
  preloadPath: string
}

let canvas: BrowserWindow | null = null

export function openNotesCanvas(ctx: CanvasContext): void {
  if (canvas && !canvas.isDestroyed()) {
    canvas.show()
    return
  }

  const { workArea } = screen.getPrimaryDisplay()

  canvas = new BrowserWindow({
    width: workArea.width,
    height: workArea.height,
    x: workArea.x,
    y: workArea.y,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    show: false,
    focusable: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: ctx.preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Mouse pass-through por padrão. forward:true permite que o Renderer
  // ainda receba mousemove/hover events (pra a nota detectar mouseenter
  // e chamar setMouseInteractive(true)).
  canvas.setIgnoreMouseEvents(true, { forward: true })
  canvas.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  canvas.once('ready-to-show', () => {
    canvas?.show()
  })

  canvas.on('closed', () => {
    canvas = null
  })

  if (ctx.devServerUrl) {
    canvas.loadURL(`${ctx.devServerUrl}?view=notes-canvas`)
  } else {
    canvas.loadFile(path.join(ctx.rendererDist, 'index.html'), {
      search: 'view=notes-canvas',
    })
  }
}

export function closeNotesCanvas(): void {
  if (canvas && !canvas.isDestroyed()) {
    canvas.destroy()
  }
  canvas = null
}

export function isNotesCanvasOpen(): boolean {
  return canvas !== null && !canvas.isDestroyed()
}

/**
 * Liga/desliga a captura de eventos de mouse na canvas.
 * Renderer chama isso baseado em mouseenter/mouseleave nas notas:
 *   - Entrou em nota → setMouseInteractive(true) → clicks funcionam
 *   - Saiu de todas → setMouseInteractive(false) → clicks atravessam
 */
export function setNotesCanvasMouseInteractive(interactive: boolean): void {
  if (!canvas || canvas.isDestroyed()) return
  canvas.setIgnoreMouseEvents(!interactive, { forward: !interactive })
}
