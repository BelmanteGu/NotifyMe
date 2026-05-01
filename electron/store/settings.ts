/**
 * Configurações do app — persistidas em `settings.json`, separado do
 * `data.json` dos lembretes. Mesma técnica do electron-store (escrita
 * atômica via tempfile + rename).
 *
 * Por que arquivo separado: lembretes são "dados do usuário" (queremos
 * preservar em uninstall — `deleteAppDataOnUninstall: false`). Settings
 * são preferências (poderiam reaparecer com defaults após reinstalar).
 * Separar permite tratar diferente no futuro.
 */

import Store from 'electron-store'
import { DEFAULT_SETTINGS, type Settings } from '../../src/types/settings'

let store: Store<Settings> | null = null

export function getSettings(): Store<Settings> {
  if (store) return store

  store = new Store<Settings>({
    name: 'settings',
    defaults: DEFAULT_SETTINGS,
  })

  console.log(`[settings] ready at ${store.path}`)
  return store
}
