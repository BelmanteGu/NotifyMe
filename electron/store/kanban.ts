/**
 * Store do Kanban — `kanban.json` em userData.
 *
 * Separado das outras stores (`data.json` lembretes, `notes.json`,
 * `lists.json`, `settings.json`). Mesma técnica do electron-store:
 * escrita atômica via tempfile + rename.
 */

import Store from 'electron-store'
import type { Board } from '../../src/types/kanban'

interface KanbanSchema {
  boards: Board[]
  schemaVersion: number
}

let store: Store<KanbanSchema> | null = null

export function getKanbanStore(): Store<KanbanSchema> {
  if (store) return store

  store = new Store<KanbanSchema>({
    name: 'kanban',
    defaults: {
      boards: [],
      schemaVersion: 1,
    },
  })

  console.log(`[kanban] ready at ${store.path}`)
  return store
}
