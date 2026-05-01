/**
 * NotifyMe — Processo Principal (Main Process)
 *
 * Cria janelas, abre stores (lembretes + settings), registra handlers IPC,
 * dispara o scheduler de lembretes, gerencia Timer/Cronômetro,
 * mantém o tray icon, a title bar customizada e o widget flutuante.
 */

import { app, BrowserWindow, dialog, ipcMain, shell, Menu } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getStore } from './store'
import { getSettings } from './store/settings'
import { RemindersService } from './services/reminders'
import { registerRemindersIPC } from './ipc/reminders'
import { ReminderScheduler } from './scheduler'
import { TimerService } from './services/timer'
import { StopwatchService } from './services/stopwatch'
import { showReminderNotification } from './services/notifications'
import { openAlertWindow, closeAllAlertWindows } from './windows/alertWindow'
import { openTimerAlertWindow, closeTimerAlertWindow } from './windows/timerAlertWindow'
import { openWidgetWindow, closeWidgetWindow, isWidgetOpen } from './windows/widgetWindow'
import { NotesService } from './services/notes'
import { getNotesStore } from './store/notes'
import { registerNotesIPC } from './ipc/notes'
import { ListsService } from './services/lists'
import { getListsStore } from './store/lists'
import { registerListsIPC } from './ipc/lists'
import { createTray, destroyTray } from './tray'
import type Store from 'electron-store'
import type { Settings } from '../src/types/settings'

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
let settingsStore: Store<Settings> | null = null
const alertWindows = new Map<string, BrowserWindow>()

let isQuitting = false

const PRELOAD_PATH = path.join(__dirname, 'preload.mjs')

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  console.log('[main] another instance is already running, exiting')
  app.quit()
} else {
  app.on('second-instance', () => {
    showMainWindow()
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
    closeWidgetWindow()
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

function showMainWindow() {
  if (!mainWin || mainWin.isDestroyed()) {
    createMainWindow()
    return
  }
  if (mainWin.isMinimized()) mainWin.restore()
  mainWin.show()
  mainWin.focus()
}

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

function notifyNotesChanged() {
  broadcastToAllWindows('notes:changed')
}

function notifyListsChanged() {
  broadcastToAllWindows('lists:changed')
}

// ─── Widget orchestration ─────────────────────────────────────────
let lastWidgetMode: 'timer' | 'stopwatch' | null = null

function getCurrentRunningMode(): 'timer' | 'stopwatch' | null {
  if (timerService?.getState().isRunning) return 'timer'
  if (stopwatchService?.getState().isRunning) return 'stopwatch'
  return null
}

/**
 * Decide se o widget deve estar aberto. Chamado em:
 *   - Cada tick do timer/stopwatch (idempotente — só age se mudou)
 *   - Mudança da setting `showWidget`
 */
function updateWidgetVisibility() {
  const settings = settingsStore?.store
  if (!settings) return

  const desiredMode = settings.showWidget ? getCurrentRunningMode() : null

  if (desiredMode === lastWidgetMode) return // sem mudança

  if (desiredMode === null) {
    closeWidgetWindow()
  } else if (!isWidgetOpen()) {
    openWidgetWindow({
      rendererDist: RENDERER_DIST,
      devServerUrl: VITE_DEV_SERVER_URL,
      preloadPath: PRELOAD_PATH,
      settings,
      saveSettings: (partial) => {
        if (!settingsStore) return
        for (const [k, v] of Object.entries(partial)) {
          settingsStore.set(k as keyof Settings, v as never)
        }
      },
    })
  }
  // Se modo trocou (timer ↔ stopwatch) com widget já aberto, o
  // WidgetView se auto-adapta via composables — não precisa reabrir

  lastWidgetMode = desiredMode
}

function initialize() {
  try {
    Menu.setApplicationMenu(null)

    settingsStore = getSettings()

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

    // Notes — service + IPC
    const notesStore = getNotesStore()
    const notesService = new NotesService(notesStore)
    registerNotesIPC(notesService, notifyNotesChanged)

    // Lists — service + IPC + import/export .md via dialog
    const listsStore = getListsStore()
    const listsService = new ListsService(listsStore)
    registerListsIPC({
      service: listsService,
      onChange: notifyListsChanged,
      getMainWindow: () => mainWin,
    })

    // ─── Timer + Cronômetro ──────────────────────────────
    timerService = new TimerService()
    timerService.on('tick', (state) => {
      broadcastToAllWindows('timer:tick', state)
      updateWidgetVisibility()
    })
    timerService.on('complete', () => {
      openTimerAlertWindow({
        rendererDist: RENDERER_DIST,
        devServerUrl: VITE_DEV_SERVER_URL,
        preloadPath: PRELOAD_PATH,
      })
    })

    stopwatchService = new StopwatchService()
    stopwatchService.on('tick', (state) => {
      broadcastToAllWindows('stopwatch:tick', state)
      updateWidgetVisibility()
    })

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

    // IPC settings
    ipcMain.handle('settings:getAll', () => settingsStore?.store)
    ipcMain.handle(
      'settings:set',
      (_event, key: keyof Settings, value: unknown) => {
        if (!settingsStore) return
        settingsStore.set(key, value as never)
        broadcastToAllWindows('settings:changed', settingsStore.store)
        if (key === 'showWidget') {
          updateWidgetVisibility()
        }
      }
    )

    // System: openExternal
    ipcMain.handle('system:openExternal', (_event, url: string) => {
      if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
        console.warn('[ipc] openExternal recusou URL invalida:', url)
        return
      }
      shell.openExternal(url)
    })

    // Window controls
    ipcMain.on('window:minimize', () => mainWin?.minimize())
    ipcMain.on('window:toggleMaximize', () => {
      if (!mainWin) return
      if (mainWin.isMaximized()) mainWin.unmaximize()
      else mainWin.maximize()
    })
    ipcMain.on('window:close', () => mainWin?.close())
    ipcMain.handle('window:isMaximized', () => mainWin?.isMaximized() ?? false)
    ipcMain.on('window:showMain', () => showMainWindow())

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
