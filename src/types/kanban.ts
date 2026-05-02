/**
 * Tipos do domínio Kanban.
 *
 * Hierarquia: Board → Column → Card
 *   Um Board tem N Columns ordenadas (ordem via posição no array)
 *   Uma Column tem N Cards ordenados (idem)
 *
 * Decisões:
 * - Multi-board desde o MVP (custo baixo, migração futura cara)
 * - Plain text na descrição (auto-link de URL no render, não no store)
 * - Card com `dueAt` cria/atualiza/apaga Reminder vinculado via service
 *   (campo `linkedReminderId` faz a ponte)
 */

/** Cores predefinidas pra colunas, labels e ícone do board. */
export const KANBAN_COLORS = [
  'gray',
  'orange',
  'green',
  'blue',
  'purple',
  'pink',
  'red',
] as const

export type KanbanColor = (typeof KANBAN_COLORS)[number]

/** Cor de label: predefinida ou hex custom. */
export type LabelColor = KanbanColor | string

export interface CardLabel {
  id: string
  name: string
  color: LabelColor
}

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface Card {
  id: string
  title: string
  description: string
  labels: CardLabel[]
  checklist: ChecklistItem[]
  /** Data de vencimento (ISO 8601). Cria/atualiza Reminder vinculado. */
  dueAt?: string
  /** ID do Reminder no sistema existente — sync bidirecional via service. */
  linkedReminderId?: string
  /** Marca visual de "concluído" (independente de mover pra coluna Done). */
  completed: boolean
  createdAt: string
  updatedAt: string
}

export interface Column {
  id: string
  name: string
  color: KanbanColor
  /** Limite de cards (WIP). undefined = sem limite. */
  wipLimit?: number
  cards: Card[]
}

export interface Board {
  id: string
  name: string
  /** Emoji ou letra inicial usada como ícone visual. */
  icon: string
  color: KanbanColor
  columns: Column[]
  /** archived = não aparece no selector mas não foi deletado. */
  archived: boolean
  createdAt: string
  updatedAt: string
}

// ─── Inputs / Patches ─────────────────────────────────────────────

export type BoardInput = Pick<Board, 'name' | 'icon' | 'color'>
export type BoardPatch = Partial<BoardInput> & { archived?: boolean }

export type ColumnInput = Pick<Column, 'name' | 'color'> & { wipLimit?: number }
export type ColumnPatch = Partial<ColumnInput>

export type CardInput = Pick<Card, 'title'> & {
  description?: string
  labels?: CardLabel[]
  checklist?: ChecklistItem[]
  dueAt?: string
}
export type CardPatch = Partial<
  Pick<Card, 'title' | 'description' | 'labels' | 'checklist' | 'dueAt' | 'completed'>
>

// ─── Defaults ─────────────────────────────────────────────────────

export const DEFAULT_COLUMNS: ColumnInput[] = [
  { name: 'A fazer', color: 'gray' },
  { name: 'Em progresso', color: 'orange' },
  { name: 'Concluído', color: 'green' },
]

export const DEFAULT_LABELS: Omit<CardLabel, 'id'>[] = [
  { name: 'Urgente', color: 'red' },
  { name: 'Importante', color: 'orange' },
  { name: 'Ideia', color: 'purple' },
]

// ─── Paletas de cores (light/dark) ────────────────────────────────

export interface KanbanPalette {
  bg: string
  bgSoft: string
  text: string
  border: string
}

export const COLOR_PALETTES: Record<
  KanbanColor,
  { light: KanbanPalette; dark: KanbanPalette }
> = {
  gray: {
    light: { bg: '#6B7280', bgSoft: '#F3F4F6', text: '#374151', border: '#E5E7EB' },
    dark: { bg: '#9CA3AF', bgSoft: '#1F2937', text: '#E5E7EB', border: '#374151' },
  },
  orange: {
    light: { bg: '#F97316', bgSoft: '#FFEDD5', text: '#9A3412', border: '#FED7AA' },
    dark: { bg: '#FB923C', bgSoft: '#7C2D12', text: '#FED7AA', border: '#9A3412' },
  },
  green: {
    light: { bg: '#10B981', bgSoft: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
    dark: { bg: '#34D399', bgSoft: '#064E3B', text: '#A7F3D0', border: '#065F46' },
  },
  blue: {
    light: { bg: '#3B82F6', bgSoft: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },
    dark: { bg: '#60A5FA', bgSoft: '#1E3A8A', text: '#BFDBFE', border: '#1E40AF' },
  },
  purple: {
    light: { bg: '#8B5CF6', bgSoft: '#EDE9FE', text: '#5B21B6', border: '#DDD6FE' },
    dark: { bg: '#A78BFA', bgSoft: '#4C1D95', text: '#DDD6FE', border: '#5B21B6' },
  },
  pink: {
    light: { bg: '#EC4899', bgSoft: '#FCE7F3', text: '#9D174D', border: '#FBCFE8' },
    dark: { bg: '#F472B6', bgSoft: '#831843', text: '#FBCFE8', border: '#9D174D' },
  },
  red: {
    light: { bg: '#EF4444', bgSoft: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
    dark: { bg: '#F87171', bgSoft: '#7F1D1D', text: '#FECACA', border: '#991B1B' },
  },
}

export function isPresetColor(color: string): color is KanbanColor {
  return (KANBAN_COLORS as readonly string[]).includes(color)
}

/** Decide texto claro/escuro pra hex custom (label). */
export function getContrastText(hex: string): string {
  const cleaned = hex.replace('#', '')
  if (cleaned.length !== 6) return '#1F2937'
  const r = parseInt(cleaned.slice(0, 2), 16)
  const g = parseInt(cleaned.slice(2, 4), 16)
  const b = parseInt(cleaned.slice(4, 6), 16)
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
    return '#1F2937'
  }
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? '#1F2937' : '#F9FAFB'
}

/** Resolve paleta (preset ou hex). */
export function resolveLabelStyle(
  color: LabelColor,
  isDark: boolean
): { bg: string; text: string } {
  if (isPresetColor(color)) {
    const p = COLOR_PALETTES[color][isDark ? 'dark' : 'light']
    return { bg: p.bgSoft, text: p.text }
  }
  return { bg: color, text: getContrastText(color) }
}
