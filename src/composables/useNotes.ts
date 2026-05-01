import { ref } from 'vue'
import type { Note, NoteInput, NotePatch } from '@/types/note'

/**
 * Composable singleton das notas adesivas.
 *
 * State canônico no Main process. Renderer faz getList inicial,
 * subscreve `notes:changed` push pra atualizar quando outra janela
 * (canvas / view main) muda algo.
 */

const notes = ref<Note[]>([])
const loading = ref(true)
let initialized = false

async function refresh() {
  loading.value = true
  try {
    notes.value = await window.notifyme.notes.list()
  } catch (e) {
    console.error('[useNotes] list failed:', e)
  } finally {
    loading.value = false
  }
}

async function create(input: NoteInput): Promise<Note> {
  const note = await window.notifyme.notes.create(input)
  // O push 'notes:changed' vai trazer a lista atualizada,
  // mas atualizamos local imediatamente pra UI ficar instantânea
  notes.value = [...notes.value, note]
  return note
}

async function update(id: string, patch: NotePatch): Promise<Note | null> {
  const note = await window.notifyme.notes.update(id, patch)
  if (note) {
    const idx = notes.value.findIndex((n) => n.id === id)
    if (idx >= 0) notes.value[idx] = note
  }
  return note
}

async function remove(id: string): Promise<boolean> {
  const ok = await window.notifyme.notes.delete(id)
  if (ok) {
    notes.value = notes.value.filter((n) => n.id !== id)
  }
  return ok
}

async function clearAll(): Promise<number> {
  const count = await window.notifyme.notes.clear()
  if (count > 0) notes.value = []
  return count
}

export function useNotes() {
  if (!initialized) {
    initialized = true
    refresh()
    window.notifyme.notes.onChanged(() => refresh())
  }

  return {
    notes,
    loading,
    create,
    update,
    remove,
    clearAll,
    refresh,
  }
}
