/**
 * Helpers de formatação de data, em pt-BR.
 *
 * Usamos `Intl` nativo do navegador — sem dependência extra (date-fns/dayjs).
 * Pra um app simples como o NotifyMe é mais que suficiente.
 */

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
})

/** "Hoje, 18:00" / "Amanhã, 09:00" / "21/05/2026, 14:00" */
export function formatRelative(iso: string): string {
  const date = new Date(iso)
  const now = new Date()

  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round(
    (startOf(date).getTime() - startOf(now).getTime()) / 86_400_000
  )

  const time = timeFormatter.format(date)
  if (diffDays === 0) return `Hoje, ${time}`
  if (diffDays === 1) return `Amanhã, ${time}`
  if (diffDays === -1) return `Ontem, ${time}`
  return `${dateFormatter.format(date)}, ${time}`
}

/**
 * Combina um input de data (YYYY-MM-DD) e hora (HH:mm) num ISO local.
 * Útil pro modal de criar lembrete.
 */
export function combineDateTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString()
}

/** Pega o componente "YYYY-MM-DD" de um ISO. */
export function isoToDateInput(iso: string): string {
  const d = new Date(iso)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Pega o componente "HH:mm" de um ISO. */
export function isoToTimeInput(iso: string): string {
  const d = new Date(iso)
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}
