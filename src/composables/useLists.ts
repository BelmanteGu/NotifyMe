import { ref, computed } from 'vue'
import type { TaskList, TaskListInput, TaskListPatch } from '@/types/list'

/**
 * Composable singleton das listas. State no Main, Renderer subscribe
 * a 'lists:changed' e mantém cache reativo.
 */

const lists = ref<TaskList[]>([])
const loading = ref(true)
let initialized = false

/** Listas ordenadas por data desc (mais recente primeiro). Empate desempata por createdAt desc. */
const sortedLists = computed(() =>
  [...lists.value].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return b.createdAt.localeCompare(a.createdAt)
  })
)

async function refresh() {
  loading.value = true
  try {
    lists.value = await window.notifyme.lists.list()
  } catch (e) {
    console.error('[useLists] list failed:', e)
  } finally {
    loading.value = false
  }
}

async function create(input: TaskListInput): Promise<TaskList> {
  const list = await window.notifyme.lists.create(input)
  lists.value = [...lists.value, list]
  return list
}

async function update(id: string, patch: TaskListPatch): Promise<TaskList | null> {
  const list = await window.notifyme.lists.update(id, patch)
  if (list) {
    const idx = lists.value.findIndex((l) => l.id === id)
    if (idx >= 0) lists.value[idx] = list
  }
  return list
}

async function remove(id: string): Promise<boolean> {
  const ok = await window.notifyme.lists.delete(id)
  if (ok) lists.value = lists.value.filter((l) => l.id !== id)
  return ok
}

async function addItem(listId: string, text: string) {
  const list = await window.notifyme.lists.addItem(listId, text)
  if (list) {
    const idx = lists.value.findIndex((l) => l.id === listId)
    if (idx >= 0) lists.value[idx] = list
  }
  return list
}

async function toggleItem(listId: string, itemId: string) {
  const list = await window.notifyme.lists.toggleItem(listId, itemId)
  if (list) {
    const idx = lists.value.findIndex((l) => l.id === listId)
    if (idx >= 0) lists.value[idx] = list
  }
  return list
}

async function updateItem(listId: string, itemId: string, text: string) {
  const list = await window.notifyme.lists.updateItem(listId, itemId, text)
  if (list) {
    const idx = lists.value.findIndex((l) => l.id === listId)
    if (idx >= 0) lists.value[idx] = list
  }
  return list
}

async function removeItem(listId: string, itemId: string) {
  const list = await window.notifyme.lists.removeItem(listId, itemId)
  if (list) {
    const idx = lists.value.findIndex((l) => l.id === listId)
    if (idx >= 0) lists.value[idx] = list
  }
  return list
}

async function exportMd(listId: string) {
  return window.notifyme.lists.exportMd(listId)
}

async function exportImage(
  listId: string,
  rect: { x: number; y: number; width: number; height: number }
) {
  return window.notifyme.lists.exportImage(listId, rect)
}

async function importMd() {
  const result = await window.notifyme.lists.importMd()
  if (result.success && result.list) {
    lists.value = [...lists.value, result.list]
  }
  return result
}

export function useLists() {
  if (!initialized) {
    initialized = true
    refresh()
    /*
     * NOTA: NÃO subscrevemos `lists:changed` aqui — cada mutação IPC
     * já retorna a entidade atualizada e atualizamos o cache local
     * direto. Re-fetch global causaria piscar do Vue (re-monta inputs)
     * e atrapalha digitação. Se algum dia outra janela mudar listas,
     * reativar com cuidado pra preservar foco/cursor.
     */
  }

  return {
    lists: sortedLists,
    loading,
    create,
    update,
    remove,
    addItem,
    toggleItem,
    updateItem,
    removeItem,
    exportMd,
    exportImage,
    importMd,
    refresh,
  }
}
