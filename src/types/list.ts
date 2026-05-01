/**
 * Tipos das listas / to-do.
 *
 * Cada `TaskList` é uma "página" — tipo uma folha de caderno com data
 * e itens checáveis. Múltiplas listas formam um histórico navegável.
 */

export interface TaskItem {
  id: string
  text: string
  done: boolean
  createdAt: string
}

export interface TaskList {
  id: string
  title: string
  /** Data "do dia" da lista (ISO date YYYY-MM-DD). */
  date: string
  items: TaskItem[]
  createdAt: string
  updatedAt: string
}

export type TaskListInput = Pick<TaskList, 'title' | 'date'>
export type TaskListPatch = Partial<Pick<TaskList, 'title' | 'date'>>
