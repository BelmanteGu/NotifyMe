/**
 * Tipos centrais do domínio "lembrete".
 *
 * Mantemos os tipos num único lugar pra que Renderer (Vue), Preload e Main
 * (a partir da Fase 2) possam compartilhar a mesma definição.
 */

/** Como o lembrete se repete. */
export type Recurrence = 'once' | 'daily' | 'weekly'

/** Estado atual do lembrete. */
export type ReminderStatus = 'pending' | 'completed'

/**
 * Um lembrete cadastrado pelo usuário.
 *
 * - `id`: gerado no momento da criação. Na Fase 2 vai virar PK do SQLite.
 * - `triggerAt`: ISO 8601 (string) pra ser fácil de serializar/persistir.
 *   Convertido em Date só na hora de exibir/comparar.
 * - `description` é opcional — o usuário pode só colocar o título.
 */
export interface Reminder {
  id: string
  title: string
  description?: string
  triggerAt: string
  recurrence: Recurrence
  status: ReminderStatus
  createdAt: string
}

/**
 * Payload pra criar um lembrete novo.
 * Não inclui `id`, `status` e `createdAt` — esses são gerados na criação.
 */
export type ReminderInput = Omit<Reminder, 'id' | 'status' | 'createdAt'>

/** Mapa de rótulos pt-BR para o select de recorrência. */
export const RECURRENCE_LABELS: Record<Recurrence, string> = {
  once: 'Uma vez',
  daily: 'Todo dia',
  weekly: 'Toda semana',
}
