/**
 * Tipos das notas adesivas (sticky notes).
 *
 * Notas são post-its visuais espalhados na tela via uma canvas window
 * transparente always-on-top. Cada nota tem posição (x, y), cor,
 * texto e uma rotação base aleatória pra parecer "natural"
 * (espalhadas como papéis reais, não alinhadas).
 */

export const NOTE_COLORS = [
  'yellow',
  'pink',
  'blue',
  'green',
  'orange',
  'purple',
] as const

export type NoteColor = (typeof NOTE_COLORS)[number]

export interface Note {
  id: string
  text: string
  /** Posição absoluta na tela. */
  x: number
  y: number
  color: NoteColor
  /** Rotação inicial -3° a +3° pra parecer espalhado (random na criação). */
  rotation: number
  createdAt: string
  updatedAt: string
}

export type NoteInput = Pick<Note, 'text' | 'x' | 'y' | 'color' | 'rotation'>

/** Patch parcial — usado pelo update. */
export type NotePatch = Partial<Pick<Note, 'text' | 'x' | 'y' | 'color'>>

/**
 * Mapa de cores no tema light/dark.
 * Cada cor tem `bg` (fundo do post-it) e `text` (cor do texto).
 * Pastel claro pra parecer papel real.
 */
export interface ColorPalette {
  bg: string
  text: string
}

export const COLOR_PALETTES: Record<NoteColor, { light: ColorPalette; dark: ColorPalette }> = {
  yellow: {
    light: { bg: '#FFFAE0', text: '#854D0E' }, // amarelo bem claro tipo papel
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
