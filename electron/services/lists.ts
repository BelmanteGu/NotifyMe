/**
 * ListsService — CRUD das listas + manipulação dos itens.
 */

import type Store from 'electron-store'
import { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import type {
  TaskItem,
  TaskList,
  TaskListInput,
  TaskListPatch,
} from '../../src/types/list'

interface ListsSchema {
  lists: TaskList[]
}

export class ListsService extends EventEmitter {
  constructor(private store: Store<ListsSchema>) {
    super()
  }

  list(): TaskList[] {
    return this.store.get('lists', []).slice()
  }

  findById(id: string): TaskList | null {
    return this.list().find((l) => l.id === id) ?? null
  }

  create(input: TaskListInput): TaskList {
    const now = new Date().toISOString()
    const list: TaskList = {
      id: randomUUID(),
      title: input.title,
      date: input.date,
      items: [],
      createdAt: now,
      updatedAt: now,
    }
    this.store.set('lists', [...this.list(), list])
    this.emit('changed')
    return list
  }

  /** Cria uma lista importada com items pré-definidos (usado no import .md). */
  createFromImport(input: {
    title: string
    date: string
    items: TaskItem[]
  }): TaskList {
    const now = new Date().toISOString()
    const list: TaskList = {
      id: randomUUID(),
      title: input.title,
      date: input.date,
      items: input.items,
      createdAt: now,
      updatedAt: now,
    }
    this.store.set('lists', [...this.list(), list])
    this.emit('changed')
    return list
  }

  update(id: string, patch: TaskListPatch): TaskList | null {
    return this.mutateList(id, (l) => ({ ...l, ...patch }))
  }

  delete(id: string): boolean {
    const all = this.list()
    const filtered = all.filter((l) => l.id !== id)
    if (filtered.length === all.length) return false
    this.store.set('lists', filtered)
    this.emit('changed')
    return true
  }

  addItem(listId: string, text: string): TaskList | null {
    return this.mutateList(listId, (l) => ({
      ...l,
      items: [
        ...l.items,
        {
          id: randomUUID(),
          text,
          done: false,
          createdAt: new Date().toISOString(),
        },
      ],
    }))
  }

  toggleItem(listId: string, itemId: string): TaskList | null {
    return this.mutateList(listId, (l) => ({
      ...l,
      items: l.items.map((i) =>
        i.id === itemId ? { ...i, done: !i.done } : i
      ),
    }))
  }

  updateItemText(listId: string, itemId: string, text: string): TaskList | null {
    return this.mutateList(listId, (l) => ({
      ...l,
      items: l.items.map((i) => (i.id === itemId ? { ...i, text } : i)),
    }))
  }

  removeItem(listId: string, itemId: string): TaskList | null {
    return this.mutateList(listId, (l) => ({
      ...l,
      items: l.items.filter((i) => i.id !== itemId),
    }))
  }

  /** Helper: aplica um transform na lista identificada por id. */
  private mutateList(
    id: string,
    transform: (l: TaskList) => TaskList
  ): TaskList | null {
    const all = this.list()
    const idx = all.findIndex((l) => l.id === id)
    if (idx === -1) return null
    const updated: TaskList = {
      ...transform(all[idx]),
      updatedAt: new Date().toISOString(),
    }
    const next = [...all]
    next[idx] = updated
    this.store.set('lists', next)
    this.emit('changed')
    return updated
  }
}
