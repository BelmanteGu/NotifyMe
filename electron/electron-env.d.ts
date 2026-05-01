/// <reference types="vite-plugin-electron/electron-env" />

import type { NotifyMeAPI } from '../src/types/api'

declare namespace NodeJS {
  interface ProcessEnv {
    APP_ROOT: string
    VITE_PUBLIC: string
  }
}

declare global {
  interface Window {
    notifyme: NotifyMeAPI
  }
}
