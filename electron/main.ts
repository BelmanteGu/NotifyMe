/**
 * NotifyMe — Processo Principal (Main Process)
 *
 * Cria janelas, abre o store JSON, registra handlers IPC,
 * dispara o scheduler, mantém o tray icon, lida com quit vs hide.
 *
 * Veja docs/01-arquitetura-electron.md, docs/03-ipc.md,
 * docs/05-agendamento.md, docs/07-tray-e-autostart.md.
 */

import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getStore } from './store'
import { RemindersService } from './services/reminders'
import { registerRemindersIPC } from './ipc/reminders'
import { ReminderScheduler } from './scheduler'
import { showReminderNotification } from './services/notifications'
import { openAlertWindow, closeAllAlertWindows } from './windows/alertWindow'
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

/**
 * Flag pra distinguir "fechar janela" (esconde) de "sair de verdade"
 * (encerra o processo). O X da janela seta hide; o menu "Sair" da
 * tray seta isQuitting=true antes de chamar app.quit().
 */
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

  // No NotifyMe, fechar todas as janelas NÃO encerra o app — ele
  // continua na tray pra disparar lembretes. Só sai de verdade quando
  // isQuitting=true (definido pelo menu "Sair" da tray).
  app.on('window-all-closed', () => {
    if (isQuitting && process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('before-quit', () => {
    isQuitting = true
    scheduler?.stopAll()
    closeAllAlertWindows(alertWindows)
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
    minWidth: 800,
    minHeight: 600,
    title: 'NotifyMe',
    backgroundColor: '#0D0D0E',
    show: true,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Hijack do close: em vez de fechar, esconde. App continua rodando
  // na tray. Pra sair de verdade, usar menu "Sair" da tray (que seta
  // isQuitting=true antes).
  mainWin.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWin?.hide()
    }
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

    // Handler genérico pra abrir URLs externas no navegador padrão.
    // Validação: só http/https — bloqueia file://, javascript:, etc
    // (defesa contra XSS escapando do Renderer).
    ipcMain.handle('system:openExternal', (_event, url: string) => {
      if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
        console.warn('[ipc] openExternal recusou URL invalida:', url)
        return
      }
      shell.openExternal(url)
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
