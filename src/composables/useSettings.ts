import { ref } from 'vue'
import { DEFAULT_SETTINGS, type Settings } from '@/types/settings'

/**
 * Composable singleton de configurações do app.
 *
 * State canônico vive no Main process (electron-store em settings.json).
 * Este composable:
 *   1. Faz getAll() na primeira chamada pra hidratar o ref
 *   2. Subscreve `settings:changed` push do Main pra atualizar quando
 *      qualquer Renderer (Configurações, Widget, etc) altera um setting
 *   3. Expõe `set(key, value)` que envia IPC pro Main persistir
 *
 * Compartilhado entre janela main e widget — ambos veem o mesmo
 * state em tempo real.
 */

const settings = ref<Settings>({ ...DEFAULT_SETTINGS })
let initialized = false

function applyAll(value: Settings) {
  settings.value = { ...value }
}

export function useSettings() {
  if (!initialized) {
    initialized = true
    window.notifyme.settings
      .getAll()
      .then(applyAll)
      .catch((e) => console.error('[useSettings] getAll failed:', e))
    window.notifyme.settings.onChanged(applyAll)
  }

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    return window.notifyme.settings.set(key, value)
  }

  return {
    settings,
    set,
  }
}
