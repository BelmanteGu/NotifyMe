/**
 * Helpers de formatação e parsing de data, em pt-BR.
 *
 * Formatos manipulados:
 *   - ISO 8601: "2026-05-01T16:05:00.000Z" (formato canônico no store)
 *   - BR Date: "DD/MM/AAAA" (input do usuário)
 *   - Time:    "HH:MM" (input do usuário)
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

/** ISO → "DD/MM/AAAA" */
export function isoToBRDate(iso: string): string {
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

/** ISO → "HH:MM" */
export function isoToTimeInput(iso: string): string {
  const d = new Date(iso)
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * Aplica máscara DD/MM/AAAA enquanto o usuário digita.
 * Retorna a string com '/' nas posições corretas.
 */
export function maskBRDate(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

/** Aplica máscara HH:MM. */
export function maskTime(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

/**
 * Combina "DD/MM/AAAA" + "HH:MM" em ISO 8601.
 * Retorna `null` se o input estiver inválido (não tem 10 chars na data,
 * mês > 12, etc).
 */
export function combineBRDateTime(brDate: string, time: string): string | null {
  const dateMatch = brDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  const timeMatch = time.match(/^(\d{2}):(\d{2})$/)
  if (!dateMatch || !timeMatch) return null

  const [, dd, mm, yyyy] = dateMatch
  const [, hh, min] = timeMatch

  const date = new Date(
    Number(yyyy),
    Number(mm) - 1,
    Number(dd),
    Number(hh),
    Number(min),
    0
  )

  if (Number.isNaN(date.getTime())) return null
  // Sanity: garante que os componentes não foram "absorvidos" (ex: 31/02 vira 03/03)
  if (
    date.getFullYear() !== Number(yyyy) ||
    date.getMonth() !== Number(mm) - 1 ||
    date.getDate() !== Number(dd)
  ) {
    return null
  }

  return date.toISOString()
}
