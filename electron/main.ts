/**
 * NotifyMe — Processo Principal (Main Process)
 *
 * Cria janelas, abre o store JSON, registra handlers IPC,
 * dispara o scheduler, mantém o tray icon e a title bar customizada.
 */

import { app, BrowserWindow, dialog, ipcMain, shell, Menu } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getStore } from './store'
import { RemindersService } from './services/reminders'
import { registerRemindersIPC } from './ipc/reminders'
import { ReminderScheduler } from './scheduler'
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
    // Frame customizado: tira a barra de título nativa do Windows.
    // O Renderer desenha a TitleBar com botões custom (TitleBar.vue).
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

  // Notifica o Renderer quando o estado de maximizado muda
  // (pra a title bar atualizar o ícone do botão maximize/restore).
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

function notifyRendererChanged() {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) {
      w.webContents.send('reminders:changed')
    }
  }
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

    // Timer: abre janela de alarme persistente quando countdown zera
    ipcMain.handle('timer:openAlert', () => {
      openTimerAlertWindow({
        rendererDist: RENDERER_DIST,
        devServerUrl: VITE_DEV_SERVER_URL,
        preloadPath: PRELOAD_PATH,
      })
    })

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
