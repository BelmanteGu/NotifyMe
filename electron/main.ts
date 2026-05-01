/**
 * NotifyMe — Processo Principal (Main Process)
 *
 * Cria janelas, abre o store JSON, registra handlers IPC,
 * dispara o scheduler de lembretes, mantém o tray icon e a
 * title bar customizada. Mantém também o estado do Timer e
 * Cronômetro (em Main process pra sobreviver a hide/destroy
 * de janela e permitir múltiplas janelas sincronizadas).
 */

import { app, BrowserWindow, dialog, ipcMain, shell, Menu } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getStore } from './store'
import { RemindersService } from './services/reminders'
import { registerRemindersIPC } from './ipc/reminders'
import { ReminderScheduler } from './scheduler'
import { TimerService } from './services/timer'
import { StopwatchService } from './services/stopwatch'
import { showReminderNotification } from './services/notifications'
import { openAlertWindow, closeAllAlertWindows } from './windows/alertWindow'
import { openTimerAlertWindow, closeTimerAlertWindow } from './windows/timerAlertWindow'
import { createTray, destroyTray } from './tray'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let mainWin: BrowserWindow | null = null
let scheduler: ReminderScheduler | null = null
let timerService: TimerService | null = null
let stopwatchService: StopwatchService | null = null
const alertWindows = new Map<string, BrowserWindow>()

let isQuitting = false

const PRELOAD_PATH = path.join(__dirname, 'preload.mjs')

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  console.log('[main] another instance is already running, exiting')
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWin) {
      if (mainWin.isMinimized()) mainWin.restore()
      mainWin.show()
      mainWin.focus()
    } else {
      createMainWindow()
    }
  })

  app.on('window-all-closed', () => {
    if (isQuitting && process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('before-quit', () => {
    isQuitting = true
    scheduler?.stopAll()
    timerService?.destroy()
    stopwatchService?.destroy()
    closeAllAlertWindows(alertWindows)
    closeTimerAlertWindow()
    destroyTray()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })

  app.whenReady().then(initialize)
}

function createMainWindow() {
  mainWin = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 880,
    minHeight: 560,
    title: 'NotifyMe',
    backgroundColor: '#0D0D0E',
    show: true,
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWin.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWin?.hide()
    }
  })

  mainWin.on('maximize', () => {
    mainWin?.webContents.send('window:maximizedChanged', true)
  })
  mainWin.on('unmaximize', () => {
    mainWin?.webContents.send('window:maximizedChanged', false)
  })

  if (VITE_DEV_SERVER_URL) {
    mainWin.loadURL(VITE_DEV_SERVER_URL)
    mainWin.webContents.openDevTools()
  } else {
    mainWin.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

/** Empurra um evento IPC pra TODAS as BrowserWindows abertas. */
function broadcastToAllWindows(channel: string, ...args: unknown[]) {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) {
      w.webContents.send(channel, ...args)
    }
  }
}

function notifyRendererChanged() {
  broadcastToAllWindows('reminders:changed')
}

function initialize() {
  try {
    Menu.setApplicationMenu(null)

    const store = getStore()
    const remindersService = new RemindersService(store)

    scheduler = new ReminderScheduler(
      remindersService,
      (reminder) => {
        showReminderNotification(reminder, { mainWin })
        openAlertWindow(reminder, {
          rendererDist: RENDERER_DIST,
          devServerUrl: VITE_DEV_SERVER_URL,
          preloadPath: PRELOAD_PATH,
          openWindows: alertWindows,
        })
      },
      notifyRendererChanged
    )

    registerRemindersIPC(remindersService, scheduler, notifyRendererChanged)

    // ─── Timer + Cronômetro: state no Main ─────────────────────
    timerService = new TimerService()
    timerService.on('tick', (state) =>
      broadcastToAllWindows('timer:tick', state)
    )
    timerService.on('complete', () => {
      openTimerAlertWindow({
        rendererDist: RENDERER_DIST,
        devServerUrl: VITE_DEV_SERVER_URL,
        preloadPath: PRELOAD_PATH,
      })
    })

    stopwatchService = new StopwatchService()
    stopwatchService.on('tick', (state) =>
      broadcastToAllWindows('stopwatch:tick', state)
    )

    // IPC do timer
    ipcMain.handle('timer:getState', () => timerService?.getState())
    ipcMain.on('timer:start', () => timerService?.start())
    ipcMain.on('timer:pause', () => timerService?.pause())
    ipcMain.on('timer:reset', () => timerService?.reset())
    ipcMain.on('timer:setSeconds', (_event, seconds: number) =>
      timerService?.setSeconds(seconds)
    )

    // IPC do cronômetro
    ipcMain.handle('stopwatch:getState', () => stopwatchService?.getState())
    ipcMain.on('stopwatch:start', () => stopwatchService?.start())
    ipcMain.on('stopwatch:pause', () => stopwatchService?.pause())
    ipcMain.on('stopwatch:reset', () => stopwatchService?.reset())

    // System: openExternal pra abrir links no navegador padrão
    ipcMain.handle('system:openExternal', (_event, url: string) => {
      if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
        console.warn('[ipc] openExternal recusou URL invalida:', url)
        return
      }
      shell.openExternal(url)
    })

    // Window controls — usados pela TitleBar customizada
    ipcMain.on('window:minimize', () => {
      mainWin?.minimize()
    })
    ipcMain.on('window:toggleMaximize', () => {
      if (!mainWin) return
      if (mainWin.isMaximized()) mainWin.unmaximize()
      else mainWin.maximize()
    })
    ipcMain.on('window:close', () => {
      mainWin?.close()
    })
    ipcMain.handle('window:isMaximized', () => mainWin?.isMaximized() ?? false)

    createMainWindow()
    createTray({
      getMainWindow: () => mainWin,
      createMainWindow,
      setQuitting: (value) => {
        isQuitting = value
      },
    })

    mainWin?.webContents.once('did-finish-load', () => {
      scheduler?.start()
    })
  } catch (error) {
    const err = error as Error
    console.error('[main] fatal initialization error:', err)
    dialog.showErrorBox(
      'NotifyMe — Erro fatal',
      `Falha ao inicializar:\n\n${err.message}`
    )
    app.exit(1)
  }
}
