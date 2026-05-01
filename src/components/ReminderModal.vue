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
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      @click.self="close"
    >
      <div
        class="w-full max-w-md rounded-lg border border-border bg-card shadow-2xl"
        role="dialog"
        aria-labelledby="modal-title"
      >
        <header class="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 id="modal-title" class="text-lg font-bold">Novo lembrete</h2>
          <button
            @click="close"
            class="p-1 rounded hover:bg-muted text-muted-foreground transition"
            aria-label="Fechar"
          >
            <X class="w-5 h-5" />
          </button>
        </header>

        <form @submit.prevent="submit" class="px-6 py-5 space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1.5" for="title">
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
              class="w-full px-3 py-2 rounded-md bg-input text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5" for="description">
              Descrição
            </label>
            <textarea
              id="description"
              v-model="description"
              rows="2"
              maxlength="500"
              placeholder="Detalhes opcionais"
              class="w-full px-3 py-2 rounded-md bg-input text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium mb-1.5" for="date">
                Data
              </label>
              <input
                id="date"
                v-model="date"
                type="date"
                required
                class="w-full px-3 py-2 rounded-md bg-input text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5" for="time">
                Hora
              </label>
              <input
                id="time"
                v-model="time"
                type="time"
                required
                class="w-full px-3 py-2 rounded-md bg-input text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5" for="recurrence">
              Repetir
            </label>
            <select
              id="recurrence"
              v-model="recurrence"
              class="w-full px-3 py-2 rounded-md bg-input text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="once">Uma vez</option>
              <option value="daily">Todo dia</option>
              <option value="weekly">Toda semana</option>
            </select>
          </div>

          <footer class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              @click="close"
              class="px-4 py-2 rounded-md border border-border bg-background hover:bg-muted transition text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition text-sm font-medium"
            >
              Criar lembrete
            </button>
          </footer>
        </form>
      </div>
    </div>
  </Teleport>
</template>
