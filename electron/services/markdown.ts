/**
 * Serializador/parser .md pras listas.
 *
 * Formato:
 *
 *   # Título da lista
 *
 *   Data: DD/MM/AAAA
 *
 *   - [x] Item concluído
 *   - [ ] Item pendente
 *   - [ ] Outro item
 *
 * Linhas extras em branco e linhas que não casam com nenhum padrão
 * são ignoradas — parser tolerante.
 */

import { randomUUID } from 'node:crypto'
import type { TaskItem, TaskList } from '../../src/types/list'

export function listToMarkdown(list: TaskList): string {
  const lines: string[] = []
  lines.push(`# ${list.title}`)
  lines.push('')
  lines.push(`Data: ${formatDateBR(list.date)}`)
  lines.push('')
  for (const item of list.items) {
    const check = item.done ? 'x' : ' '
    lines.push(`- [${check}] ${item.text}`)
  }
  lines.push('') // newline final
  return lines.join('\n')
}

export interface ParsedList {
  title: string
  date: string
  items: TaskItem[]
}

export function markdownToList(md: string): ParsedList {
  const lines = md.split('\n')
  let title = 'Lista importada'
  let date = todayISO()
  const items: TaskItem[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Título: primeira linha começando com #
    if (trimmed.startsWith('# ') && title === 'Lista importada') {
      title = trimmed.slice(2).trim()
      continue
    }

    // Data: "Data: DD/MM/AAAA"
    const dateMatch = trimmed.match(/^Data:\s*(\d{2})\/(\d{2})\/(\d{4})/i)
    if (dateMatch) {
      date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
      continue
    }

    // Item de checklist: "- [x] texto" ou "- [ ] texto"
    const itemMatch = trimmed.match(/^[-*+]\s+\[([ xX])\]\s+(.+)$/)
    if (itemMatch) {
      const done = itemMatch[1].toLowerCase() === 'x'
      const text = itemMatch[2].trim()
      items.push({
        id: randomUUID(),
        text,
        done,
        createdAt: new Date().toISOString(),
      })
    }
  }

  return { title, date, items }
}

/** "2026-05-01" → "01/05/2026" */
function formatDateBR(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  if (!y || !m || !d) return isoDate
  return `${d}/${m}/${y}`
}

function todayISO(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
