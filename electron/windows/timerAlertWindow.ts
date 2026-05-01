/**
 * Janela de alerta do Timer — chamada quando o countdown chega a zero.
 *
 * Mesma técnica da alertWindow.ts dos lembretes:
 *   - frame: false, alwaysOnTop, skipTaskbar: false (visível na taskbar)
 *   - Carrega o mesmo bundle Vue com URL param `?view=timer-alert`
 *
 * Diferença: aqui só pode ter UMA instância. Se já existe e o timer
 * dispara de novo, foca a existente.
 */

import { BrowserWindow } from 'electron'
import path from 'node:path'

interface OpenContext {
  rendererDist: string
  devServerUrl?: string
  preloadPath: string
}

let currentWindow: BrowserWindow | null = null

export function openTimerAlertWindow(ctx: OpenContext): void {
  if (currentWindow && !currentWindow.isDestroyed()) {
    if (currentWindow.isMinimized()) currentWindow.restore()
    currentWindow.show()
    currentWindow.focus()
    return
  }

  const win = new BrowserWindow({
    width: 480,
    height: 300,
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    center: true,
    show: false,
    backgroundColor: '#0D0D0E',
    title: 'Timer — NotifyMe',
    webPreferences: {
      preload: ctx.preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  currentWindow = win

  win.on('closed', () => {
    currentWindow = null
  })

  win.once('ready-to-show', () => {
    win.show()
    win.focus()
    win.flashFrame(true)
  })

  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  if (ctx.devServerUrl) {
    win.loadURL(`${ctx.devServerUrl}?view=timer-alert`)
  } else {
    win.loadFile(path.join(ctx.rendererDist, 'index.html'), {
      search: 'view=timer-alert',
    })
  }
}

export function closeTimerAlertWindow(): void {
  if (currentWindow && !currentWindow.isDestroyed()) {
    currentWindow.destroy()
  }
  currentWindow = null
}
