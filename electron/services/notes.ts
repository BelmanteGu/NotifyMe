/**
 * NotesService — CRUD das notas adesivas.
 *
 * Mesma estrutura do RemindersService: lê e escreve um array em
 * electron-store, com cada operação retornando estado consistente.
 *
 * Diferente dos lembretes: notas não disparam eventos de scheduler,
 * são puramente visuais. Mas notificamos o Renderer via IPC change
 * pra todas as janelas (canvas + main) refletirem em tempo real.
 */

import type Store from 'electron-store'
import { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import type { Note, NoteInput, NotePatch } from '../../src/types/note'

interface NotesSchema {
  notes: Note[]
}

export class NotesService extends EventEmitter {
  constructor(private store: Store<NotesSchema>) {
    super()
  }

  list(): Note[] {
    return this.store.get('notes', []).slice()
  }

  findById(id: string): Note | null {
    return this.list().find((n) => n.id === id) ?? null
  }

  create(input: NoteInput): Note {
    const now = new Date().toISOString()
    const note: Note = {
      id: randomUUID(),
      text: input.text,
      x: input.x,
      y: input.y,
      color: input.color,
      rotation: input.rotation,
      createdAt: now,
      updatedAt: now,
    }
    const all = this.list()
    this.store.set('notes', [...all, note])
    this.emit('changed')
    return note
  }

  update(id: string, patch: NotePatch): Note | null {
    const all = this.list()
    const idx = all.findIndex((n) => n.id === id)
    if (idx === -1) return null

    const updated: Note = {
      ...all[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    }
    const next = [...all]
    next[idx] = updated
    this.store.set('notes', next)
    this.emit('changed')
    return updated
  }

  delete(id: string): boolean {
    const all = this.list()
    const filtered = all.filter((n) => n.id !== id)
    if (filtered.length === all.length) return false
    this.store.set('notes', filtered)
    this.emit('changed')
    return true
  }

  clear(): number {
    const all = this.list()
    if (all.length === 0) return 0
    this.store.set('notes', [])
    this.emit('changed')
    return all.length
  }
}
