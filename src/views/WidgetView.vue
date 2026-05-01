<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Play, Pause, RotateCcw, Maximize2, X, Timer, Clock4 } from 'lucide-vue-next'
import { useTimer } from '@/composables/useTimer'
import { useStopwatch } from '@/composables/useStopwatch'

const timer = useTimer()
const stopwatch = useStopwatch()

onMounted(() => {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.classList.toggle('dark', prefersDark)
})

/**
 * Modo ativo do widget. Se ambos rodando, prioriza timer.
 * Se nada rodando, retorna null — Main vai fechar a janela.
 */
const mode = computed<'timer' | 'stopwatch' | null>(() => {
  if (timer.isRunning.value) return 'timer'
  if (stopwatch.isRunning.value) return 'stopwatch'
  // Mantém o último modo ativo até o Main fechar a janela,
  // pra evitar flash visual de "nenhum" antes do close
  if (timer.remainingSeconds.value < timer.totalSeconds.value) return 'timer'
  if (stopwatch.elapsedMs.value > 0) return 'stopwatch'
  return null
})

const display = computed(() => {
  if (mode.value === 'timer') return timer.formattedTime.value
  if (mode.value === 'stopwatch') return stopwatch.formattedTime.value
  return '--:--'
})

const label = computed(() => {
  if (mode.value === 'timer') return 'Timer'
  if (mode.value === 'stopwatch') return 'Cronômetro'
  return 'NotifyMe'
})

const isRunning = computed(() => {
  if (mode.value === 'timer') return timer.isRunning.value
  if (mode.value === 'stopwatch') return stopwatch.isRunning.value
  return false
})

function handleToggle() {
  if (mode.value === 'timer') {
    if (timer.isRunning.value) timer.pause()
    else timer.start()
  } else if (mode.value === 'stopwatch') {
    if (stopwatch.isRunning.value) stopwatch.pause()
    else stopwatch.start()
  }
}

function handleReset() {
  if (mode.value === 'timer') timer.reset()
  else if (mode.value === 'stopwatch') stopwatch.reset()
}

function handleOpenMain() {
  window.notifyme.system.window.showMain()
}

function handleClose() {
  window.close()
}
</script>

<template>
  <div class="h-screen flex flex-col bg-app overflow-hidden text-foreground select-none">
    <!-- Drag bar com label, abrir-main e fechar -->
    <div
      class="h-7 px-2 flex items-center justify-between drag-region border-b border-border/40 bg-background/60 backdrop-blur-md flex-shrink-0"
    >
      <div class="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
        <Timer v-if="mode === 'timer'" class="w-3 h-3 text-primary" />
        <Clock4 v-else-if="mode === 'stopwatch'" class="w-3 h-3 text-primary" />
        <span>{{ label }}</span>
      </div>
      <div class="flex no-drag">
        <button
          @click="handleOpenMain"
          class="w-5 h-5 flex items-center justify-center rounded hover:bg-muted/60 text-muted-foreground transition"
          title="Abrir NotifyMe"
        >
          <Maximize2 class="w-2.5 h-2.5" />
        </button>
        <button
          @click="handleClose"
          class="w-5 h-5 flex items-center justify-center rounded hover:bg-destructive/80 hover:text-destructive-foreground text-muted-foreground transition"
          title="Fechar widget"
        >
          <X class="w-3 h-3" />
        </button>
      </div>
    </div>

    <!-- Conteúdo -->
    <div class="flex-1 flex items-center justify-center px-3 py-2 gap-3 min-h-0">
      <div class="flex-1 text-center min-w-0">
        <div class="text-2xl font-bold font-mono tracking-tight tabular-nums truncate">
          {{ display }}
        </div>
      </div>
      <div class="flex flex-col gap-1.5 no-drag flex-shrink-0">
        <button
          @click="handleToggle"
          class="w-9 h-7 inline-flex items-center justify-center rounded-sm btn-primary text-primary-foreground"
          :title="isRunning ? 'Pausar' : 'Continuar'"
        >
          <Pause v-if="isRunning" class="w-3 h-3 fill-current" />
          <Play v-else class="w-3 h-3 fill-current" />
        </button>
        <button
          @click="handleReset"
          class="w-9 h-7 inline-flex items-center justify-center rounded-sm border border-border bg-card hover:bg-muted text-muted-foreground transition"
          title="Reset"
        >
          <RotateCcw class="w-3 h-3" />
        </button>
      </div>
    </div>
  </div>
</template>
