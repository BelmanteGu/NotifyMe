<script setup lang="ts">
/**
 * Sticky Note flutuante — usado dentro da NotesCanvasView.
 *
 * Comportamento:
 *   - Drag por toda a área (exceto textarea quando focado)
 *   - Rotação aplicada via CSS transform com transition suave
 *   - Durante drag: scale-up sutil + sombra mais forte (efeito "pegando")
 *   - Drop: transition cubic-bezier bouncy = balanço natural ao parar
 *   - Color picker no header (popover com 6 círculos)
 *   - Botão X pra deletar
 */

import { ref, computed, onBeforeUnmount } from 'vue'
import { X, Palette } from 'lucide-vue-next'
import type { Note, NoteColor } from '@/types/note'
import { NOTE_COLORS, COLOR_PALETTES } from '@/types/note'

const props = defineProps<{
  note: Note
}>()

const emit = defineEmits<{
  update: [patch: { x?: number; y?: number; color?: NoteColor; text?: string }]
  delete: [id: string]
  /** Notifica o pai pra ele dizer ao Main pra fazer setIgnoreMouseEvents(false). */
  hover: [hovering: boolean]
}>()

const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })
const localPos = ref({ x: props.note.x, y: props.note.y })
const localText = ref(props.note.text)
const colorPickerOpen = ref(false)

const isDarkMode = computed(() =>
  document.documentElement.classList.contains('dark')
)

const palette = computed(() => {
  const colors = COLOR_PALETTES[props.note.color]
  return isDarkMode.value ? colors.dark : colors.light
})

function startDrag(event: MouseEvent) {
  // Não dragueia se clicou em controles
  const target = event.target as HTMLElement
  if (target.closest('.no-drag')) return
  if (target.tagName === 'TEXTAREA' && document.activeElement === target) return

  event.preventDefault()
  isDragging.value = true
  dragOffset.value = {
    x: event.clientX - localPos.value.x,
    y: event.clientY - localPos.value.y,
  }

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

function onDrag(event: MouseEvent) {
  if (!isDragging.value) return
  localPos.value = {
    x: event.clientX - dragOffset.value.x,
    y: event.clientY - dragOffset.value.y,
  }
}

function stopDrag() {
  if (!isDragging.value) return
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  // Persiste posição final
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
  // Debounce de 400ms pra evitar IPC excessivo durante digitação
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

function selectColor(color: NoteColor) {
  emit('update', { color })
  colorPickerOpen.value = false
}

function handleDelete() {
  emit('delete', props.note.id)
}

function colorPreview(color: NoteColor): string {
  const p = COLOR_PALETTES[color]
  return isDarkMode.value ? p.dark.bg : p.light.bg
}
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
    @mouseenter="emit('hover', true)"
    @mouseleave="emit('hover', false)"
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
        <div
          v-if="colorPickerOpen"
          class="absolute top-full left-0 mt-1 flex gap-1 p-1.5 rounded bg-black/20 backdrop-blur-sm shadow-lg z-10"
        >
          <button
            v-for="color in NOTE_COLORS"
            :key="color"
            @click.stop="selectColor(color)"
            class="w-5 h-5 rounded-full border border-black/10 hover:scale-110 transition-transform"
            :style="{ background: colorPreview(color) }"
            :aria-label="`Cor ${color}`"
          />
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
    box-shadow 0.2s ease-out;
  transform: rotate(var(--rotation, 0deg));
  transform-origin: top center;
  /* Otimização: GPU layer pra animação suave */
  will-change: transform;
}

.sticky-note.is-dragging {
  /* Durante drag: scale-up sutil + sombra mais marcante (efeito "elevado") */
  transform: rotate(calc(var(--rotation, 0deg) + 2deg)) scale(1.04);
  box-shadow:
    0 4px 8px rgba(0, 0, 0, 0.18),
    0 16px 32px rgba(0, 0, 0, 0.22);
  transition: none; /* sem transition durante drag pra responder na hora */
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
</style>
