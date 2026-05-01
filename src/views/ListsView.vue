<script setup lang="ts">
/**
 * ListsView — aba "Listas" estilo caderno.
 *
 * Cada lista é uma "página" com data, título e itens checáveis.
 * Visual de papel pautado SEMPRE claro (não respeita dark mode da app —
 * caderno é caderno).
 *
 * Edição com debounce (400ms) — evita piscar e IPC excessivo durante
 * digitação. Refs locais (`localTitle`, `localItemDrafts`) seguram o
 * estado da UI; sync com Main acontece após pause na digitação.
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
  Image as ImageIcon,
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
  exportImage,
  importMd,
} = useLists()
const { confirm } = useConfirm()

const currentIndex = ref(0)
const currentList = computed<TaskList | null>(
  () => lists.value[currentIndex.value] ?? null
)

const newItemText = ref('')
const newItemInput = ref<HTMLInputElement | null>(null)
const pageRef = ref<HTMLElement | null>(null)

// ─── Drafts locais com debounce ────────────────────────────
const localTitle = ref('')
const localDate = ref('')
const localItemDrafts = ref<Record<string, string>>({})

let titleTimer: number | null = null
let dateTimer: number | null = null
const itemTimers = new Map<string, number>()

/** Sincroniza drafts quando muda de página (id diferente) ou lista
 * é atualizada por fora (import, etc). Não sobrescreve drafts em
 * digitação ativa pra não pular cursor. */
watch(
  () => currentList.value?.id,
  () => {
    if (!currentList.value) {
      localTitle.value = ''
      localDate.value = ''
      localItemDrafts.value = {}
      return
    }
    localTitle.value = currentList.value.title
    localDate.value = currentList.value.date
    const map: Record<string, string> = {}
    for (const item of currentList.value.items) {
      map[item.id] = item.text
    }
    localItemDrafts.value = map
  },
  { immediate: true }
)

function getItemText(item: TaskItem): string {
  return localItemDrafts.value[item.id] ?? item.text
}

function onTitleInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  localTitle.value = value
  if (titleTimer !== null) clearTimeout(titleTimer)
  titleTimer = window.setTimeout(() => {
    if (currentList.value && value !== currentList.value.title) {
      update(currentList.value.id, { title: value })
    }
    titleTimer = null
  }, 400)
}

function onDateChange(event: Event) {
  const value = (event.target as HTMLInputElement).value
  localDate.value = value
  if (dateTimer !== null) clearTimeout(dateTimer)
  dateTimer = window.setTimeout(() => {
    if (currentList.value && value !== currentList.value.date) {
      update(currentList.value.id, { date: value })
    }
    dateTimer = null
  }, 200)
}

function onItemTextInput(item: TaskItem, event: Event) {
  const value = (event.target as HTMLInputElement).value
  localItemDrafts.value = { ...localItemDrafts.value, [item.id]: value }
  const existing = itemTimers.get(item.id)
  if (existing !== undefined) clearTimeout(existing)
  const timer = window.setTimeout(() => {
    if (currentList.value && value !== item.text) {
      updateItem(currentList.value.id, item.id, value)
    }
    itemTimers.delete(item.id)
  }, 400)
  itemTimers.set(item.id, timer)
}

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
  if (currentIndex.value < lists.value.length - 1) currentIndex.value++
}
function goNext() {
  if (currentIndex.value > 0) currentIndex.value--
}
const canGoPrev = computed(() => currentIndex.value < lists.value.length - 1)
const canGoNext = computed(() => currentIndex.value > 0)

// ─── Criar nova página ──────────────────────────────────────
function todayISO(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

async function handleNewPage() {
  await create({ title: 'Nova lista', date: todayISO() })
  currentIndex.value = 0
}

// ─── Items ──────────────────────────────────────────────────
async function handleAddItem() {
  if (!currentList.value) return
  const text = newItemText.value.trim()
  if (!text) return

  // Otimista: limpa antes do await pra UX responsivo. User pode
  // continuar digitando o próximo item enquanto o IPC roda.
  newItemText.value = ''

  await addItem(currentList.value.id, text)

  // Garante foco continuado no input pra adicionar mais
  await nextTick()
  newItemInput.value?.focus()
}

function handleToggle(item: TaskItem) {
  if (!currentList.value) return
  toggleItem(currentList.value.id, item.id)
}

function handleRemoveItem(item: TaskItem) {
  if (!currentList.value) return
  // Limpa draft local antes de remover
  const next = { ...localItemDrafts.value }
  delete next[item.id]
  localItemDrafts.value = next
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

// ─── Import/Export ──────────────────────────────────────────
async function handleExportMd() {
  if (!currentList.value) return
  const result = await exportMd(currentList.value.id)
  if (!result.success && result.reason !== 'canceled') {
    await confirm({
      message: 'Não foi possível exportar',
      detail: result.message ?? 'Erro desconhecido.',
      confirmText: 'OK',
      cancelText: '',
    })
  }
}

async function handleExportImage() {
  if (!currentList.value || !pageRef.value) return
  const rect = pageRef.value.getBoundingClientRect()
  const result = await exportImage(currentList.value.id, {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
  })
  if (!result.success && result.reason !== 'canceled') {
    await confirm({
      message: 'Não foi possível exportar imagem',
      detail: result.message ?? 'Erro desconhecido.',
      confirmText: 'OK',
      cancelText: '',
    })
  }
}

async function handleImport() {
  const result = await importMd()
  if (result.success && result.list) {
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
      <div v-if="loading" class="text-center text-muted-foreground py-16">
        Carregando…
      </div>

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
            checklist do dia.
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

        <!-- Página de papel pautado (sempre clara, sem dark mode) -->
        <article ref="pageRef" class="task-list-page">
          <header class="page-header">
            <input
              :value="localTitle"
              @input="onTitleInput"
              class="page-title-input"
              placeholder="Título da lista"
              maxlength="120"
            />
            <input
              :value="localDate"
              @input="onDateChange"
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
                :value="getItemText(item)"
                @input="(e) => onItemTextInput(item, e)"
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
        <div class="flex items-center justify-between mt-4 flex-wrap gap-2">
          <div class="text-xs text-muted-foreground">
            {{ formatDateBR(currentList.date) }} ·
            {{ currentList.items.length }}
            {{ currentList.items.length === 1 ? 'item' : 'itens' }} ·
            {{ currentList.items.filter((i) => i.done).length }} concluídos
          </div>

          <div class="flex items-center gap-1">
            <button
              @click="handleExportMd"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
              title="Exportar como Markdown (.md)"
            >
              <Download class="w-3.5 h-3.5" />
              .md
            </button>
            <button
              @click="handleExportImage"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
              title="Exportar como imagem (.png)"
            >
              <ImageIcon class="w-3.5 h-3.5" />
              Imagem
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
 * Página de caderno SEMPRE clara. Independe do tema do app.
 * Caderno é caderno — papel é papel.
 */
.task-list-page {
  position: relative;
  background: #fffef7;
  color: #1f2937;
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
  background-position: 0 96px;
  background-size: 100% 32px;
}

/* Margem vermelha vertical */
.task-list-page::before {
  content: '';
  position: absolute;
  left: 56px;
  top: 0;
  bottom: 0;
  width: 1.5px;
  background: rgba(239, 68, 68, 0.45);
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

.page-title-input::placeholder {
  color: rgba(31, 41, 55, 0.35);
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
  color-scheme: light;
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

.task-text::placeholder {
  color: rgba(31, 41, 55, 0.4);
}

.task-text.done {
  text-decoration: line-through;
  color: rgba(31, 41, 55, 0.5);
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

.task-item:hover .task-remove {
  opacity: 1;
}

.task-remove:hover {
  color: hsl(var(--destructive));
  background: hsl(var(--destructive) / 0.1);
}
</style>
