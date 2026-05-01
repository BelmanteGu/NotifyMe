<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Bell, CheckCircle2, Clock, X, Repeat } from 'lucide-vue-next'
import type { Reminder } from '@/types/reminder'
import { RECURRENCE_LABELS } from '@/types/reminder'
import { formatRelative } from '@/utils/formatDate'
import { playAlertSound } from '@/utils/sound'

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

  // Toca o som de alerta após o reminder carregar (evita som tocando
  // numa janela vazia se o IPC demorar). Se o autoplay for bloqueado
  // por política do navegador, o som falha silenciosamente — a janela
  // ainda é visível e o usuário ainda recebe o alerta.
  if (reminder.value) {
    playAlertSound()
  }
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
  <div class="alert-shell h-screen flex flex-col text-foreground select-none overflow-hidden">
    <!-- Barra superior arrastável (sem frame nativo do Windows) -->
    <div class="h-9 px-3 flex items-center justify-between drag-region relative z-10">
      <div class="flex items-center gap-2 text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">
        <span class="w-1.5 h-1.5 rounded-full bg-primary glow-pulse"></span>
        Lembrete
      </div>
      <button
        @click="handleClose"
        class="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-muted/60 text-muted-foreground no-drag transition"
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
    <div v-else class="flex-1 flex flex-col px-7 pb-7 pt-4 alert-enter relative z-10">
      <!-- Ícone com glow pulsante -->
      <div class="relative inline-flex mb-5">
        <div class="absolute inset-0 rounded-2xl bg-primary/40 blur-2xl glow-pulse"></div>
        <div class="relative w-16 h-16 rounded-2xl icon-badge text-primary-foreground flex items-center justify-center">
          <Bell class="w-8 h-8" />
        </div>
      </div>

      <!-- Título e descrição -->
      <h1 class="text-2xl font-bold tracking-tight mb-1.5 leading-tight">
        {{ reminder.title }}
      </h1>
      <p
        v-if="reminder.description"
        class="text-sm text-muted-foreground leading-relaxed mb-3"
      >
        {{ reminder.description }}
      </p>

      <!-- Metadados -->
      <div class="flex items-center gap-2 mb-auto">
        <span class="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock class="w-3.5 h-3.5" />
          {{ formatRelative(reminder.triggerAt) }}
        </span>
        <span
          v-if="reminder.recurrence !== 'once'"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-medium text-[11px]"
        >
          <Repeat class="w-3 h-3" />
          {{ RECURRENCE_LABELS[reminder.recurrence] }}
        </span>
      </div>

      <!-- Botões -->
      <div class="grid grid-cols-2 gap-2.5 mt-6">
        <button
          @click="handleSnooze"
          :disabled="acting"
          class="px-4 py-3.5 rounded-sm border border-border bg-card hover:bg-muted transition text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Clock class="w-4 h-4" />
          Adiar 10 min
        </button>
        <button
          @click="handleComplete"
          :disabled="acting"
          class="btn-primary px-4 py-3.5 rounded-sm text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <CheckCircle2 class="w-4 h-4" />
          Concluído
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * Shell da janela de alerta — gradient laranja sutil pra dar peso visual
 * sem ofuscar o conteúdo. Mais marcante que o bg-app padrão.
 */
.alert-shell {
  background:
    radial-gradient(ellipse 100% 80% at 50% 0%, hsl(var(--primary) / 0.18), transparent 60%),
    radial-gradient(ellipse 60% 40% at 100% 100%, hsl(var(--primary) / 0.08), transparent 50%),
    hsl(var(--background));
}

:global(.dark) .alert-shell {
  background:
    radial-gradient(ellipse 100% 80% at 50% 0%, hsl(var(--primary) / 0.22), transparent 60%),
    radial-gradient(ellipse 60% 40% at 100% 100%, hsl(var(--primary) / 0.1), transparent 50%),
    hsl(var(--background));
}

/* Animação de entrada — scale + fade */
@keyframes alert-enter {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(-6px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.alert-enter {
  animation: alert-enter 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
