/**
 * NotifyMe — Processo Principal (Main Process)
 *
 * Cria janelas, abre o store JSON, registra handlers IPC,
 * dispara o scheduler, mantém tracking das janelas de alerta.
 *
 * Veja docs/01-arquitetura-electron.md, docs/03-ipc.md, docs/05-agendamento.md.
 */

import { app, BrowserWindow, dialog } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getStore } from './store'
import { RemindersService } from './services/reminders'
import { registerRemindersIPC } from './ipc/reminders'
import { ReminderScheduler } from './scheduler'
import { showReminderNotification } from './services/notifications'
import { openAlertWindow, closeAllAlertWindows } from './windows/alertWindow'

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
const alertWindows = new Map<string, BrowserWindow>()

const PRELOAD_PATH = path.join(__dirname, 'preload.mjs')

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  console.log('[main] another instance is already running, exiting')
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWin) {
      if (mainWin.isMinimized()) mainWin.restore()
      mainWin.focus()
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      scheduler?.stopAll()
      app.quit()
      mainWin = null
    }
  })

  app.on('before-quit', () => {
    closeAllAlertWindows(alertWindows)
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
    minWidth: 800,
    minHeight: 600,
    title: 'NotifyMe',
    backgroundColor: '#0D0D0E',
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    mainWin.loadURL(VITE_DEV_SERVER_URL)
    mainWin.webContents.openDevTools()
  } else {
    mainWin.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

function notifyRendererChanged() {
  // Empurra evento pra todas as janelas (main + alerts) pra UI atualizar
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) {
      w.webContents.send('reminders:changed')
    }
  }
}

function initialize() {
  try {
    const store = getStore()
    const remindersService = new RemindersService(store)

    scheduler = new ReminderScheduler(
      remindersService,
      (reminder) => {
        // 1. Notificação nativa (transitória, com som padrão Windows)
        showReminderNotification(reminder, { mainWin })
        // 2. Janela persistente always-on-top (o diferencial do app)
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

    createMainWindow()

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
