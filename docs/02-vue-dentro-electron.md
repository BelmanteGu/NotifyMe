# 02 — Vue rodando dentro do Electron

> Como o Vue 3 + Vite + Tailwind se encaixam dentro do Electron, e
> a estrutura completa do código no NotifyMe.

---

## 1. Resumão

No NotifyMe, o **Vue é o Renderer**. Isso significa:
- A UI é Vue 3 com TypeScript, igual ao Cliloop.
- O build vai pra `dist/` em vez de subir num servidor web.
- O Electron carrega esse `dist/index.html` numa `BrowserWindow`.
- Em desenvolvimento (`npm run dev`), Vite serve em `localhost` e o Electron
  carrega de lá com hot reload.

Toda a parte que você já conhece (componentes `.vue`, `setup`, `ref`, `computed`,
slots, emits) **funciona igual**. A diferença é só o "ambiente" em que ele roda.

---

## 2. Estrutura completa da `src/`

```
src/
├── App.vue                       ← shell raiz (TitleBar + Sidebar + view switcher)
├── main.ts                       ← entry: monta App ou AlertView por URL param
├── style.css                     ← Tailwind + utility classes custom
├── vite-env.d.ts                 ← tipos do Vite
├── global.d.ts                   ← declara window.notifyme
│
├── components/                   ← componentes reutilizáveis
│   ├── AboutModal.vue            ← dialog "Sobre" com doação
│   ├── ConfirmDialog.vue         ← dialog de confirmação Win11 Fluent
│   ├── EmptyState.vue            ← estado vazio com variants
│   ├── ReminderCard.vue          ← card de lembrete na lista
│   ├── ReminderModal.vue         ← modal de criar lembrete
│   ├── Sidebar.vue               ← navegação lateral (4 views)
│   ├── StickyNote.vue            ← nota adesiva individual (drag, color picker)
│   ├── ThemeToggle.vue           ← botão Sun/Moon
│   ├── TitleBar.vue              ← barra de título customizada
│   └── ui/
│       ├── Select.vue            ← Select com Teleport (acima de modais)
│       └── Switch.vue            ← toggle iOS-like
│
├── views/                        ← páginas (uma por section da sidebar)
│   ├── RemindersView.vue         ← lista de lembretes (tabs Pendentes/Concluídos)
│   ├── TimerView.vue             ← countdown timer com presets + custom MM:SS
│   ├── StopwatchView.vue         ← cronômetro contando pra cima
│   ├── SettingsView.vue          ← Configurações (toggles widget e notes)
│   ├── AlertView.vue             ← janela de alerta de lembrete (separada)
│   ├── TimerAlertView.vue        ← janela de alarme do timer (loop)
│   ├── WidgetView.vue            ← widget flutuante always-on-top
│   └── NotesView.vue             ← aba "Notas" com board interno (sticky notes)
│
├── composables/                  ← state + lógica reativa
│   ├── useTheme.ts               ← light/dark + localStorage
│   ├── useReminders.ts           ← CRUD via IPC + push refresh
│   ├── useTimer.ts               ← stub IPC pro TimerService no Main
│   ├── useStopwatch.ts           ← stub IPC pro StopwatchService no Main
│   ├── useSettings.ts            ← stub IPC pra configurações
│   ├── useConfirm.ts             ← dialog de confirmação singleton
│   └── useNotes.ts               ← stub IPC das sticky notes
│
├── types/                        ← tipos TypeScript compartilhados
│   ├── reminder.ts               ← Reminder, Recurrence, etc
│   ├── timer.ts                  ← TimerState, StopwatchState
│   ├── settings.ts               ← Settings + DEFAULT_SETTINGS
│   ├── note.ts                   ← Note, NoteColor, COLOR_PALETTES
│   └── api.ts                    ← NotifyMeAPI (window.notifyme contract)
│
└── utils/                        ← funções puras
    ├── formatDate.ts             ← masks BR (DD/MM/AAAA, HH:MM, MM:SS) + relative format
    └── sound.ts                  ← Web Audio API chimes + alarme em loop
```

A organização segue o padrão do Cliloop: `components/`, `composables/`,
`types/`, `utils/`, `views/`. Nova adição: `components/ui/` pros
componentes "primitivos" estilo shadcn-vue (Select, etc).

---

## 3. Aliases de import: `@/...`

No NotifyMe, igual no Cliloop, `@` aponta pra `src/`. Configurado em
dois lugares:

### 3.1 `vite.config.ts`
```ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, 'src'),
  },
},
```
Isso resolve em **runtime/build**.

### 3.2 `tsconfig.app.json`
```json
"baseUrl": ".",
"paths": {
  "@/*": ["./src/*"]
}
```
Isso resolve em **type-check**.

Os dois precisam estar sincronizados.

---

## 4. Tailwind + variáveis HSL: o sistema de tema

O sistema de cores funciona em **3 camadas**, copiado do Cliloop:

### Camada 1 — Variáveis CSS em `src/style.css`
```css
:root {
  --primary: 24 95% 53%;       /* laranja light */
  --background: 30 30% 99%;
  ...
}
.dark {
  --primary: 24 95% 60%;       /* laranja dark */
  --background: 240 10% 5.5%;
  ...
}
```

### Camada 2 — Tailwind lê essas variáveis
```js
// tailwind.config.js
colors: {
  primary: { DEFAULT: 'hsl(var(--primary))', ... },
  background: 'hsl(var(--background))',
  ...
}
```

### Camada 3 — Classes Tailwind no componente
```vue
<button class="bg-primary text-primary-foreground">
```

**O que ganhamos com isso?**
Trocar light/dark é só adicionar a classe `.dark` no `<html>`. Todas as
variáveis trocam de valor. É exatamente o mesmo mecanismo do Cliloop.

---

## 5. Utility classes custom (`src/style.css`)

Além do Tailwind padrão, definimos classes utilitárias específicas:

| Classe | Uso |
|---|---|
| `.glass` | cards com translucent + backdrop-blur |
| `.glass-strong` | versão mais opaca pra modais |
| `.icon-badge` | gradient laranja + box-shadow + inset |
| `.btn-primary` | gradient laranja com hover lift tactile |
| `.lift` | hover translate-Y(-1px) suave |
| `.glow-pulse` | animação pulsante laranja (alerta) |
| `.animate-bell-ring` | sino balançando |
| `.bg-app` | gradient radial laranja sutil de fundo |
| `.scroll-overlay` | scrollbar overlay onde suportado |
| `.drag-region` / `.no-drag` | -webkit-app-region pra mover janela |

Veja [10-componentes-ui.md](10-componentes-ui.md) pra detalhe de cada uso.

---

## 6. `<Teleport>`: o truque de modais e Selects

Modal e Select usam `<Teleport to="body">` pra renderizar fora da árvore atual:

```vue
<Teleport to="body">
  <div class="fixed inset-0 z-50">...</div>
</Teleport>
```

**Por que?** Modais com overlay precisam ficar **acima de tudo**. Se o modal
estiver dentro de um pai com `overflow: hidden` ou `position: relative`,
ele pode ficar cortado ou empilhado errado.

Mesma técnica no Select: o dropdown é teleportado pra `<body>` com `position:
fixed` calculada do bounding rect do trigger — fica acima de qualquer
modal e ignora overflow:hidden. Veja
[ADR 003](decisoes/003-select-customizado.md).

---

## 7. `defineEmits<{...}>()`: emits tipados

```ts
const emit = defineEmits<{
  'update:open': [value: boolean]
  save: [reminder: ReminderInput]
}>()
```

Isso usa o **type-only emits** do Vue 3.4+. Cada chave é um evento, e o array
é a tupla de argumentos.

Combinado com `v-model:open`:
```vue
<ReminderModal v-model:open="modalOpen" @save="handleSave" />
```

`v-model:open` é açúcar pra prop `open` (boolean) + emit `update:open`.

---

## 8. `Intl` em vez de date-fns

Em `utils/formatDate.ts` usamos `Intl.DateTimeFormat` nativo do navegador
em vez de `date-fns` ou `dayjs`. Por quê:

- Zero dependências adicionais
- Suporte completo a pt-BR
- Já vem otimizado e localizado pelo navegador

Pra um app simples, é suficiente.

---

## 9. Composables singleton (escopo de módulo)

`useTimer` e `useStopwatch` mantêm estado **fora** do escopo da função:

```ts
// src/composables/useTimer.ts
const totalSeconds = ref(25 * 60)  // ← FORA da função
const remainingSeconds = ref(25 * 60)
const isRunning = ref(false)

export function useTimer() {
  return { totalSeconds, remainingSeconds, isRunning, /* ... */ }
}
```

Isso garante que o estado **sobrevive** a mounts/unmounts de componentes.
Quando o usuário troca de view ("Timer" → "Lembretes" → "Timer"), o tempo
restante continua intacto.

`useReminders` segue o mesmo padrão: cache global de lembretes que sobrevive
e atualiza via push do Main.

Veja [11-timer-e-cronometro.md](11-timer-e-cronometro.md) seção 3.

---

## 10. Comparação: rodando o mesmo Vue no navegador vs no Electron

| | App Web | NotifyMe (Electron) |
|---|---|---|
| Onde roda | navegador do usuário | Chromium embutido no Electron |
| Como deploya | sobe `dist/` num CDN/servidor | `dist/` vai dentro do `.exe` |
| Faz fetch HTTP? | sim, normalmente | só se precisar (tudo é local) |
| Tem `localStorage`? | sim | sim |
| Tem `fs`? | NÃO | NÃO no Renderer (vai pelo Main via IPC) |
| Acessa SQLite/store? | NÃO | NÃO direto. Vai pelo Main via IPC |
| Trocar tema? | classe `.dark` no `<html>` | classe `.dark` no `<html>` (igual!) |
| Drag region | N/A | `-webkit-app-region: drag` |
| Web Audio | sim | sim |

Tudo que você sabe de Vue web continua valendo. As diferenças são nas
APIs do "backend" (Node) — usadas via IPC.

---

## 11. URL param switcher (`src/main.ts`)

O mesmo `index.html` é carregado em **duas situações**:
- Janela main: sem query string → renderiza `App.vue`
- Janela de alerta: `?view=alert&id=xxx` → renderiza `AlertView.vue`

```ts
const params = new URLSearchParams(window.location.search)

if (params.get('view') === 'alert') {
  createApp(AlertView, { reminderId: params.get('id') ?? '' }).mount('#app')
} else {
  createApp(App).mount('#app')
}
```

Vantagem: 1 build, 1 bundle, mesmo CSS. A janela de alerta reaproveita
todo o sistema de tema e componentes.

---

## Próxima leitura

- [03 — IPC](03-ipc.md) — comunicação Renderer ↔ Main
- [10 — Componentes UI](10-componentes-ui.md) — Select, Sidebar, TitleBar, etc
- [11 — Timer e Cronômetro](11-timer-e-cronometro.md) — composables singleton
- [12 — Title bar customizada](12-title-bar-customizada.md) — frame:false
- [09 — Glossário](09-glossario.md)
