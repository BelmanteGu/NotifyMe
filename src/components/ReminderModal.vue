<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { X } from 'lucide-vue-next'
import type { ReminderInput, Recurrence } from '@/types/reminder'
import { combineDateTime, isoToDateInput, isoToTimeInput } from '@/utils/formatDate'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  save: [reminder: ReminderInput]
}>()

const title = ref('')
const description = ref('')
const date = ref('')
const time = ref('')
const recurrence = ref<Recurrence>('once')

const titleInput = ref<HTMLInputElement | null>(null)

function resetForm() {
  const now = new Date()
  now.setMinutes(now.getMinutes() + 30)
  const isoNow = now.toISOString()
  title.value = ''
  description.value = ''
  date.value = isoToDateInput(isoNow)
  time.value = isoToTimeInput(isoNow)
  recurrence.value = 'once'
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      resetForm()
      await nextTick()
      titleInput.value?.focus()
    }
  }
)

function close() {
  emit('update:open', false)
}

function submit() {
  if (!title.value.trim()) return
  emit('save', {
    title: title.value.trim(),
    description: description.value.trim() || undefined,
    triggerAt: combineDateTime(date.value, time.value),
    recurrence: recurrence.value,
  })
  close()
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
      @click.self="close"
    >
      <div
        class="w-full max-w-md rounded-xl glass-strong shadow-soft overflow-hidden"
        role="dialog"
        aria-labelledby="modal-title"
      >
        <header class="flex items-center justify-between px-6 py-5 border-b border-border/40">
          <div>
            <h2 id="modal-title" class="text-lg font-bold tracking-tight">Novo lembrete</h2>
            <p class="text-xs text-muted-foreground mt-0.5">
              Vai aparecer no horário escolhido — e não some até você confirmar.
            </p>
          </div>
          <button
            @click="close"
            class="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground transition"
            aria-label="Fechar"
          >
            <X class="w-4 h-4" />
          </button>
        </header>

        <form @submit.prevent="submit" class="px-6 py-5 space-y-4">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2" for="title">
              Título <span class="text-destructive">*</span>
            </label>
            <input
              id="title"
              ref="titleInput"
              v-model="title"
              type="text"
              required
              maxlength="120"
              placeholder="Ex: Pagar guia do MEI"
              class="w-full px-4 py-3 rounded-md bg-input text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2" for="description">
              Descrição
            </label>
            <textarea
              id="description"
              v-model="description"
              rows="2"
              maxlength="500"
              placeholder="Detalhes opcionais"
              class="w-full px-4 py-3 rounded-md bg-input text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary resize-none transition"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2" for="date">
                Data
              </label>
              <input
                id="date"
                v-model="date"
                type="date"
                required
                class="w-full px-4 py-3 rounded-md bg-input text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2" for="time">
                Hora
              </label>
              <input
                id="time"
                v-model="time"
                type="time"
                required
                class="w-full px-4 py-3 rounded-md bg-input text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2" for="recurrence">
              Repetir
            </label>
            <select
              id="recurrence"
              v-model="recurrence"
              class="w-full px-4 py-3 rounded-md bg-input text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition"
            >
              <option value="once">Uma vez</option>
              <option value="daily">Todo dia</option>
              <option value="weekly">Toda semana</option>
            </select>
          </div>

          <footer class="flex justify-end gap-2 pt-3">
            <button
              type="button"
              @click="close"
              class="px-5 py-2.5 rounded-xl border border-border bg-card hover:bg-muted transition text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="btn-primary px-5 py-2.5 rounded-xl text-primary-foreground text-sm font-semibold"
            >
              Criar lembrete
            </button>
          </footer>
        </form>
      </div>
    </div>
  </Teleport>
</template>
