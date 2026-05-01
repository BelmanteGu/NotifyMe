import type { Reminder } from '@/types/reminder'

/**
 * Lembretes mock pra Fase 1 — só pra visualizar a UI.
 * Na Fase 2 isso vai ser substituído por leitura do SQLite.
 */

function inHours(hours: number): string {
  const d = new Date()
  d.setHours(d.getHours() + hours)
  return d.toISOString()
}

function tomorrowAt(hour: number, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

export const mockReminders: Reminder[] = [
  {
    id: 'mock-1',
    title: 'Fechar o caixa',
    description: 'Conferir total e mandar foto pro contador',
    triggerAt: inHours(2),
    recurrence: 'daily',
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mock-2',
    title: 'Pagar guia do MEI',
    description: 'DAS — sempre dia 20',
    triggerAt: tomorrowAt(9, 0),
    recurrence: 'once',
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mock-3',
    title: 'Reunião semanal com fornecedor',
    triggerAt: tomorrowAt(14, 30),
    recurrence: 'weekly',
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
]
