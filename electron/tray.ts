/**
 * Tray icon (bandeja do sistema) + menu de contexto.
 *
 * O NotifyMe roda em background na bandeja: o usuário clica no X da
 * janela main e ela apenas se esconde — o processo continua vivo
 * pra disparar lembretes agendados.
 *
 * Pra realmente sair, usar "Sair" no menu da tray (botão direito).
 *
 * O ícone fica em build/tray-icon.png. Se o arquivo não existir, o
 * tray usa nativeImage.createEmpty() — ainda funciona (clique direito
 * acessa o menu) mas fica visualmente vazio. A Fase 7 substitui o
 * placeholder por um PNG real (sino laranja 16x16 e 32x32 pra HiDPI).
 *
 * Veja docs/07-tray-e-autostart.md.
 */

import { app, Menu, Tray, nativeImage, BrowserWindow } from 'electron'
import type { NativeImage } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

let tray: Tray | null = null

interface TrayContext {
  /** Janela main — mostrada/escondida pelo menu */
  getMainWindow: () => BrowserWindow | null
  /** Cria a janela main (caso o usuário fechou tudo) */
  createMainWindow: () => void
  /** Sinaliza pro main que o usuário pediu sair de verdade */
  setQuitting: (value: boolean) => void
}

function getTrayIcon(): NativeImage {
  const candidates = [
    path.join(process.env.APP_ROOT ?? '', 'build', 'tray-icon.png'),
    path.join(process.env.APP_ROOT ?? '', 'public', 'tray-icon.png'),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return nativeImage.createFromPath(p)
    }
  }
  console.warn(
    '[tray] tray-icon.png nao encontrado em build/ ou public/. ' +
      'Usando icone vazio. Adicione um PNG 16x16 ou 32x32 pra ficar visivel.'
  )
  return nativeImage.createEmpty()
}

export function createTray(ctx: TrayContext): Tray {
  if (tray) return tray

  tray = new Tray(getTrayIcon())
  tray.setToolTip('NotifyMe — Lembretes que não somem')

  const showWindow = () => {
    const win = ctx.getMainWindow()
    if (win && !win.isDestroyed()) {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    } else {
      ctx.createMainWindow()
    }
  }

  const buildMenu = () => {
    const isAutoStart = app.getLoginItemSettings().openAtLogin

    return Menu.buildFromTemplate([
      {
        label: 'Mostrar NotifyMe',
        click: showWindow,
      },
      { type: 'separator' },
      {
        label: 'Iniciar com o Windows',
        type: 'checkbox',
        checked: isAutoStart,
        click: (item) => {
          app.setLoginItemSettings({ openAtLogin: item.checked })
          // Reconstrói o menu pra refletir o estado novo
          tray?.setContextMenu(buildMenu())
        },
      },
      { type: 'separator' },
      {
        label: 'Sair',
        click: () => {
          ctx.setQuitting(true)
          app.quit()
        },
      },
    ])
  }

  tray.setContextMenu(buildMenu())

  // Clique simples (não direito) no Windows: mostra a janela
  tray.on('click', showWindow)

  return tray
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
