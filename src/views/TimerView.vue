<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Play, Pause, RotateCcw } from 'lucide-vue-next'
import { useTimer } from '@/composables/useTimer'
import { formatMinSec, parseMinSec } from '@/utils/formatDate'

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
  setSeconds,
} = useTimer()

const presets = [5, 10, 15, 25, 50, 90]

/** Dígitos puros do input customizado (sem `:`). Ex: "130" representa 1:30. */
const customDigits = ref<string>('')

/** Display formatado pro input mostrar `MM:SS`. */
const customDisplay = computed(() => formatMinSec(customDigits.value))

/** True se o totalSeconds atual NÃO bate com nenhum preset (= valor custom). */
const isCustomActive = computed(() => {
  const mins = totalSeconds.value / 60
  // Bate exato com um preset (sem segundos extras)?
  return !(presets.includes(mins) && totalSeconds.value === mins * 60)
})

/**
 * Sincroniza customDigits quando o totalSeconds muda por outra forma
 * (clicar preset, reset, etc). Se o valor é custom, preenche o input;
 * se é preset, limpa.
 */
watch(
  totalSeconds,
  (value) => {
    const mins = value / 60
    if (presets.includes(mins) && value === mins * 60) {
      customDigits.value = ''
    } else {
      // Converte segundos → "MMSS" sem `:` pra inserir nos digits
      const m = Math.floor(value / 60)
      const s = value % 60
      const mStr = String(m)
      const sStr = String(s).padStart(2, '0')
      customDigits.value = mStr === '0' ? sStr : mStr + sStr
    }
  },
  { immediate: true }
)

function handleCustomInput(event: Event) {
  const target = event.target as HTMLInputElement
  // Pega só dígitos do input, max 4
  const digits = target.value.replace(/\D/g, '').slice(0, 4)
  customDigits.value = digits

  if (digits.length === 0) return

  const total = parseMinSec(formatMinSec(digits))
  if (total !== null && total > 0) {
    setSeconds(total)
  }
}

const totalLabel = computed(() => {
  const total = totalSeconds.value
  const m = Math.floor(total / 60)
  const s = total % 60
  if (m === 0) return `${s}s`
  if (s === 0) return `${m} min`
  return `${m}m ${s}s`
})

const dashOffset = computed(() => {
  const circumference = 2 * Math.PI * 45
  return circumference * (1 - progress.value / 100)
})

const circumference = 2 * Math.PI * 45
</script>

<template>
  <div class="min-h-full flex items-center justify-center px-8 py-10">
    <div class="w-full max-w-md text-center">
      <h2 class="text-3xl font-bold font-heading tracking-tight mb-2">Timer</h2>
      <p class="text-muted-foreground text-sm mb-8">
        Quanto tempo? Aviso quando zerar.
      </p>

      <!-- Display circular -->
      <div class="relative w-64 h-64 mx-auto mb-8">
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
            {{ totalLabel }}
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

        <!-- Input customizado MM:SS -->
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
            :value="customDisplay"
            @input="handleCustomInput"
            placeholder="MM:SS"
            class="w-14 bg-transparent text-xs text-center font-mono font-medium focus:outline-none placeholder:text-muted-foreground/50"
            :class="isCustomActive ? 'text-primary' : 'text-foreground'"
          />
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
  </div>
</template>
