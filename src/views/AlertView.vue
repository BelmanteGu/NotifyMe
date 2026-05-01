<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Bell, CheckCircle2, Clock, X } from 'lucide-vue-next'
import type { Reminder } from '@/types/reminder'
import { formatRelative } from '@/utils/formatDate'

const props = defineProps<{
  reminderId: string
}>()

const reminder = ref<Reminder | null>(null)
const loading = ref(true)
const acting = ref(false)

onMounted(async () => {
  // Detecta tema do SO e aplica
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.classList.toggle('dark', prefersDark)

  if (!props.reminderId) {
    loading.value = false
    return
  }

  reminder.value = await window.notifyme.reminders.getById(props.reminderId)
  loading.value = false
})

async function handleComplete() {
  if (!reminder.value || acting.value) return
  acting.value = true
  await window.notifyme.reminders.markCompleted(reminder.value.id)
  window.close()
}

async function handleSnooze() {
  if (!reminder.value || acting.value) return
  acting.value = true
  await window.notifyme.reminders.snooze(reminder.value.id, 10)
  window.close()
}

function handleClose() {
  window.close()
}
</script>

<template>
  <div class="h-screen flex flex-col bg-background text-foreground select-none">
    <!-- Barra superior arrastável (sem frame nativo) -->
    <div
      class="h-9 px-3 flex items-center justify-between border-b border-border"
      style="-webkit-app-region: drag"
    >
      <div class="flex items-center gap-2 text-xs text-muted-foreground">
        <Bell class="w-3.5 h-3.5 text-primary" />
        NotifyMe
      </div>
      <button
        @click="handleClose"
        class="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
        style="-webkit-app-region: no-drag"
        aria-label="Fechar"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex items-center justify-center text-muted-foreground">
      Carregando…
    </div>

    <!-- Reminder não encontrado (raro, mas defensivo) -->
    <div
      v-else-if="!reminder"
      class="flex-1 flex flex-col items-center justify-center p-6 text-center"
    >
      <p class="text-muted-foreground">Lembrete não encontrado.</p>
      <button
        @click="handleClose"
        class="mt-4 px-4 py-2 rounded-md bg-muted text-sm"
      >
        Fechar
      </button>
    </div>

    <!-- Conteúdo do alerta -->
    <div v-else class="flex-1 flex flex-col p-6">
      <div
        class="w-14 h-14 rounded-lg bg-primary/15 text-primary flex items-center justify-center mb-4"
      >
        <Bell class="w-7 h-7" />
      </div>

      <h1 class="text-xl font-bold mb-1">{{ reminder.title }}</h1>
      <p
        v-if="reminder.description"
        class="text-sm text-muted-foreground mb-3"
      >
        {{ reminder.description }}
      </p>

      <span class="inline-flex items-center gap-1 text-xs text-muted-foreground mb-auto">
        <Clock class="w-3.5 h-3.5" />
        {{ formatRelative(reminder.triggerAt) }}
      </span>

      <div class="grid grid-cols-2 gap-2 mt-6">
        <button
          @click="handleSnooze"
          :disabled="acting"
          class="px-3 py-3 rounded-md border border-border bg-background hover:bg-muted transition text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Clock class="w-4 h-4" />
          Adiar 10 min
        </button>
        <button
          @click="handleComplete"
          :disabled="acting"
          class="px-3 py-3 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <CheckCircle2 class="w-4 h-4" />
          Concluído
        </button>
      </div>
    </div>
  </div>
</template>
