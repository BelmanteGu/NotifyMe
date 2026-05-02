/**
 * KanbanService — CRUD de boards/colunas/cards + sync com Reminders.
 *
 * Sync com lembretes:
 *   - Criar/editar card com `dueAt` → cria/atualiza Reminder vinculado
 *   - Remover `dueAt` → deleta Reminder vinculado
 *   - Deletar card / coluna / board → cleanup dos Reminders vinculados
 *
 * Padrão idêntico ao NotesService (EventEmitter + electron-store).
 */

import type Store from 'electron-store'
import { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import type {
  Board,
  BoardInput,
  BoardPatch,
  Card,
  CardInput,
  CardPatch,
  Column,
  ColumnInput,
  ColumnPatch,
} from '../../src/types/kanban'
import { DEFAULT_COLUMNS } from '../../src/types/kanban'
import type { RemindersService } from './reminders'
import type { ReminderScheduler } from '../scheduler'

interface KanbanSchema {
  boards: Board[]
  schemaVersion: number
}

export class KanbanService extends EventEmitter {
  constructor(
    private store: Store<KanbanSchema>,
    private remindersService: RemindersService,
    private scheduler: ReminderScheduler,
    private onReminderChanged: () => void
  ) {
    super()
  }

  // ─── Boards ─────────────────────────────────────────────────────

  listBoards(): Board[] {
    return this.store.get('boards', []).slice()
  }

  findBoard(id: string): Board | null {
    return this.listBoards().find((b) => b.id === id) ?? null
  }

  createBoard(input: BoardInput): Board {
    const now = new Date().toISOString()
    const columns: Column[] = DEFAULT_COLUMNS.map((c) => ({
      id: randomUUID(),
      name: c.name,
      color: c.color,
      wipLimit: c.wipLimit,
      cards: [],
    }))
    const board: Board = {
      id: randomUUID(),
      name: input.name,
      icon: input.icon,
      color: input.color,
      columns,
      archived: false,
      createdAt: now,
      updatedAt: now,
    }
    const all = this.listBoards()
    this.store.set('boards', [...all, board])
    this.emit('changed')
    return board
  }

  updateBoard(id: string, patch: BoardPatch): Board | null {
    const all = this.listBoards()
    const idx = all.findIndex((b) => b.id === id)
    if (idx === -1) return null
    const updated: Board = {
      ...all[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    }
    const next = [...all]
    next[idx] = updated
    this.store.set('boards', next)
    this.emit('changed')
    return updated
  }

  deleteBoard(id: string): boolean {
    const all = this.listBoards()
    const board = all.find((b) => b.id === id)
    if (!board) return false

    // Cleanup: deletar Reminders vinculados de TODOS os cards do board
    this.cleanupBoardReminders(board)

    const filtered = all.filter((b) => b.id !== id)
    this.store.set('boards', filtered)
    this.emit('changed')
    return true
  }

  reorderBoards(boardIds: string[]): void {
    const all = this.listBoards()
    const map = new Map(all.map((b) => [b.id, b]))
    const reordered = boardIds
      .map((id) => map.get(id))
      .filter((b): b is Board => !!b)
    // Inclui boards não mencionados no fim (defensivo)
    for (const b of all) {
      if (!boardIds.includes(b.id)) reordered.push(b)
    }
    this.store.set('boards', reordered)
    this.emit('changed')
  }

  // ─── Columns ────────────────────────────────────────────────────

  createColumn(boardId: string, input: ColumnInput): Column | null {
    return this.mutateBoard(boardId, (board) => {
      const column: Column = {
        id: randomUUID(),
        name: input.name,
        color: input.color,
        wipLimit: input.wipLimit,
        cards: [],
      }
      board.columns.push(column)
      return column
    })
  }

  updateColumn(
    boardId: string,
    columnId: string,
    patch: ColumnPatch
  ): Column | null {
    return this.mutateBoard(boardId, (board) => {
      const col = board.columns.find((c) => c.id === columnId)
      if (!col) return null
      Object.assign(col, patch)
      return col
    })
  }

  deleteColumn(boardId: string, columnId: string): boolean {
    let removed = false
    this.mutateBoard(boardId, (board) => {
      const col = board.columns.find((c) => c.id === columnId)
      if (!col) return null

      // Cleanup reminders dos cards dessa coluna
      for (const card of col.cards) {
        if (card.linkedReminderId) {
          this.remindersService.delete(card.linkedReminderId)
          this.onReminderChanged()
        }
      }

      board.columns = board.columns.filter((c) => c.id !== columnId)
      removed = true
      return null
    })
    return removed
  }

  reorderColumns(boardId: string, columnIds: string[]): void {
    this.mutateBoard(boardId, (board) => {
      const map = new Map(board.columns.map((c) => [c.id, c]))
      const reordered = columnIds
        .map((id) => map.get(id))
        .filter((c): c is Column => !!c)
      for (const c of board.columns) {
        if (!columnIds.includes(c.id)) reordered.push(c)
      }
      board.columns = reordered
      return null
    })
  }

  // ─── Cards ──────────────────────────────────────────────────────

  createCard(
    boardId: string,
    columnId: string,
    input: CardInput
  ): Card | null {
    let createdCard: Card | null = null
    let parentBoard: Board | null = null

    this.mutateBoard(boardId, (board) => {
      const col = board.columns.find((c) => c.id === columnId)
      if (!col) return null

      const now = new Date().toISOString()
      const card: Card = {
        id: randomUUID(),
        title: input.title,
        description: input.description ?? '',
        labels: input.labels ?? [],
        checklist: input.checklist ?? [],
        dueAt: input.dueAt,
        completed: false,
        createdAt: now,
        updatedAt: now,
      }
      col.cards.push(card)
      createdCard = card
      parentBoard = board
      return card
    })

    if (createdCard && parentBoard) {
      this.syncCardReminder(createdCard, parentBoard)
      // Persiste linkedReminderId se foi criado
      if (createdCard.linkedReminderId) {
        this.persistCardChange(boardId, createdCard.id, {
          linkedReminderId: createdCard.linkedReminderId,
        })
      }
    }

    return createdCard
  }

  updateCard(
    boardId: string,
    cardId: string,
    patch: CardPatch
  ): Card | null {
    let updatedCard: Card | null = null
    let parentBoard: Board | null = null
    let prevDueAt: string | undefined

    this.mutateBoard(boardId, (board) => {
      for (const col of board.columns) {
        const card = col.cards.find((c) => c.id === cardId)
        if (card) {
          prevDueAt = card.dueAt
          Object.assign(card, patch, {
            updatedAt: new Date().toISOString(),
          })
          updatedCard = card
          parentBoard = board
          return card
        }
      }
      return null
    })

    if (updatedCard && parentBoard) {
      // Sincroniza reminder se dueAt mudou OU se completed mudou
      const dueChanged =
        'dueAt' in patch && patch.dueAt !== prevDueAt
      const completedChanged = patch.completed !== undefined
      if (dueChanged) {
        this.syncCardReminder(updatedCard, parentBoard)
        // Persiste mudança de linkedReminderId
        this.persistCardChange(boardId, updatedCard.id, {
          linkedReminderId: updatedCard.linkedReminderId,
        })
      }
      if (completedChanged && updatedCard.linkedReminderId && updatedCard.completed) {
        this.remindersService.markCompleted(updatedCard.linkedReminderId)
        this.onReminderChanged()
      }
    }

    return updatedCard
  }

  deleteCard(boardId: string, cardId: string): boolean {
    let removed = false
    this.mutateBoard(boardId, (board) => {
      for (const col of board.columns) {
        const idx = col.cards.findIndex((c) => c.id === cardId)
        if (idx !== -1) {
          const card = col.cards[idx]
          if (card.linkedReminderId) {
            this.remindersService.delete(card.linkedReminderId)
            this.onReminderChanged()
          }
          col.cards.splice(idx, 1)
          removed = true
          return null
        }
      }
      return null
    })
    return removed
  }

  /** Move card entre colunas ou reordena dentro da mesma. */
  moveCard(
    boardId: string,
    cardId: string,
    fromColumnId: string,
    toColumnId: string,
    toIndex: number
  ): boolean {
    let moved = false
    this.mutateBoard(boardId, (board) => {
      const fromCol = board.columns.find((c) => c.id === fromColumnId)
      const toCol = board.columns.find((c) => c.id === toColumnId)
      if (!fromCol || !toCol) return null

      const idx = fromCol.cards.findIndex((c) => c.id === cardId)
      if (idx === -1) return null

      const [card] = fromCol.cards.splice(idx, 1)
      const safeIndex = Math.max(0, Math.min(toIndex, toCol.cards.length))
      toCol.cards.splice(safeIndex, 0, card)
      card.updatedAt = new Date().toISOString()
      moved = true
      return null
    })
    return moved
  }

  /** Reordena cards de uma única coluna por array de IDs (após drag). */
  reorderCards(
    boardId: string,
    columnId: string,
    cardIds: string[]
  ): void {
    this.mutateBoard(boardId, (board) => {
      const col = board.columns.find((c) => c.id === columnId)
      if (!col) return null
      const map = new Map(col.cards.map((c) => [c.id, c]))
      const reordered = cardIds
        .map((id) => map.get(id))
        .filter((c): c is Card => !!c)
      for (const c of col.cards) {
        if (!cardIds.includes(c.id)) reordered.push(c)
      }
      col.cards = reordered
      return null
    })
  }

  /** Busca cards por título/descrição em todos os boards não arquivados. */
  searchCards(
    query: string
  ): Array<{ board: Board; column: Column; card: Card }> {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const results: Array<{ board: Board; column: Column; card: Card }> = []
    for (const board of this.listBoards()) {
      if (board.archived) continue
      for (const column of board.columns) {
        for (const card of column.cards) {
          if (
            card.title.toLowerCase().includes(q) ||
            card.description.toLowerCase().includes(q)
          ) {
            results.push({ board, column, card })
          }
        }
      }
    }
    return results
  }

  /** Stats pra header do board. */
  boardStats(id: string): {
    totalCards: number
    completedCards: number
    overdueCards: number
  } {
    const board = this.findBoard(id)
    if (!board)
      return { totalCards: 0, completedCards: 0, overdueCards: 0 }

    let total = 0
    let completed = 0
    let overdue = 0
    const now = Date.now()
    for (const col of board.columns) {
      for (const card of col.cards) {
        total++
        if (card.completed) completed++
        if (
          card.dueAt &&
          !card.completed &&
          new Date(card.dueAt).getTime() < now
        ) {
          overdue++
        }
      }
    }
    return { totalCards: total, completedCards: completed, overdueCards: overdue }
  }

  // ─── Helpers privados ───────────────────────────────────────────

  /**
   * Aplica um mutator no board (passado por referência), persiste tudo
   * e emite 'changed'. Retorna o que o mutator devolveu.
   */
  private mutateBoard<T>(
    boardId: string,
    mutator: (board: Board) => T
  ): T | null {
    const all = this.listBoards()
    const idx = all.findIndex((b) => b.id === boardId)
    if (idx === -1) return null

    // Clone profundo do board pra não mutar referência cacheada
    const board: Board = JSON.parse(JSON.stringify(all[idx]))
    const result = mutator(board)
    board.updatedAt = new Date().toISOString()

    const next = [...all]
    next[idx] = board
    this.store.set('boards', next)
    this.emit('changed')
    return result
  }

  /** Atualiza um campo específico de um card sem disparar sync de reminder. */
  private persistCardChange(
    boardId: string,
    cardId: string,
    fields: Partial<Card>
  ): void {
    const all = this.listBoards()
    const idx = all.findIndex((b) => b.id === boardId)
    if (idx === -1) return
    const board: Board = JSON.parse(JSON.stringify(all[idx]))
    for (const col of board.columns) {
      const card = col.cards.find((c) => c.id === cardId)
      if (card) {
        Object.assign(card, fields)
        const next = [...all]
        next[idx] = board
        this.store.set('boards', next)
        return
      }
    }
  }

  /**
   * Cria/atualiza/remove o Reminder vinculado conforme o estado de dueAt.
   * Muta o card.linkedReminderId em memória — caller deve persistir.
   * Sincroniza com o scheduler (cancel + schedule conforme necessário).
   */
  private syncCardReminder(card: Card, board: Board): void {
    if (card.dueAt) {
      if (card.linkedReminderId) {
        // Atualiza triggerAt do reminder existente + reagenda
        const updated = this.remindersService.updateTriggerAt(
          card.linkedReminderId,
          card.dueAt
        )
        if (updated) {
          this.scheduler.cancel(updated.id)
          this.scheduler.schedule(updated)
        }
        this.onReminderChanged()
      } else {
        // Cria novo reminder vinculado + agenda
        const reminder = this.remindersService.create({
          title: `📋 ${card.title}`,
          description: `Card no board "${board.name}"`,
          triggerAt: card.dueAt,
          recurrence: 'once',
        })
        this.scheduler.schedule(reminder)
        card.linkedReminderId = reminder.id
        this.onReminderChanged()
      }
    } else if (card.linkedReminderId) {
      // Removeu dueAt — apaga reminder + cancela
      this.scheduler.cancel(card.linkedReminderId)
      this.remindersService.delete(card.linkedReminderId)
      card.linkedReminderId = undefined
      this.onReminderChanged()
    }
  }

  /** Apaga todos os reminders vinculados aos cards de um board. */
  private cleanupBoardReminders(board: Board): void {
    for (const col of board.columns) {
      for (const card of col.cards) {
        if (card.linkedReminderId) {
          this.scheduler.cancel(card.linkedReminderId)
          this.remindersService.delete(card.linkedReminderId)
        }
      }
    }
    this.onReminderChanged()
  }
}
