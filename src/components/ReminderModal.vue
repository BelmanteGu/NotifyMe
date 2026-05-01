<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { X, ChevronDown, AlertCircle } from 'lucide-vue-next'
import type { ReminderInput, Recurrence } from '@/types/reminder'
import {
  isoToBRDate,
  isoToTimeInput,
  maskBRDate,
  maskTime,
  combineBRDateTime,
} from '@/utils/formatDate'

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
const showError = ref(false)

const titleInput = ref<HTMLInputElement | null>(null)

/** ISO computado a partir dos inputs BR — null se inválido */
const computedISO = computed(() => combineBRDateTime(date.value, time.value))
const isFormValid = computed(
  () => title.value.trim().length > 0 && computedISO.value !== null
)

function resetForm() {
  const defaultDate = new Date()
  defaultDate.setMinutes(defaultDate.getMinutes() + 30)
  const isoNow = defaultDate.toISOString()
  title.value = ''
  description.value = ''
  date.value = isoToBRDate(isoNow)
  time.value = isoToTimeInput(isoNow)
  recurrence.value = 'once'
  showError.value = false
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

function handleDateInput(event: Event) {
  const input = event.target as HTMLInputElement
  date.value = maskBRDate(input.value)
}

function handleTimeInput(event: Event) {
  const input = event.target as HTMLInputElement
  time.value = maskTime(input.value)
}

function submit() {
  if (!isFormValid.value) {
    showError.value = true
    return
  }

  emit('save', {
    title: title.value.trim(),
    description: description.value.trim() || undefined,
    triggerAt: computedISO.value!,
    recurrence: recurrence.value,
  })
  close()
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in"
      @click.self="close"
    >
      <div
        class="w-full max-w-md rounded-xl glass-strong shadow-soft overflow-hidden animate-in fade-in zoom-in-95 duration-200"
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
          <!-- Título -->
          <div class="space-y-2">
            <label
              class="text-sm font-medium leading-none text-foreground"
              for="title"
            >
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
              class="flex h-10 w-full rounded-sm border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <!-- Descrição -->
          <div class="space-y-2">
            <label
              class="text-sm font-medium leading-none text-foreground"
              for="description"
            >
              Descrição
              <span class="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <textarea
              id="description"
              v-model="description"
              rows="2"
              maxlength="500"
              placeholder="Detalhes opcionais"
              class="flex w-full rounded-sm border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary transition-colors resize-none disabled:cursor-not-allowed disabled:opacity-50"
            ></textarea>
          </div>

          <!-- Data + Hora -->
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-2">
              <label
                class="text-sm font-medium leading-none text-foreground"
                for="date"
              >
                Data
              </label>
              <input
                id="date"
                :value="date"
                @input="handleDateInput"
                type="text"
                inputmode="numeric"
                placeholder="DD/MM/AAAA"
                maxlength="10"
                required
                class="flex h-10 w-full rounded-sm border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary transition-colors font-mono"
              />
            </div>
            <div class="space-y-2">
              <label
                class="text-sm font-medium leading-none text-foreground"
                for="time"
              >
                Hora
              </label>
              <input
                id="time"
                :value="time"
                @input="handleTimeInput"
                type="text"
                inputmode="numeric"
                placeholder="HH:MM"
                maxlength="5"
                required
                class="flex h-10 w-full rounded-sm border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary transition-colors font-mono"
              />
            </div>
          </div>

          <!-- Repetir (select estilo shadcn) -->
          <div class="space-y-2">
            <label
              class="text-sm font-medium leading-none text-foreground"
              for="recurrence"
            >
              Repetir
            </label>
            <div class="relative">
              <select
                id="recurrence"
                v-model="recurrence"
                class="flex h-10 w-full appearance-none rounded-sm border border-input bg-card px-3 pr-10 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary transition-colors cursor-pointer"
              >
                <option value="once">Uma vez</option>
                <option value="daily">Todo dia</option>
                <option value="weekly">Toda semana</option>
              </select>
              <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <!-- Erro de validação -->
          <div
            v-if="showError && !isFormValid"
            class="flex items-start gap-2 p-3 rounded-sm bg-destructive/10 border border-destructive/30 text-destructive text-xs"
          >
            <AlertCircle class="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              <template v-if="!title.trim()">Título é obrigatório.</template>
              <template v-else>Data ou hora inválida — confira o formato.</template>
            </span>
          </div>

          <footer class="flex justify-end gap-2 pt-3">
            <button
              type="button"
              @click="close"
              class="inline-flex items-center justify-center rounded-sm border border-border bg-card hover:bg-muted h-10 px-5 text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="btn-primary inline-flex items-center justify-center rounded-sm text-primary-foreground h-10 px-5 text-sm font-semibold"
            >
              Criar lembrete
            </button>
          </footer>
        </form>
      </div>
    </div>
  </Teleport>
</template>
