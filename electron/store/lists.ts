/**
 * Store das listas — `lists.json` em userData.
 *
 * Separado de `data.json` (lembretes), `notes.json`, `settings.json`.
 */

import Store from 'electron-store'
import type { TaskList } from '../../src/types/list'

interface ListsSchema {
  lists: TaskList[]
}

let store: Store<ListsSchema> | null = null

export function getListsStore(): Store<ListsSchema> {
  if (store) return store
  store = new Store<ListsSchema>({
    name: 'lists',
    defaults: { lists: [] },
  })
  console.log(`[lists] ready at ${store.path}`)
  return store
}
