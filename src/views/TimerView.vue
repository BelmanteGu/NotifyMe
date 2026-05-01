<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Play, Pause, RotateCcw } from 'lucide-vue-next'
import { useTimer } from '@/composables/useTimer'

const {
  totalSeconds,
  remainingSeconds,
  isRunning,
  formattedTime,
  progress,
  start,
  pause,
  reset,
  setMinutes,
} = useTimer()

const presets = [5, 10, 15, 25, 50, 90]

const customInput = ref<string>('')

/** True se o totalSeconds atual NÃO bate com nenhum preset (= valor custom). */
const isCustomActive = computed(() => {
  const mins = totalSeconds.value / 60
  return !presets.includes(mins)
})

/**
 * Sincroniza customInput com o totalSeconds quando ele muda por outra
 * forma (preset clicado, reset, etc) — mas só preenche o input se for
 * um valor custom, pra não atrapalhar.
 */
watch(
  totalSeconds,
  (value) => {
    const mins = value / 60
    if (!presets.includes(mins)) {
      customInput.value = String(mins)
    } else {
      customInput.value = ''
    }
  },
  { immediate: true }
)

function handleCustomInput(event: Event) {
  const target = event.target as HTMLInputElement
  const raw = target.value.replace(/\D/g, '').slice(0, 3) // max 999 min
  customInput.value = raw

  const value = parseInt(raw, 10)
  if (Number.isFinite(value) && value > 0 && value <= 999) {
    setMinutes(value)
  }
}

const dashOffset = computed(() => {
  const circumference = 2 * Math.PI * 45
  return circumference * (1 - progress.value / 100)
})

const circumference = 2 * Math.PI * 45
</script>

<template>
  <div class="max-w-md mx-auto px-8 py-10 text-center">
    <h2 class="text-3xl font-bold font-heading tracking-tight mb-2">Timer</h2>
    <p class="text-muted-foreground text-sm mb-10">
      Quanto tempo? Aviso quando zerar.
    </p>

    <!-- Display circular -->
    <div class="relative w-64 h-64 mx-auto mb-10">
      <svg class="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="hsl(var(--muted))"
          stroke-width="2"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="hsl(var(--primary))"
          stroke-width="3"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="dashOffset"
          stroke-linecap="round"
          style="transition: stroke-dashoffset 0.4s linear"
        />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <span class="text-5xl font-bold font-mono tracking-tight tabular-nums">
          {{ formattedTime }}
        </span>
        <span class="text-xs text-muted-foreground mt-1">
          {{ Math.floor(totalSeconds / 60) }} min
        </span>
      </div>
    </div>

    <!-- Presets + input personalizado -->
    <div class="flex flex-wrap gap-2 justify-center items-center mb-8">
      <button
        v-for="m in presets"
        :key="m"
        @click="setMinutes(m)"
        class="px-3.5 py-1.5 rounded-full border bg-card hover:bg-muted transition text-xs font-medium"
        :class="
          totalSeconds === m * 60
            ? 'border-primary text-primary bg-primary/5'
            : 'border-border text-muted-foreground hover:text-foreground'
        "
      >
        {{ m }} min
      </button>

      <!-- Input customizado, estilo pill -->
      <div
        class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border bg-card transition"
        :class="
          isCustomActive
            ? 'border-primary bg-primary/5'
            : 'border-border'
        "
      >
        <input
          type="text"
          inputmode="numeric"
          :value="customInput"
          @input="handleCustomInput"
          placeholder="—"
          class="w-10 bg-transparent text-xs text-center font-medium focus:outline-none placeholder:text-muted-foreground/50"
          :class="isCustomActive ? 'text-primary' : 'text-foreground'"
        />
        <span
          class="text-xs"
          :class="isCustomActive ? 'text-primary font-medium' : 'text-muted-foreground'"
        >
          min
        </span>
      </div>
    </div>

    <!-- Botões de controle -->
    <div class="flex gap-2.5 justify-center">
      <button
        v-if="!isRunning"
        @click="start"
        :disabled="remainingSeconds === 0"
        class="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-sm text-primary-foreground font-semibold text-sm disabled:opacity-50"
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
</template>
