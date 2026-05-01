<script setup lang="ts">
import { Play, Pause, RotateCcw } from 'lucide-vue-next'
import { useStopwatch } from '@/composables/useStopwatch'

const { isRunning, formattedTime, start, pause, reset } = useStopwatch()
</script>

<template>
  <div class="min-h-full flex items-center justify-center px-8 py-10">
    <div class="w-full max-w-md text-center">
      <h2 class="text-3xl font-bold font-heading tracking-tight mb-2">Cronômetro</h2>
      <p class="text-muted-foreground text-sm mb-10">
        Quanto tempo passou? Conta pra cima.
      </p>

      <!-- Display do tempo -->
      <div class="rounded-lg glass py-12 mb-8">
        <div class="text-5xl font-bold font-mono tracking-tight tabular-nums">
          {{ formattedTime }}
        </div>
        <div class="mt-2 flex items-center justify-center gap-2">
          <span
            class="inline-block w-2 h-2 rounded-full"
            :class="isRunning ? 'bg-primary glow-pulse' : 'bg-muted-foreground/30'"
          ></span>
          <span class="text-xs text-muted-foreground">
            {{ isRunning ? 'Rodando' : 'Pausado' }}
          </span>
        </div>
      </div>

      <!-- Botões -->
      <div class="flex gap-2.5 justify-center">
        <button
          v-if="!isRunning"
          @click="start"
          class="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-sm text-primary-foreground font-semibold text-sm"
        >
          <Play class="w-4 h-4 fill-current" />
          Iniciar
        </button>
        <button
          v-else
          @click="pause"
          class="inline-flex items-center gap-2 px-6 py-3 rounded-sm border border-border bg-card hover:bg-muted transition font-semibold text-sm"
        >
          <Pause class="w-4 h-4 fill-current" />
          Pausar
        </button>
        <button
          @click="reset"
          class="inline-flex items-center gap-2 px-6 py-3 rounded-sm border border-border bg-card hover:bg-muted transition font-semibold text-sm"
        >
          <RotateCcw class="w-4 h-4" />
          Reset
        </button>
      </div>
    </div>
  </div>
</template>
