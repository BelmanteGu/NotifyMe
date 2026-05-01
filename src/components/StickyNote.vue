<script setup lang="ts">
/**
 * Sticky Note — renderizada dentro do board da NotesView.
 *
 * Coordenadas (`x`, `y`) são relativas ao board (container pai com
 * position:relative). Drag manual via mouse events com `getRelativeMouse`
 * baseado no `getBoundingClientRect()` do board (injetado via Vue inject).
 *
 * Cores: 6 predefinidas + 1 custom via input nativo type=color.
 * `palette` é reativo ao `useTheme().isDark` — toggle de tema atualiza
 * automaticamente.
 */

import { ref, computed, onBeforeUnmount, inject, type Ref } from 'vue'
import { X, Palette, Plus } from 'lucide-vue-next'
import type { Note, NoteColor, PresetNoteColor } from '@/types/note'
import {
  NOTE_COLORS,
  COLOR_PALETTES,
  resolvePalette,
  isPresetColor,
} from '@/types/note'
import { useTheme } from '@/composables/useTheme'

const props = defineProps<{
  note: Note
}>()

const emit = defineEmits<{
  update: [patch: { x?: number; y?: number; color?: NoteColor; text?: string }]
  delete: [id: string]
}>()

const { isDark } = useTheme()

/** Container pai (board da NotesView). */
const boardRef = inject<Ref<HTMLElement | null>>('notesBoard', ref(null))

const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })
const localPos = ref({ x: props.note.x, y: props.note.y })
const localText = ref(props.note.text)
const colorPickerOpen = ref(false)

/** Valor atual no input nativo de cor — preserva entre aberturas. */
const customColorValue = ref<string>(
  isPresetColor(props.note.color) ? '#F97316' : props.note.color
)

const palette = computed(() => resolvePalette(props.note.color, isDark.value))

function getRelativeMouse(event: MouseEvent): { x: number; y: number } | null {
  const board = boardRef.value
  if (!board) return null
  const rect = board.getBoundingClientRect()
  return {
    x: event.clientX - rect.left + board.scrollLeft,
    y: event.clientY - rect.top + board.scrollTop,
  }
}

function startDrag(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target.closest('.no-drag')) return
  if (target.tagName === 'TEXTAREA' && document.activeElement === target) return

  const mouse = getRelativeMouse(event)
  if (!mouse) return

  event.preventDefault()
  isDragging.value = true
  dragOffset.value = {
    x: mouse.x - localPos.value.x,
    y: mouse.y - localPos.value.y,
  }

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

function onDrag(event: MouseEvent) {
  if (!isDragging.value) return
  const mouse = getRelativeMouse(event)
  if (!mouse) return

  const x = Math.max(-160, mouse.x - dragOffset.value.x)
  const y = Math.max(0, mouse.y - dragOffset.value.y)
  localPos.value = { x, y }
}

function stopDrag() {
  if (!isDragging.value) return
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  emit('update', { x: localPos.value.x, y: localPos.value.y })
}

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})

let textTimeout: number | null = null
function onTextInput(event: Event) {
  const target = event.target as HTMLTextAreaElement
  localText.value = target.value
  if (textTimeout !== null) clearTimeout(textTimeout)
  textTimeout = window.setTimeout(() => {
    emit('update', { text: localText.value })
    textTimeout = null
  }, 400)
}

function onTextBlur() {
  if (textTimeout !== null) {
    clearTimeout(textTimeout)
    textTimeout = null
  }
  emit('update', { text: localText.value })
}

function selectPresetColor(color: PresetNoteColor) {
  emit('update', { color })
  colorPickerOpen.value = false
}

function onCustomColorPick(event: Event) {
  const value = (event.target as HTMLInputElement).value
  customColorValue.value = value
  emit('update', { color: value })
}

function onCustomColorChange(event: Event) {
  // Fecha o picker depois do user "confirmar" (close do input)
  onCustomColorPick(event)
  colorPickerOpen.value = false
}

function handleDelete() {
  emit('delete', props.note.id)
}

/** Preview de uma cor preset pro botão circular do picker. */
function presetPreview(color: PresetNoteColor): string {
  const p = COLOR_PALETTES[color]
  return isDark.value ? p.dark.bg : p.light.bg
}

const isCustomActive = computed(() => !isPresetColor(props.note.color))
</script>

<template>
  <div
    class="sticky-note"
    :class="{ 'is-dragging': isDragging }"
    :style="{
      left: `${localPos.x}px`,
      top: `${localPos.y}px`,
      '--rotation': `${note.rotation}deg`,
      '--bg': palette.bg,
      '--text': palette.text,
    }"
    @mousedown="startDrag"
  >
    <!-- Header com controles -->
    <div class="sticky-note-header">
      <div class="relative no-drag">
        <button
          @click.stop="colorPickerOpen = !colorPickerOpen"
          class="sticky-btn"
          aria-label="Mudar cor"
        >
          <Palette class="w-3 h-3" />
        </button>

        <!-- Color picker popover SÓLIDO -->
        <div
          v-if="colorPickerOpen"
          class="color-picker"
          @click.stop
        >
          <div class="color-picker-title">Cor da nota</div>
          <div class="color-picker-grid">
            <button
              v-for="color in NOTE_COLORS"
              :key="color"
              @click.stop="selectPresetColor(color)"
              class="color-swatch"
              :class="{ selected: note.color === color }"
              :style="{ background: presetPreview(color) }"
              :aria-label="`Cor ${color}`"
              :title="color"
            />

            <!-- Custom color via input nativo -->
            <label
              class="color-swatch custom-swatch"
              :class="{ selected: isCustomActive }"
              :style="{
                background: isCustomActive ? note.color : 'transparent',
              }"
              :title="isCustomActive ? note.color : 'Escolher cor personalizada'"
            >
              <Plus
                v-if="!isCustomActive"
                class="w-4 h-4 text-muted-foreground"
              />
              <input
                type="color"
                :value="customColorValue"
                @input="onCustomColorPick"
                @change="onCustomColorChange"
                class="sr-only"
                aria-label="Cor personalizada"
              />
            </label>
          </div>
          <div v-if="isCustomActive" class="color-picker-hex">
            {{ note.color }}
          </div>
        </div>
      </div>

      <button
        @click.stop="handleDelete"
        class="sticky-btn no-drag"
        aria-label="Deletar"
      >
        <X class="w-3 h-3" />
      </button>
    </div>

    <!-- Textarea editável -->
    <textarea
      :value="localText"
      @input="onTextInput"
      @blur="onTextBlur"
      class="sticky-note-text no-drag"
      placeholder="Digite aqui…"
      spellcheck="false"
    />
  </div>
</template>

<style scoped>
.sticky-note {
  position: absolute;
  width: 200px;
  height: 200px;
  background: var(--bg);
  color: var(--text);
  border-radius: 4px;
  padding: 8px 10px 10px;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.1),
    0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: move;
  user-select: none;
  display: flex;
  flex-direction: column;
  /* Bouncy easing — quando para de arrastar, faz settle natural */
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.2s ease-out, background 0.2s ease, color 0.2s ease;
  transform: rotate(var(--rotation, 0deg));
  transform-origin: top center;
  will-change: transform;
}

.sticky-note.is-dragging {
  transform: rotate(calc(var(--rotation, 0deg) + 2deg)) scale(1.04);
  box-shadow:
    0 4px 8px rgba(0, 0, 0, 0.18),
    0 16px 32px rgba(0, 0, 0, 0.22);
  transition: none;
  z-index: 10;
}

.sticky-note-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  opacity: 0.45;
  transition: opacity 0.2s;
}

.sticky-note:hover .sticky-note-header {
  opacity: 0.85;
}

.sticky-btn {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  color: var(--text);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.15s;
}

.sticky-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}

.sticky-note-text {
  flex: 1;
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text);
  cursor: text;
}

.sticky-note-text::placeholder {
  color: var(--text);
  opacity: 0.4;
}

.sticky-note-text::selection {
  background: rgba(0, 0, 0, 0.2);
}

/* ─── Color picker popover ─────────────────────────────── */
.color-picker {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 8px;
  padding: 14px;
  background: hsl(var(--popover));
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  box-shadow:
    0 14px 36px -10px rgba(0, 0, 0, 0.28),
    0 6px 14px -4px rgba(0, 0, 0, 0.12);
  z-index: 30;
  /* Cor do TEXTO do popover usa o tema do app, não o text da nota */
  color: hsl(var(--foreground));
}

:global(.dark) .color-picker {
  box-shadow:
    0 14px 36px -10px rgba(0, 0, 0, 0.7),
    0 6px 14px -4px rgba(0, 0, 0, 0.5);
}

.color-picker-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: hsl(var(--muted-foreground));
  margin-bottom: 10px;
  white-space: nowrap;
}

.color-picker-grid {
  display: grid;
  grid-template-columns: repeat(4, 32px);
  gap: 10px;
}

.color-picker-hex {
  margin-top: 10px;
  padding: 6px 8px;
  background: hsl(var(--muted));
  border-radius: 6px;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  font-weight: 600;
  color: hsl(var(--muted-foreground));
  text-align: center;
  text-transform: uppercase;
}

.color-swatch {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid hsl(var(--border));
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
  position: relative;
}

.color-swatch:hover {
  transform: scale(1.1);
  border-color: hsl(var(--muted-foreground) / 0.4);
}

.color-swatch.selected {
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 3px hsl(var(--primary) / 0.2);
}

.custom-swatch {
  background: transparent;
  border: 2px dashed hsl(var(--border));
}

.custom-swatch:hover {
  border-color: hsl(var(--primary));
  border-style: solid;
}

.custom-swatch.selected {
  border-style: solid;
}

/* sr-only pra esconder o input nativo de color sem afetar funcionalidade */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
