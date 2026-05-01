<script setup lang="ts">
/**
 * NotesView — aba "Notas" da janela main.
 *
 * Header com título + botão "Nova nota". Body é um board (container
 * relative com position absolute pras notas). Scroll automático se
 * notas forem além da área visível.
 *
 * O board é provido via Vue inject pra que cada StickyNote calcule
 * coordenadas relativas a ele (não à viewport).
 */

import { ref, provide } from 'vue'
import { Plus, StickyNote as StickyNoteIcon } from 'lucide-vue-next'
import StickyNote from '@/components/StickyNote.vue'
import { useNotes } from '@/composables/useNotes'
import type { NoteColor, NotePatch } from '@/types/note'
import { NOTE_COLORS } from '@/types/note'

const { notes, create, update, remove } = useNotes()

const boardRef = ref<HTMLElement | null>(null)
provide('notesBoard', boardRef)

async function handleCreate() {
  const board = boardRef.value
  // Posição centralizada com leve offset aleatório
  const w = board?.clientWidth ?? 800
  const h = board?.clientHeight ?? 600
  const scrollLeft = board?.scrollLeft ?? 0
  const scrollTop = board?.scrollTop ?? 0

  const x = Math.floor(scrollLeft + w / 2 - 100 + (Math.random() - 0.5) * 200)
  const y = Math.floor(scrollTop + h / 2 - 100 + (Math.random() - 0.5) * 200)

  const color: NoteColor =
    NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)]
  const rotation = (Math.random() - 0.5) * 6 // -3° a +3°

  await create({ text: '', x: Math.max(0, x), y: Math.max(0, y), color, rotation })
}

function handleUpdate(id: string, patch: NotePatch) {
  update(id, patch)
}

function handleDelete(id: string) {
  remove(id)
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <header class="px-8 py-6 flex items-end justify-between gap-4 border-b border-border/40">
      <div>
        <h2 class="text-3xl font-bold font-heading tracking-tight">Notas</h2>
        <p class="text-muted-foreground text-sm mt-1">
          Post-its visuais com cor própria — arraste pra organizar como quiser.
        </p>
      </div>

      <button
        @click="handleCreate"
        class="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-sm text-primary-foreground font-semibold text-sm flex-shrink-0"
      >
        <Plus class="w-4 h-4" />
        Nova nota
      </button>
    </header>

    <!-- Board onde as notas vivem (position relative + overflow auto) -->
    <div
      ref="boardRef"
      class="notes-board flex-1 relative overflow-auto"
    >
      <!-- Empty state quando não tem notas -->
      <div
        v-if="notes.length === 0"
        class="absolute inset-0 flex items-center justify-center"
      >
        <div class="text-center max-w-md px-8">
          <div class="relative inline-flex mb-6">
            <div class="absolute inset-0 rounded-2xl bg-primary/20 blur-2xl"></div>
            <div
              class="relative w-20 h-20 rounded-2xl icon-badge text-primary-foreground flex items-center justify-center"
            >
              <StickyNoteIcon class="w-10 h-10" />
            </div>
          </div>
          <h3 class="text-2xl font-bold mb-2 tracking-tight">
            Nenhuma nota ainda
          </h3>
          <p class="text-muted-foreground leading-relaxed mb-6">
            Crie sua primeira nota e arraste ela pra qualquer lugar do quadro.
            Cada uma pode ter cor própria.
          </p>
          <button
            @click="handleCreate"
            class="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-sm text-primary-foreground font-semibold text-sm"
          >
            <Plus class="w-4 h-4" />
            Criar primeira nota
          </button>
        </div>
      </div>

      <!-- Notas -->
      <StickyNote
        v-for="note in notes"
        :key="note.id"
        :note="note"
        @update="(patch) => handleUpdate(note.id, patch)"
        @delete="handleDelete"
      />
    </div>
  </div>
</template>

<style scoped>
.notes-board {
  /* Padrão sutil de "papel" usando tinted background */
  background:
    radial-gradient(ellipse 80% 60% at 50% -10%, hsl(var(--primary) / 0.04), transparent 60%),
    hsl(var(--background));
  /* Espaço extra pra scroll: notas podem ir além da viewport */
  min-height: 100%;
}
</style>
