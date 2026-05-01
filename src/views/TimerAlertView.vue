<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { Timer, X, AlarmClockOff } from 'lucide-vue-next'
import { startTimerAlarm, stopTimerAlarm } from '@/utils/sound'

onMounted(() => {
  // Detecta tema do SO
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.classList.toggle('dark', prefersDark)

  // Inicia o loop do alarme imediatamente
  startTimerAlarm()
})

onBeforeUnmount(() => {
  // Garantia: se a janela for destruída sem clicar nos botões,
  // ainda assim para o som
  stopTimerAlarm()
})

function handleStop() {
  stopTimerAlarm()
  window.close()
}

function handleClose() {
  stopTimerAlarm()
  window.close()
}
</script>

<template>
  <div class="alert-shell h-screen flex flex-col text-foreground select-none overflow-hidden">
    <!-- Barra superior arrastável -->
    <div class="h-9 px-3 flex items-center justify-between drag-region relative z-10">
      <div class="flex items-center gap-2 text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">
        <span class="w-1.5 h-1.5 rounded-full bg-primary glow-pulse"></span>
        Timer
      </div>
      <button
        @click="handleClose"
        class="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-muted/60 text-muted-foreground no-drag transition"
        aria-label="Fechar"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Conteúdo do alerta -->
    <div class="flex-1 flex flex-col px-7 pb-7 pt-4 alert-enter relative z-10">
      <div class="relative inline-flex mb-5">
        <div class="absolute inset-0 rounded-2xl bg-primary/40 blur-2xl glow-pulse"></div>
        <div class="relative w-16 h-16 rounded-2xl icon-badge text-primary-foreground flex items-center justify-center">
          <Timer class="w-8 h-8" />
        </div>
      </div>

      <h1 class="text-2xl font-bold tracking-tight mb-1.5 leading-tight">
        Tempo esgotado!
      </h1>
      <p class="text-sm text-muted-foreground leading-relaxed mb-auto">
        O timer chegou a zero. Clique pra parar o alarme.
      </p>

      <button
        @click="handleStop"
        class="btn-primary px-4 py-3.5 rounded-sm text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 mt-6"
      >
        <AlarmClockOff class="w-4 h-4" />
        Parar alarme
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Mesma vibe da AlertView dos lembretes — gradient laranja sutil */
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
