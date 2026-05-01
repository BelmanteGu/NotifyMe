<script setup lang="ts">
/**
 * NotesCanvasView — fullscreen overlay transparente que renderiza
 * todas as notas como divs flutuantes.
 *
 * Mouse pass-through: a janela ignora clicks por padrão. Quando o cursor
 * entra em uma nota, chama `setMouseInteractive(true)` no Main pra
 * permitir clicks/drag. Sai → volta pra ignorar.
 *
 * Botão flutuante "Nova nota" no canto inferior direito.
 */

import { ref, onMounted } from 'vue'
import { Plus } from 'lucide-vue-next'
import StickyNote from '@/components/StickyNote.vue'
import { useNotes } from '@/composables/useNotes'
import type { NoteColor, NotePatch } from '@/types/note'
import { NOTE_COLORS } from '@/types/note'

const { notes, create, update, remove } = useNotes()

onMounted(() => {
  // Detecta tema do SO
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.classList.toggle('dark', prefersDark)
})

/**
 * Contador de hover. Múltiplas notas podem ter mouseenter rapidamente
 * (mouse passa de uma pra outra) — usar contador evita race condition
 * entre enter de uma e leave da outra.
 */
let hoverCount = 0

function handleNoteHover(hovering: boolean) {
  hoverCount = Math.max(0, hoverCount + (hovering ? 1 : -1))
  window.notifyme.notes.setMouseInteractive(hoverCount > 0)
}

function handleAddBtnEnter() {
  window.notifyme.notes.setMouseInteractive(true)
}
function handleAddBtnLeave() {
  if (hoverCount === 0) {
    window.notifyme.notes.setMouseInteractive(false)
  }
}

async function handleCreate() {
  // Cor aleatória pra variar visualmente
  const color: NoteColor =
    NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)]
  // Posição aleatória no centro-ish da tela com leve offset
  const x = Math.floor(window.innerWidth / 2 - 100 + (Math.random() - 0.5) * 200)
  const y = Math.floor(window.innerHeight / 2 - 100 + (Math.random() - 0.5) * 200)
  // Rotação base entre -3° e +3°
  const rotation = (Math.random() - 0.5) * 6

  await create({ text: '', x, y, color, rotation })
}

function handleUpdate(id: string, patch: NotePatch) {
  update(id, patch)
}

function handleDelete(id: string) {
  remove(id)
}
</script>

<template>
  <div class="notes-canvas">
    <StickyNote
      v-for="note in notes"
      :key="note.id"
      :note="note"
      @update="(patch) => handleUpdate(note.id, patch)"
      @delete="handleDelete"
      @hover="handleNoteHover"
    />

    <!-- Botão flutuante pra criar nova nota -->
    <button
      class="add-note-btn"
      @click="handleCreate"
      @mouseenter="handleAddBtnEnter"
      @mouseleave="handleAddBtnLeave"
      aria-label="Nova nota"
      title="Nova nota"
    >
      <Plus class="w-5 h-5" />
    </button>
  </div>
</template>

<style scoped>
.notes-canvas {
  position: fixed;
  inset: 0;
  /* Background totalmente transparente — só vemos as notas e o botão */
  background: transparent;
  pointer-events: none;
  /* Notas usam pointer-events:auto via setMouseInteractive no Main */
}

.add-note-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f97316, #ea580c);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 4px 12px rgba(249, 115, 22, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  pointer-events: auto;
  transition: transform 0.2s, box-shadow 0.2s;
  z-index: 100;
}

.add-note-btn:hover {
  transform: translateY(-2px);
  box-shadow:
    0 6px 16px rgba(249, 115, 22, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.add-note-btn:active {
  transform: translateY(0);
}
</style>
