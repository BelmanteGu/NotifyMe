/**
 * Camada de persistência: arquivo JSON via electron-store.
 *
 * Por que electron-store em vez de SQLite:
 *   1. Escrita atômica (tempfile + rename) — imune ao problema de
 *      "database is locked" causado por OneDrive/Defender segurando o arquivo.
 *   2. Sem dependência nativa, sem WASM, sem build native.
 *   3. Suficiente pro caso de uso (centenas de lembretes, lê tudo na memória).
 *
 * Veja docs/04-persistencia.md.
 */

import Store from 'electron-store'
import type { Reminder } from '../../src/types/reminder'

interface StoreSchema {
  reminders: Reminder[]
  schemaVersion: number
}

let store: Store<StoreSchema> | null = null

export function getStore(): Store<StoreSchema> {
  if (store) return store

  store = new Store<StoreSchema>({
    name: 'data',
    defaults: {
      reminders: [],
      schemaVersion: 1,
    },
  })

  console.log(`[store] ready at ${store.path}`)
  return store
}
