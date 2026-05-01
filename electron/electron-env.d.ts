/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    APP_ROOT: string
    VITE_PUBLIC: string
  }
}

// Tipos da API exposta no preload, disponíveis no Renderer
interface NotifyMeAPI {
  ping: () => Promise<string>
}

interface Window {
  notifyme: NotifyMeAPI
}