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
  <div class="h-screen flex flex-col bg-app text-foreground select-none overflow-hidden">
    <!-- Barra superior arrastável (sem frame nativo) -->
    <div class="h-9 px-3 flex items-center justify-between drag-region">
      <div class="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <Bell class="w-3 h-3 text-primary" />
        NotifyMe
      </div>
      <button
        @click="handleClose"
        class="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground no-drag"
        aria-label="Fechar"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex items-center justify-center text-muted-foreground">
      Carregando…
    </div>

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
    <div v-else class="flex-1 flex flex-col p-7">
      <div class="relative inline-flex mb-5">
        <div class="absolute inset-0 rounded-2xl bg-primary/30 blur-xl glow-pulse"></div>
        <div class="relative w-16 h-16 rounded-2xl icon-badge text-primary-foreground flex items-center justify-center">
          <Bell class="w-8 h-8" />
        </div>
      </div>

      <h1 class="text-2xl font-bold tracking-tight mb-1.5 leading-tight">
        {{ reminder.title }}
      </h1>
      <p
        v-if="reminder.description"
        class="text-sm text-muted-foreground leading-relaxed mb-3"
      >
        {{ reminder.description }}
      </p>

      <span class="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-auto">
        <Clock class="w-3.5 h-3.5" />
        {{ formatRelative(reminder.triggerAt) }}
      </span>

      <div class="grid grid-cols-2 gap-2.5 mt-6">
        <button
          @click="handleSnooze"
          :disabled="acting"
          class="px-4 py-3.5 rounded-xl border border-border bg-card hover:bg-muted transition text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Clock class="w-4 h-4" />
          Adiar 10 min
        </button>
        <button
          @click="handleComplete"
          :disabled="acting"
          class="btn-primary px-4 py-3.5 rounded-xl text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <CheckCircle2 class="w-4 h-4" />
          Concluído
        </button>
      </div>
    </div>
  </div>
</template>
