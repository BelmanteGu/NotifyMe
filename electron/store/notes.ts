/**
 * Store das notas adesivas — `notes.json` em userData.
 *
 * Separado dos lembretes (`data.json`) e configurações (`settings.json`).
 * Mesma técnica do electron-store: escrita atômica via tempfile + rename.
 */

import Store from 'electron-store'
import type { Note } from '../../src/types/note'

interface NotesSchema {
  notes: Note[]
}

let store: Store<NotesSchema> | null = null

export function getNotesStore(): Store<NotesSchema> {
  if (store) return store

  store = new Store<NotesSchema>({
    name: 'notes',
    defaults: {
      notes: [],
    },
  })

  console.log(`[notes] ready at ${store.path}`)
  return store
}
