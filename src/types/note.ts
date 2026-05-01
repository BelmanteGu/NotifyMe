/**
 * Tipos das notas adesivas (sticky notes).
 *
 * `color` da nota pode ser:
 *   - Uma das predefinidas (ver NOTE_COLORS) — usa COLOR_PALETTES com
 *     variantes light/dark
 *   - Um hex custom (ex: '#FF5733') — usa direto + getContrastText pra
 *     decidir cor do texto baseado em luminância
 */

export const NOTE_COLORS = [
  'yellow',
  'pink',
  'blue',
  'green',
  'orange',
  'purple',
] as const

export type PresetNoteColor = (typeof NOTE_COLORS)[number]

/** Cor da nota: predefinida ou hex custom (#RRGGBB). */
export type NoteColor = PresetNoteColor | string

export interface Note {
  id: string
  text: string
  /** Posição absoluta dentro do board. */
  x: number
  y: number
  color: NoteColor
  /** Rotação inicial -3° a +3° (random na criação). */
  rotation: number
  createdAt: string
  updatedAt: string
}

export type NoteInput = Pick<Note, 'text' | 'x' | 'y' | 'color' | 'rotation'>
export type NotePatch = Partial<Pick<Note, 'text' | 'x' | 'y' | 'color'>>

export interface ColorPalette {
  bg: string
  text: string
}

/**
 * Paletas das 6 cores predefinidas. Cada uma tem variante light/dark.
 * Light = tom claro estilo papel; dark = tom escuro com texto claro.
 */
export const COLOR_PALETTES: Record<
  PresetNoteColor,
  { light: ColorPalette; dark: ColorPalette }
> = {
  yellow: {
    light: { bg: '#FFFAE0', text: '#854D0E' },
    dark: { bg: '#78350F', text: '#FEF3C7' },
  },
  pink: {
    light: { bg: '#FFF0F8', text: '#9D174D' },
    dark: { bg: '#831843', text: '#FCE7F3' },
  },
  blue: {
    light: { bg: '#EAF4FF', text: '#1E40AF' },
    dark: { bg: '#1E3A8A', text: '#DBEAFE' },
  },
  green: {
    light: { bg: '#EBFCEF', text: '#065F46' },
    dark: { bg: '#064E3B', text: '#D1FAE5' },
  },
  orange: {
    light: { bg: '#FFEFD8', text: '#9A3412' },
    dark: { bg: '#7C2D12', text: '#FED7AA' },
  },
  purple: {
    light: { bg: '#F5EBFF', text: '#5B21B6' },
    dark: { bg: '#4C1D95', text: '#E9D5FF' },
  },
}

export function isPresetColor(color: string): color is PresetNoteColor {
  return (NOTE_COLORS as readonly string[]).includes(color)
}

/**
 * Decide se o texto fica escuro ou claro baseado em luminância do bg.
 * Usa coeficientes ITU-R BT.601 (perceptual). Threshold 0.55 calibrado
 * pra cores tipo papel onde light bg ainda quer texto escuro.
 */
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

/**
 * Resolve a paleta final pra renderização.
 *   - Cor preset → variante light ou dark
 *   - Cor custom (hex) → usa direto + getContrastText pro texto
 */
export function resolvePalette(
  color: string,
  isDark: boolean
): ColorPalette {
  if (isPresetColor(color)) {
    const p = COLOR_PALETTES[color]
    return isDark ? p.dark : p.light
  }
  return { bg: color, text: getContrastText(color) }
}
