/**
 * NotifyMe — Processo Principal (Main Process)
 *
 * Este arquivo roda no ambiente Node.js do Electron.
 * É ele quem cria janelas, acessa sistema de arquivos, banco de dados,
 * notificações nativas e tudo que precisa de privilégios do SO.
 *
 * Veja docs/01-arquitetura-electron.md para entender a divisão
 * entre Main e Renderer.
 */

import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Diretórios do projeto:
//   APP_ROOT/
//   ├─ dist-electron/   ← código do Main + Preload compilado
//   └─ dist/            ← código do Renderer (Vue) compilado
process.env.APP_ROOT = path.join(__dirname, '..')

// URL do servidor de dev do Vite quando rodando em desenvolvimento.
// Em produção (.exe instalado), carrega do disco em vez de localhost.
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null = null

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    title: 'NotifyMe',
    backgroundColor: '#0D0D0E',
    webPreferences: {
      // Ponte segura entre Renderer e Main.
      // Veja docs/03-ipc.md.
      preload: path.join(__dirname, 'preload.mjs'),
      // Isolamento de contexto: Renderer NÃO acessa Node diretamente.
      // Tudo que precisa do SO passa pelo Preload via IPC.
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Em desenvolvimento, carrega do servidor Vite (hot reload).
  // Em produção, carrega o HTML construído.
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// macOS: app continua rodando mesmo sem janelas abertas.
// Windows/Linux: fecha o app quando todas as janelas fecham.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

// macOS: clicar no ícone do dock recria a janela se não houver nenhuma.
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)