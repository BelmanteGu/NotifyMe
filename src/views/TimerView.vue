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
  setSeconds,
} = useTimer()

const presets = [5, 10, 15, 25, 50, 90]

// ─── Input personalizado: 2 campos MM e SS ────────────────────
const customMinutes = ref('')
const customSeconds = ref('')
const minutesInput = ref<HTMLInputElement | null>(null)
const secondsInput = ref<HTMLInputElement | null>(null)

const isCustomActive = computed(() => {
  const totalMin = totalSeconds.value / 60
  // Bate exato com preset (sem segundos extras)?
  return !(presets.includes(totalMin) && totalSeconds.value === totalMin * 60)
})

/**
 * Sincroniza os inputs quando totalSeconds muda por outra forma
 * (preset clicado, reset). Limpa campos se for um preset; preenche
 * se for custom.
 */
watch(
  totalSeconds,
  (value) => {
    const m = Math.floor(value / 60)
    const s = value % 60
    if (presets.includes(m) && s === 0) {
      customMinutes.value = ''
      customSeconds.value = ''
    } else {
      customMinutes.value = m > 0 ? String(m) : ''
      customSeconds.value = s > 0 ? String(s).padStart(2, '0') : ''
    }
  },
  { immediate: true }
)

function syncToTimer() {
  const m = parseInt(customMinutes.value) || 0
  const s = parseInt(customSeconds.value) || 0
  const total = m * 60 + s
  if (total > 0) {
    setSeconds(total)
  }
}

function handleMinutesInput(event: Event) {
  const target = event.target as HTMLInputElement
  const v = target.value.replace(/\D/g, '').slice(0, 2)
  customMinutes.value = v
  // Auto-foca no campo de segundos quando completa 2 dígitos
  if (v.length === 2) {
    secondsInput.value?.focus()
    secondsInput.value?.select()
  }
  syncToTimer()
}

function handleSecondsInput(event: Event) {
  const target = event.target as HTMLInputElement
  let v = target.value.replace(/\D/g, '').slice(0, 2)
  // Cap silencioso em 59 (segundos válidos)
  const num = parseInt(v) || 0
  if (num > 59) v = '59'
  customSeconds.value = v
  syncToTimer()
}

function handleSecondsKeydown(event: KeyboardEvent) {
  // Backspace em campo vazio volta foco pro minutos
  if (event.key === 'Backspace' && customSeconds.value === '') {
    minutesInput.value?.focus()
    minutesInput.value?.select()
  }
}

function selectOnFocus(event: FocusEvent) {
  const target = event.target as HTMLInputElement
  // Aguarda próximo tick — Safari/Edge às vezes anula select() imediato
  requestAnimationFrame(() => target.select())
}

// ─── Display circular ──────────────────────────────────────────
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

      <!-- Presets -->
      <div class="flex flex-wrap gap-2 justify-center mb-3">
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
      </div>

      <!-- Input personalizado (MM:SS com 2 campos separados) -->
      <div class="flex justify-center mb-8">
        <div
          class="custom-time-input"
          :class="{ active: isCustomActive }"
        >
          <span class="text-xs text-muted-foreground font-medium">Outro:</span>
          <input
            ref="minutesInput"
            :value="customMinutes"
            @input="handleMinutesInput"
            @focus="selectOnFocus"
            type="text"
            inputmode="numeric"
            placeholder="00"
            maxlength="2"
            aria-label="Minutos"
            class="time-input"
          />
          <span class="time-separator">:</span>
          <input
            ref="secondsInput"
            :value="customSeconds"
            @input="handleSecondsInput"
            @keydown="handleSecondsKeydown"
            @focus="selectOnFocus"
            type="text"
            inputmode="numeric"
            placeholder="00"
            maxlength="2"
            aria-label="Segundos"
            class="time-input"
          />
          <span class="text-[10px] text-muted-foreground/70 font-medium ml-0.5 uppercase tracking-wider">
            min:seg
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
  </div>
</template>

<style scoped>
.custom-time-input {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  border-radius: 9999px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card));
  transition: all 0.15s;
}

.custom-time-input.active {
  border-color: hsl(var(--primary));
  background: hsl(var(--primary) / 0.05);
  box-shadow: 0 0 0 3px hsl(var(--primary) / 0.08);
}

.time-input {
  width: 22px;
  background: transparent;
  border: none;
  outline: none;
  text-align: center;
  font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace;
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--foreground));
  padding: 0;
  caret-color: hsl(var(--primary));
}

.time-input::placeholder {
  color: hsl(var(--muted-foreground) / 0.4);
  font-weight: 400;
}

.time-input::selection {
  background: hsl(var(--primary) / 0.25);
}

/* Esconde os steppers nativos do type=number quando aplicável */
.time-input::-webkit-outer-spin-button,
.time-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.custom-time-input.active .time-input {
  color: hsl(var(--primary));
}

.time-separator {
  color: hsl(var(--muted-foreground));
  font-weight: 600;
  font-family: ui-monospace, monospace;
  font-size: 13px;
  user-select: none;
}

.custom-time-input.active .time-separator {
  color: hsl(var(--primary));
}
</style>
