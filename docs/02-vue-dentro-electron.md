# 02 — Vue rodando dentro do Electron

> Como o Vue 3 + Vite + Tailwind se encaixam dentro do Electron, e por que essa
> combinação é diferente de um app web tradicional.

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

## 2. Estrutura da `src/` na Fase 1

```
src/
├── App.vue                  ← componente raiz
├── main.ts                  ← createApp().mount()
├── style.css                ← Tailwind + variáveis HSL
├── components/
│   ├── EmptyState.vue       ← estado "nenhum lembrete"
│   ├── ReminderCard.vue     ← card de um lembrete
│   ├── ReminderModal.vue    ← modal de criar/editar
│   └── ThemeToggle.vue      ← botão Sun/Moon
├── composables/
│   └── useTheme.ts          ← gerência light/dark + localStorage
├── types/
│   └── reminder.ts          ← interface Reminder, Recurrence, etc
├── data/
│   └── mockReminders.ts     ← dados mock pra Fase 1
└── utils/
    └── formatDate.ts        ← "Hoje, 18:00" / "Amanhã, 09:00"
```

A organização é a mesma do Cliloop: `components/`, `composables/`, `types/`,
`utils/`. Use os mesmos padrões mentais.

---

## 3. Aliases de import: `@/...`

No NotifyMe, igual no Cliloop, `@` aponta pra `src/`. Isso é configurado em
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

Os dois precisam estar sincronizados. Sem o primeiro, o build quebra.
Sem o segundo, o TypeScript reclama de import não encontrado.

---

## 4. Tailwind + variáveis HSL: o sistema de tema

O sistema de cores funciona em **3 camadas**, copiado do Cliloop:

### Camada 1 — Variáveis CSS em `src/style.css`
```css
:root {
  --primary: 24 95% 53%;       /* laranja light */
  --background: 0 0% 100%;
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
Trocar light/dark é só adicionar a classe `.dark` no `<html>`. Tudo se ajusta
automaticamente porque os valores das variáveis trocam. É exatamente o mesmo
mecanismo que o Cliloop usa.

O componente que faz o toggle: [`ThemeToggle.vue`](../src/components/ThemeToggle.vue).
A lógica que aplica/persiste a classe: [`useTheme.ts`](../src/composables/useTheme.ts).

---

## 5. `<Teleport>`: o truque do modal

O `ReminderModal.vue` usa `<Teleport to="body">`. Isso "teleporta" o conteúdo
do componente pra fora da árvore atual e renderiza diretamente no `<body>`.

**Por que?** Modais com overlay precisam ficar **acima de tudo**. Se o modal
estiver dentro de um pai com `overflow: hidden` ou `position: relative`,
ele pode ficar cortado ou empilhado errado. `<Teleport>` resolve isso.

É um recurso nativo do Vue 3 (não precisa de plugin). Equivalente ao
"portal" do React.

---

## 6. `defineEmits<{...}>()`: emits tipados

```ts
const emit = defineEmits<{
  'update:open': [value: boolean]
  save: [reminder: ReminderInput]
}>()
```

Isso usa o **type-only emits** do Vue 3.4+. Cada chave é um evento, e o array
é a tupla de argumentos. O TypeScript valida que você emite com os tipos certos.

Combinado com `v-model:open` no `App.vue`:
```vue
<ReminderModal v-model:open="modalOpen" @save="handleSave" />
```

O `v-model:open` é açúcar pra:
- prop `open` (boolean)
- emit `update:open` quando muda

Esse padrão é comum no Cliloop também — só não é sempre tipado tão
estritamente.

---

## 7. `Intl` em vez de date-fns

Em `utils/formatDate.ts` usamos `Intl.DateTimeFormat` nativo do navegador
em vez de `date-fns` ou `dayjs`. Por quê:

- Zero dependências adicionais
- Suporte completo a pt-BR
- Já vem otimizado e localizado pelo navegador

Para um app simples, é tudo que precisamos. Quando precisar de mais (parsing
flexível, manipulação avançada), aí sim instalamos uma lib.

---

## 8. Comparação: rodando o mesmo Vue no navegador vs no Electron

| | App Web | NotifyMe (Electron) |
|---|---|---|
| Onde roda | navegador do usuário | Chromium embutido no Electron |
| Como deploya | sobe `dist/` num CDN/servidor | `dist/` vai dentro do `.exe` |
| Faz fetch HTTP? | sim, normalmente | só se precisar (tudo é local) |
| Tem `localStorage`? | sim | sim |
| Tem `fs`? | NÃO | NÃO no Renderer (vai pelo Main via IPC) |
| Acessa SQLite? | NÃO (pode usar IndexedDB) | NÃO direto. Vai pelo Main via IPC |
| Trocar tema? | classe `.dark` no `<html>` | classe `.dark` no `<html>` (igual!) |

Tudo que você sabe de Vue web continua valendo. As diferenças são só nas
APIs do "backend" (Node) — e mesmo essas, vamos usar **a partir da Fase 2**
quando precisarmos persistir lembretes.

---

## 9. O que vem na Fase 2

Quando criamos lembretes na Fase 1, eles ficam só em memória — fechou o app,
sumiu. Na Fase 2:

1. Adicionamos `better-sqlite3` ao Main process
2. Criamos handlers IPC: `reminder:list`, `reminder:create`, `reminder:update`, `reminder:delete`
3. O Preload expõe `window.notifyme.reminders.*`
4. O Vue chama `await window.notifyme.reminders.create(...)` em vez de `reminders.value.push(...)`

A UI praticamente não muda — a estrutura do `App.vue` já está pronta pra
trocar a fonte dos dados.

---

## Próxima leitura

- [03 — IPC](03-ipc.md) — *(Fase 2)*
- [04 — Banco SQLite](04-banco-sqlite.md) — *(Fase 2)*
- [09 — Glossário](09-glossario.md)
