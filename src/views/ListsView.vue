<script setup lang="ts">
/**
 * ListsView — aba "Listas" estilo caderno.
 *
 * Cada lista é uma "página" com data, título e itens checáveis.
 * Navegação esquerda/direita pra ver páginas anteriores/próximas.
 * Suporta criar nova página, deletar atual, e import/export .md.
 *
 * Visual da página: papel pautado com margem vermelha (caderno).
 */

import { ref, computed, watch, nextTick } from 'vue'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  X,
  Download,
  Upload,
  ListChecks,
  Trash2,
} from 'lucide-vue-next'
import { useLists } from '@/composables/useLists'
import { useConfirm } from '@/composables/useConfirm'
import type { TaskList, TaskItem } from '@/types/list'

const {
  lists,
  loading,
  create,
  update,
  remove,
  addItem,
  toggleItem,
  updateItem,
  removeItem,
  exportMd,
  importMd,
} = useLists()
const { confirm } = useConfirm()

const currentIndex = ref(0)
const currentList = computed<TaskList | null>(
  () => lists.value[currentIndex.value] ?? null
)

const newItemText = ref('')
const newItemInput = ref<HTMLInputElement | null>(null)

// Mantém o currentIndex válido ao adicionar/remover listas
watch(
  () => lists.value.length,
  (count) => {
    if (count === 0) {
      currentIndex.value = 0
      return
    }
    if (currentIndex.value >= count) {
      currentIndex.value = count - 1
    }
  }
)

// ─── Navegação ──────────────────────────────────────────────
function goPrev() {
  if (currentIndex.value < lists.value.length - 1) {
    currentIndex.value++
  }
}

function goNext() {
  if (currentIndex.value > 0) {
    currentIndex.value--
  }
}

const canGoPrev = computed(() => currentIndex.value < lists.value.length - 1)
const canGoNext = computed(() => currentIndex.value > 0)

// ─── Criar nova página ──────────────────────────────────────
function todayISO(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

async function handleNewPage() {
  await create({
    title: 'Nova lista',
    date: todayISO(),
  })
  // Vai pra primeira posição (mais recente)
  currentIndex.value = 0
}

// ─── Editar título e data ───────────────────────────────────
function handleTitleChange(event: Event) {
  if (!currentList.value) return
  const target = event.target as HTMLInputElement
  update(currentList.value.id, { title: target.value })
}

function handleDateChange(event: Event) {
  if (!currentList.value) return
  const target = event.target as HTMLInputElement
  update(currentList.value.id, { date: target.value })
}

// ─── Itens ──────────────────────────────────────────────────
async function handleAddItem() {
  if (!currentList.value) return
  const text = newItemText.value.trim()
  if (!text) return
  await addItem(currentList.value.id, text)
  newItemText.value = ''
  await nextTick()
  newItemInput.value?.focus()
}

function handleToggle(item: TaskItem) {
  if (!currentList.value) return
  toggleItem(currentList.value.id, item.id)
}

function handleItemTextChange(item: TaskItem, event: Event) {
  if (!currentList.value) return
  const target = event.target as HTMLInputElement
  updateItem(currentList.value.id, item.id, target.value)
}

function handleRemoveItem(item: TaskItem) {
  if (!currentList.value) return
  removeItem(currentList.value.id, item.id)
}

// ─── Apagar a lista atual ───────────────────────────────────
async function handleDeleteList() {
  if (!currentList.value) return
  const ok = await confirm({
    message: `Apagar a lista "${currentList.value.title}"?`,
    detail: 'Esta ação não pode ser desfeita.',
    confirmText: 'Apagar',
    cancelText: 'Cancelar',
    destructive: true,
  })
  if (!ok) return
  await remove(currentList.value.id)
}

// ─── Import/Export .md ──────────────────────────────────────
async function handleExport() {
  if (!currentList.value) return
  const result = await exportMd(currentList.value.id)
  if (result.success) {
    console.log('[lists] exported to', result.path)
  } else if (result.reason !== 'canceled') {
    await confirm({
      message: 'Não foi possível exportar',
      detail: result.message ?? 'Erro desconhecido.',
      confirmText: 'OK',
      cancelText: '',
    })
  }
}

async function handleImport() {
  const result = await importMd()
  if (result.success && result.list) {
    // Foca na lista importada
    await nextTick()
    const idx = lists.value.findIndex((l) => l.id === result.list?.id)
    if (idx >= 0) currentIndex.value = idx
  } else if (result.reason !== 'canceled') {
    await confirm({
      message: 'Não foi possível importar',
      detail: result.message ?? 'Erro desconhecido.',
      confirmText: 'OK',
      cancelText: '',
    })
  }
}

// ─── Display da data BR ─────────────────────────────────────
function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <header
      class="px-8 py-6 flex items-end justify-between gap-4 border-b border-border/40 flex-shrink-0"
    >
      <div>
        <h2 class="text-3xl font-bold font-heading tracking-tight">Listas</h2>
        <p class="text-muted-foreground text-sm mt-1">
          Lista de mercado, tarefas, qualquer checklist. Cada lista é uma página.
        </p>
      </div>

      <div class="flex items-center gap-2 flex-shrink-0">
        <button
          @click="handleImport"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm border border-border bg-card hover:bg-muted transition text-sm font-medium"
          title="Importar .md"
        >
          <Upload class="w-4 h-4" />
          Importar
        </button>
        <button
          @click="handleNewPage"
          class="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-sm text-primary-foreground font-semibold text-sm"
        >
          <Plus class="w-4 h-4" />
          Nova página
        </button>
      </div>
    </header>

    <!-- Body -->
    <div class="flex-1 overflow-y-auto scroll-overlay px-8 py-6">
      <!-- Loading -->
      <div v-if="loading" class="text-center text-muted-foreground py-16">
        Carregando…
      </div>

      <!-- Empty state -->
      <div
        v-else-if="lists.length === 0"
        class="flex items-center justify-center min-h-[60vh]"
      >
        <div class="text-center max-w-md">
          <div class="relative inline-flex mb-6">
            <div class="absolute inset-0 rounded-2xl bg-primary/20 blur-2xl"></div>
            <div
              class="relative w-20 h-20 rounded-2xl icon-badge text-primary-foreground flex items-center justify-center"
            >
              <ListChecks class="w-10 h-10" />
            </div>
          </div>
          <h3 class="text-2xl font-bold mb-2 tracking-tight">
            Sem listas ainda
          </h3>
          <p class="text-muted-foreground leading-relaxed mb-6">
            Crie uma lista pra organizar suas tarefas, compras ou qualquer
            checklist do dia. Pode importar uma lista existente em
            <code class="text-primary font-mono text-xs">.md</code>.
          </p>
          <div class="flex gap-2 justify-center">
            <button
              @click="handleNewPage"
              class="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-sm text-primary-foreground font-semibold text-sm"
            >
              <Plus class="w-4 h-4" />
              Nova página
            </button>
            <button
              @click="handleImport"
              class="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm border border-border bg-card hover:bg-muted transition font-medium text-sm"
            >
              <Upload class="w-4 h-4" />
              Importar .md
            </button>
          </div>
        </div>
      </div>

      <!-- Página atual -->
      <div v-else-if="currentList" class="max-w-2xl mx-auto">
        <!-- Navegação entre páginas -->
        <div class="flex items-center justify-between mb-4 text-sm">
          <button
            @click="goPrev"
            :disabled="!canGoPrev"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <ChevronLeft class="w-4 h-4" />
            Anterior
          </button>

          <div class="text-xs text-muted-foreground tabular-nums">
            Página
            <span class="font-semibold text-foreground">
              {{ currentIndex + 1 }}
            </span>
            de
            <span class="font-semibold text-foreground">
              {{ lists.length }}
            </span>
          </div>

          <button
            @click="goNext"
            :disabled="!canGoNext"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            Próxima
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>

        <!-- Página de papel pautado -->
        <article class="task-list-page">
          <header class="page-header">
            <input
              :value="currentList.title"
              @input="handleTitleChange"
              class="page-title-input"
              placeholder="Título da lista"
              maxlength="120"
            />
            <input
              :value="currentList.date"
              @input="handleDateChange"
              type="date"
              class="page-date-input"
            />
          </header>

          <ul class="task-items">
            <li
              v-for="item in currentList.items"
              :key="item.id"
              class="task-item"
            >
              <button
                @click="handleToggle(item)"
                class="task-checkbox"
                :class="{ done: item.done }"
                :aria-label="item.done ? 'Desmarcar' : 'Marcar como feito'"
              >
                <Check v-if="item.done" class="w-3 h-3" />
              </button>
              <input
                :value="item.text"
                @input="handleItemTextChange(item, $event)"
                class="task-text"
                :class="{ done: item.done }"
                placeholder="Descrição do item"
              />
              <button
                @click="handleRemoveItem(item)"
                class="task-remove"
                aria-label="Remover item"
              >
                <X class="w-3 h-3" />
              </button>
            </li>

            <!-- Adicionar novo item -->
            <li class="task-item add-item">
              <span class="task-checkbox add-placeholder">
                <Plus class="w-3 h-3" />
              </span>
              <input
                ref="newItemInput"
                v-model="newItemText"
                @keydown.enter="handleAddItem"
                class="task-text"
                placeholder="Adicionar item — Enter pra confirmar"
              />
            </li>
          </ul>
        </article>

        <!-- Footer ações da página -->
        <div class="flex items-center justify-between mt-4">
          <div class="text-xs text-muted-foreground">
            {{ formatDateBR(currentList.date) }} ·
            {{ currentList.items.length }}
            {{ currentList.items.length === 1 ? 'item' : 'itens' }} ·
            {{ currentList.items.filter((i) => i.done).length }} concluídos
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="handleExport"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
              title="Exportar como .md"
            >
              <Download class="w-3.5 h-3.5" />
              Exportar
            </button>
            <button
              @click="handleDeleteList"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
            >
              <Trash2 class="w-3.5 h-3.5" />
              Apagar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * Página de caderno: papel pautado + margem vermelha lateral.
 * Linhas a cada 32px (line-height do texto), começando depois do header.
 */
.task-list-page {
  position: relative;
  background: #fffef7;
  border-radius: 12px;
  padding: 28px 32px 32px 76px;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.05),
    0 6px 18px rgba(0, 0, 0, 0.08);
  background-image: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent 31px,
    rgba(99, 132, 168, 0.18) 31px,
    rgba(99, 132, 168, 0.18) 32px
  );
  background-position: 0 96px; /* começa após o header (~96px) */
  background-size: 100% 32px;
}

:global(.dark) .task-list-page {
  background: #1a1a1c;
  background-image: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent 31px,
    rgba(138, 161, 199, 0.12) 31px,
    rgba(138, 161, 199, 0.12) 32px
  );
  background-position: 0 96px;
  background-size: 100% 32px;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.4),
    0 6px 18px rgba(0, 0, 0, 0.5);
}

/* Margem vermelha vertical (linha lateral) */
.task-list-page::before {
  content: '';
  position: absolute;
  left: 56px;
  top: 0;
  bottom: 0;
  width: 1.5px;
  background: rgba(239, 68, 68, 0.45);
}

:global(.dark) .task-list-page::before {
  background: rgba(252, 165, 165, 0.32);
}

.page-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px dashed rgba(99, 132, 168, 0.25);
}

:global(.dark) .page-header {
  border-bottom-color: rgba(138, 161, 199, 0.25);
}

.page-title-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: 'Outfit', 'Inter', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: #1f2937;
  letter-spacing: -0.01em;
}

:global(.dark) .page-title-input {
  color: #ECECED;
}

.page-title-input::placeholder {
  color: rgba(31, 41, 55, 0.35);
}

:global(.dark) .page-title-input::placeholder {
  color: rgba(236, 236, 237, 0.3);
}

.page-date-input {
  background: transparent;
  border: none;
  outline: none;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  font-weight: 600;
  color: rgba(31, 41, 55, 0.55);
  cursor: pointer;
  /* Esconde o ícone do calendário do input nativo */
  color-scheme: light;
}

:global(.dark) .page-date-input {
  color: rgba(236, 236, 237, 0.6);
  color-scheme: dark;
}

.task-items {
  list-style: none;
  padding: 0;
  margin: 0;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 32px;
  position: relative;
}

.task-checkbox {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1.5px solid rgba(99, 132, 168, 0.55);
  background: transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: all 0.15s;
  padding: 0;
}

:global(.dark) .task-checkbox {
  border-color: rgba(138, 161, 199, 0.55);
}

.task-checkbox:hover {
  border-color: hsl(var(--primary));
}

.task-checkbox.done {
  background: hsl(var(--primary));
  border-color: hsl(var(--primary));
}

.task-checkbox.add-placeholder {
  border-style: dashed;
  color: rgba(99, 132, 168, 0.7);
  cursor: default;
}

:global(.dark) .task-checkbox.add-placeholder {
  color: rgba(138, 161, 199, 0.6);
}

.task-text {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 14px;
  line-height: 32px;
  color: #1f2937;
  height: 32px;
  padding: 0;
}

:global(.dark) .task-text {
  color: #ECECED;
}

.task-text::placeholder {
  color: rgba(31, 41, 55, 0.4);
}

:global(.dark) .task-text::placeholder {
  color: rgba(236, 236, 237, 0.35);
}

.task-text.done {
  text-decoration: line-through;
  color: rgba(31, 41, 55, 0.5);
}

:global(.dark) .task-text.done {
  color: rgba(236, 236, 237, 0.4);
}

.task-remove {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: rgba(31, 41, 55, 0.35);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s, color 0.15s, background 0.15s;
}

:global(.dark) .task-remove {
  color: rgba(236, 236, 237, 0.35);
}

.task-item:hover .task-remove {
  opacity: 1;
}

.task-remove:hover {
  color: hsl(var(--destructive));
  background: hsl(var(--destructive) / 0.1);
}
</style>
