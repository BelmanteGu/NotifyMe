/**
 * NotifyMe — Preload Script
 *
 * Roda ANTES do Renderer (Vue) carregar.
 * É a ponte segura entre o Renderer (que NÃO tem acesso a Node)
 * e o Main Process (que TEM acesso a Node).
 *
 * Tudo que o Vue precisar do SO (criar lembrete, ler do banco, etc)
 * vai ser exposto aqui via window.notifyme.* — e implementado no Main.
 *
 * Veja docs/03-ipc.md.
 */

import { contextBridge, ipcRenderer } from 'electron'

// API exposta ao Renderer via window.notifyme
contextBridge.exposeInMainWorld('notifyme', {
  // Placeholder — vai ser preenchido na Fase 2 (SQLite/CRUD).
  // Exemplo de uso futuro:
  //   await window.notifyme.createReminder({ title: 'Pagar conta', ... })
  ping: () => ipcRenderer.invoke('ping'),
})