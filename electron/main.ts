/**
 * NotifyMe — Processo Principal (Main Process)
 *
 * Cria janelas, abre o banco SQLite, registra handlers IPC.
 * Roda no ambiente Node.js do Electron.
 *
 * Veja docs/01-arquitetura-electron.md e docs/03-ipc.md.
 */

import { app, BrowserWindow, dialog } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getDatabase, closeDatabase } from './db'
import { RemindersService } from './services/reminders'
import { registerRemindersIPC } from './ipc/reminders'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null = null

/**
 * Single-instance lock: garante que só uma instância do app roda por vez.
 * Sem isso, abrir o app duas vezes (ou um restart de hot-reload com a
 * instância anterior ainda viva) cria duas conexões SQLite no mesmo
 * arquivo — e a segunda dá "database is locked".
 */
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  console.log('[main] another instance is already running, exiting')
  app.quit()
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      closeDatabase()
      app.quit()
      win = null
    }
  })

  app.on('before-quit', () => {
    closeDatabase()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  app.whenReady().then(initialize)
}

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    title: 'NotifyMe',
    backgroundColor: '#0D0D0E',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

function initialize() {
  try {
    // 1. Abre o banco e roda migrations
    const db = getDatabase()

    // 2. Cria os services e registra os handlers IPC
    const remindersService = new RemindersService(db)
    registerRemindersIPC(remindersService)

    // 3. Abre a janela
    createWindow()
  } catch (error) {
    const err = error as Error
    console.error('[main] fatal initialization error:', err)
    dialog.showErrorBox(
      'NotifyMe — Erro fatal',
      `Falha ao inicializar:\n\n${err.message}\n\n` +
        `Caso o erro seja "database is locked", feche todas as instancias ` +
        `do NotifyMe pelo Gerenciador de Tarefas e rode novamente.`
    )
    app.quit()
  }
}
