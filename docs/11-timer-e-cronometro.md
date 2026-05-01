# 11 — Timer e Cronômetro

> Como o NotifyMe vai além de lembretes: countdown timer (Pomodoro) e
> stopwatch. Ambos vivem no Renderer, com estado singleton em composables.

---

## 1. Por que timer e cronômetro

A hipótese inicial do app era "lembretes que não somem". Mas o usuário-alvo
(donos de PME, freelancers, estudantes) também usa timer/cronômetro pro
mesmo workflow:

- "Vou trabalhar 25 min focado" → Pomodoro timer
- "Quanto tempo levei pra terminar essa tarefa?" → cronômetro
- "Lembrar de levantar a cada 1 hora" → lembrete recorrente

Ter os 3 no mesmo app evita instalar utilitários separados. Esforço marginal
foi pequeno (poucas centenas de linhas) vs valor de retenção alto.

---

## 2. Estrutura

```
src/
├── composables/
│   ├── useTimer.ts       ← countdown singleton
│   └── useStopwatch.ts   ← stopwatch singleton
├── views/
│   ├── TimerView.vue     ← UI do countdown
│   └── StopwatchView.vue ← UI do cronômetro
└── utils/
    └── sound.ts          ← Web Audio chimes
```

A sidebar (`<Sidebar>`) navega entre `reminders` / `timer` / `stopwatch`
via state local em `App.vue`.

---

## 3. Composables singleton

### Por que escopo de módulo (não escopo de componente)

```ts
// src/composables/useTimer.ts
const totalSeconds = ref(25 * 60) // ← FORA da função useTimer
const remainingSeconds = ref(25 * 60)
const isRunning = ref(false)

export function useTimer() {
  return { totalSeconds, remainingSeconds, isRunning, /* ... */ }
}
```

Quando o usuário troca de "Timer" pra "Lembretes" e volta, o `TimerView.vue`
desmonta e remonta. Se o estado vivesse **dentro** do `useTimer()`, seria
recriado do zero — o timer perderia o tempo restante.

Com o estado **fora** da função (escopo do módulo), todas as chamadas de
`useTimer()` retornam **as mesmas refs**. O timer continua rodando em
background mesmo quando o componente desmonta.

> Limitação: se a janela main fechar (close = hide na nossa app, não
> destrói), o estado persiste. Mas se a janela for **destruída** (Quit
> total, não volta da tray), o estado some. Pra MVP, aceitável.

---

## 4. Timer (countdown)

### Estado e API

```ts
const { 
  totalSeconds,        // Ref<number>
  remainingSeconds,    // Ref<number>
  isRunning,           // Ref<boolean>
  formattedTime,       // ComputedRef<string> "MM:SS"
  progress,            // ComputedRef<number> 0-100
  start,
  pause,
  reset,
  setMinutes,          // (mins: number) => void
} = useTimer()
```

### Loop de tick

`setInterval(tick, 1000)`:

```ts
function tick() {
  remainingSeconds.value--
  if (remainingSeconds.value <= 0) {
    handleComplete()
  }
}
```

Drift do `setInterval`: aceita-se ±100-200ms acumulado em sessões longas.
Pra precisão crítica, usaríamos `requestAnimationFrame` + Date.now diff.
Pra Pomodoro de 25min, irrelevante.

### `handleComplete`

Quando `remainingSeconds <= 0`:
1. `pause()` — limpa interval
2. `playTimerEndSound()` — 3 notas urgentes (E5, E5, G5)
3. `new Notification('NotifyMe — Timer', { body: 'Tempo esgotado!' })` —
   notif nativa do navegador (Electron permite sem pedir permissão)

### UI: Display circular

`<TimerView.vue>` desenha um SVG circle com `stroke-dasharray` +
`stroke-dashoffset` animado. Cálculo:

```ts
const circumference = 2 * Math.PI * 45  // r=45
const dashOffset = computed(() => circumference * (1 - progress.value / 100))
```

Transition CSS no SVG: `stroke-dashoffset 0.4s linear`.

### Presets + input personalizado

Pills laterais com presets `[5, 10, 15, 25, 50, 90]` min + um input
"personalizado" que aceita 1-999 min. Veja
[10-componentes-ui.md](10-componentes-ui.md) seção sobre TimerView se
quiser ver o detalhe da UI.

---

## 5. Cronômetro (stopwatch)

### Estado e API

```ts
const {
  elapsedMs,        // Ref<number>
  isRunning,        // Ref<boolean>
  formattedTime,    // ComputedRef<string> "HH:MM:SS.cc"
  start,
  pause,
  reset,
} = useStopwatch()
```

### Implementação anti-drift

Em vez de `elapsedMs += 50` a cada tick (que acumula drift), guardamos
`startedAt: Date.now()` no início e calculamos:

```ts
function tick() {
  elapsedMs.value = Date.now() - startedAt
}
```

`startedAt` é ajustado quando pausa/resume:

```ts
function start() {
  startedAt = Date.now() - elapsedMs.value  // resume mantém posição
  intervalId = window.setInterval(tick, 50)
}
```

Tick a cada 50ms (20fps) — suficiente pra centésimos parecerem fluidos.

### Formato de display

```
HH:MM:SS.cc
```

Onde `cc` = centésimos (00-99). Implementação em `formattedTime`:

```ts
const totalCs = Math.floor(elapsedMs.value / 10)
const cs = totalCs % 100
const secs = Math.floor(totalCs / 100) % 60
const mins = Math.floor(totalCs / 6000) % 60
const hours = Math.floor(totalCs / 360000)
return `${hours}:${mins}:${secs}.${cs}` // padded
```

---

## 6. Sons (Web Audio API)

`src/utils/sound.ts` gera chimes programaticamente — **sem arquivo de
áudio externo, sem dependência**.

### Estratégia

`OscillatorNode` (sine wave) + `GainNode` com envelope ADR (attack-decay-release):

```ts
gainNode.gain.setValueAtTime(0, startAt)
gainNode.gain.linearRampToValueAtTime(volume, startAt + 0.02)        // attack 20ms
gainNode.gain.exponentialRampToValueAtTime(0.001, startAt + duration) // decay
```

Sem envelope, oscilador faria "click" no início e fim. Com fade-in/fade-out
suave, soa profissional.

### Sons disponíveis

```ts
playAlertSound()      // 2 notas: C5 (523.25Hz) + E5 (659.25Hz) — lembrete
playTimerEndSound()   // 3 notas: E5, E5 (curtas) + G5 (longa) — timer urgente
```

### AudioContext singleton

```ts
let audioContext: AudioContext | null = null

function getContext(): AudioContext {
  if (!audioContext) audioContext = new AudioContext()
  if (audioContext.state === 'suspended') audioContext.resume()
  return audioContext
}
```

Reutiliza o contexto entre chamadas. Browsers limitam quantos AudioContexts
podem existir por origem (~6).

### Por que não MP3/WAV?

- **Sem dep extra** (zero KB no bundle)
- **Sem rede** (carrega instantâneo)
- **Sem licença** (não tem arquivo de áudio com copyright)
- **Customizável** (mudar nota = mudar uma constante)

Limitação: não dá pra fazer sons complexos (tipo voz). Pra alarmes simples,
suficiente.

---

## 7. Casos não cobertos (pra v2)

- **Timer rodando em background absoluto** (janela fechada/destruída):
  hoje só funciona se a janela main estiver viva (mesmo escondida na tray
  funciona — só não destruída). Pra rodar 100% no Main process, precisaria
  mover o estado pro Main e expor via IPC.
- **Multiple timers**: hoje só 1 timer e 1 cronômetro globais. Útil ter
  vários (ex: marcar tempo de tarefas diferentes). Refactor: trocar
  singleton por Map<id, TimerState>.
- **Histórico**: lap times do cronômetro, sessões do timer. Persistir em
  electron-store.
- **Notificações ricas no timer**: ao terminar, abrir uma janela
  persistente como nos lembretes (em vez de só notif nativa).

---

## Próxima leitura

- [10 — Componentes UI](10-componentes-ui.md)
- [12 — Title bar customizada](12-title-bar-customizada.md)
- [09 — Glossário](09-glossario.md)
