# 03 — IPC: como Renderer e Main conversam

> **IPC = Inter-Process Communication.** É o "telefone" entre o Vue (Renderer)
> e o Node.js (Main). Sem IPC, o Vue não consegue ler/escrever arquivos,
> abrir banco de dados, ou disparar notificações nativas.

---

## 1. Por que IPC existe

Lembrando da [01-arquitetura-electron.md](01-arquitetura-electron.md):

- O **Renderer** (Vue) roda no Chromium. NÃO tem acesso a Node.
- O **Main** roda em Node.js. Tem TODOS os privilégios.

Pra fazer qualquer coisa que precise do SO (gravar lembrete no SQLite, mostrar
notificação, ler arquivo), o Renderer **pede ao Main**. Esse pedido vai por IPC.

```
┌────────────┐   "cria esse lembrete"   ┌────────────┐
│  Renderer  │  ───────────────────────►│    Main    │
│   (Vue)    │                          │  (Node.js) │
│            │  ◄─────────────────────  │            │
└────────────┘    "ok, aqui está ele"   └────────────┘
                  com id e createdAt
```

---

## 2. As 3 partes envolvidas

```
┌─────────────────────────────────────────────────────────────────┐
│  src/ (Vue)                                                      │
│                                                                  │
│  await window.notifyme.reminders.create({ title, ... })         │
│           │                                                      │
└───────────┼──────────────────────────────────────────────────────┘
            │
            │ window.notifyme é exposto pelo Preload
            ▼
┌─────────────────────────────────────────────────────────────────┐
│  electron/preload.ts                                             │
│                                                                  │
│  contextBridge.exposeInMainWorld('notifyme', {                  │
│    reminders: {                                                  │
│      create: (input) => ipcRenderer.invoke(                     │
│        'reminders:create', input  ◄─── canal + payload          │
│      ),                                                          │
│    },                                                            │
│  })                                                              │
│           │                                                      │
└───────────┼──────────────────────────────────────────────────────┘
            │
            │ ipcRenderer.invoke envia mensagem assíncrona
            ▼
┌─────────────────────────────────────────────────────────────────┐
│  electron/ipc/reminders.ts                                       │
│                                                                  │
│  ipcMain.handle('reminders:create', (_event, input) => {        │
│    return service.create(input)                                  │
│  })                                                              │
│           │                                                      │
└───────────┼──────────────────────────────────────────────────────┘
            │
            │ chama o service (camada de domínio)
            ▼
┌─────────────────────────────────────────────────────────────────┐
│  electron/services/reminders.ts                                  │
│                                                                  │
│  this.db.prepare('INSERT INTO reminders ...').run(...)          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Os 3 canais IPC do NotifyMe (Fase 2)

| Canal | Direção | O que faz | Retorno |
|---|---|---|---|
| `reminders:list` | Renderer → Main | Lista todos os lembretes | `Reminder[]` |
| `reminders:create` | Renderer → Main | Cria um lembrete | `Reminder` |
| `reminders:delete` | Renderer → Main | Apaga pelo id | `boolean` |
| `reminders:markCompleted` | Renderer → Main | Marca como concluído | `Reminder \| null` |

**Convenção de nomenclatura**: `dominio:acao`. Tudo do mesmo domínio prefixado
igual. Facilita encontrar e padronizar.

---

## 4. As duas APIs do Electron

### `ipcRenderer.invoke()` — usada no Renderer/Preload

```ts
const reminder = await ipcRenderer.invoke('reminders:create', input)
```

- Assíncrono (sempre retorna Promise).
- Pode ser chamado várias vezes, cada chamada independente.
- O handler do Main pode retornar qualquer coisa serializável (objeto, array, string, etc).

### `ipcMain.handle()` — usada no Main

```ts
ipcMain.handle('reminders:create', (_event, input) => {
  return service.create(input)
})
```

- Liga uma função ao canal.
- Pode ser síncrona ou async — o Electron lida igual.
- Se a função jogar exceção, ela vira `Error` no Renderer.

---

## 5. Por que NÃO usar `ipcRenderer.send` + `ipcMain.on`

Existem outras APIs do IPC: `send`/`on` (sem retorno) e `sendSync`/`on` (síncrono e bloqueante).

**Não use no NotifyMe.**
- `send`/`on` é "fire and forget". Inútil pra CRUD onde o Renderer precisa do resultado.
- `sendSync` bloqueia o thread do Renderer — UI trava. Nunca use.

`invoke`/`handle` é o padrão moderno e recomendado pelo time do Electron.

---

## 6. Por que o Preload existe (segurança)

Você poderia teoricamente expor `ipcRenderer` direto pro Renderer:

```ts
// preload.ts (NÃO FAÇA)
contextBridge.exposeInMainWorld('ipc', ipcRenderer)
```

Isso é **inseguro**. Significa que o Renderer pode invocar **qualquer canal**,
incluindo canais internos do Electron, e ouvir eventos sensíveis.

A abordagem correta — que o NotifyMe usa — é expor uma **API tipada e específica**:

```ts
contextBridge.exposeInMainWorld('notifyme', {
  reminders: {
    create: (input) => ipcRenderer.invoke('reminders:create', input),
  },
})
```

Cada função expõe **exatamente** um canal. Se o Renderer for comprometido,
ele só pode chamar essas funções específicas — não tem acesso ao IPC bruto.

---

## 7. Tipagem ponta-a-ponta

Os tipos do `Reminder`/`ReminderInput` ficam num lugar (`src/types/reminder.ts`)
e são importados por todo mundo:

- **Service** (`electron/services/reminders.ts`) — implementa a lógica
- **Preload** (`electron/preload.ts`) — declara a função tipada
- **electron-env.d.ts** — declara `window.notifyme` no global do Renderer
- **Composable** (`src/composables/useReminders.ts`) — chama `window.notifyme.*`
- **Componentes** Vue — recebem `Reminder` totalmente tipado

Resultado: se você renomear um campo da interface `Reminder`, o TypeScript
acusa erro nos 5 lugares. Refator seguro.

---

## 8. Padrão "service"

A regra do NotifyMe (vinda do Cliloop):

> Os handlers IPC NÃO contêm lógica de negócio. Só são uma fachada
> que recebe a chamada e delega pra um service.

```ts
// electron/ipc/reminders.ts (FACHADA — magrinho)
ipcMain.handle('reminders:create', (_event, input) =>
  service.create(input)
)

// electron/services/reminders.ts (SERVICE — onde mora a lógica)
create(input: ReminderInput): Reminder {
  // validação, geração de id, INSERT, retorno
}
```

Por quê:
- O service é **testável** isoladamente (não precisa de Electron pra rodar)
- Reaproveitamento: se um dia o cron quiser criar um lembrete, chama o
  service direto — sem passar por IPC
- Separação de camadas: IPC é um **transporte**, lógica é **domínio**

---

## 9. Como a UI sente que algo aconteceu

O composable `useReminders.ts` é o "controlador" do Vue pra esse domínio:

```ts
async function create(input: ReminderInput) {
  const reminder = await window.notifyme.reminders.create(input)
  reminders.value.push(reminder)   // ← atualiza UI imediatamente
  return reminder
}
```

Como `reminders` é um `ref`, qualquer componente que use o composable é
re-renderizado automaticamente quando a lista muda.

---

## 10. Erros comuns

### Erro 1 — Esquecer de registrar o handler
```ts
// preload.ts
window.notifyme.reminders.create(input)  // ← chama
// main.ts esqueceu o ipcMain.handle('reminders:create', ...)
```
**Sintoma**: a chamada fica "pendurada", `await` nunca resolve.
**Fix**: confira se `registerRemindersIPC(service)` foi chamado no `app.whenReady()`.

### Erro 2 — Tipos do payload divergem
```ts
// Renderer envia: { title: string, scheduledAt: Date }
// Main espera:    { title: string, triggerAt: string }
```
**Sintoma**: erro silencioso, dados gravados errado.
**Fix**: tipar dos dois lados a partir do mesmo arquivo (`src/types/reminder.ts`).

### Erro 3 — Tentar enviar coisas não-serializáveis
```ts
ipcRenderer.invoke('foo', { fn: () => {} })  // ← funções não atravessam IPC
```
**Sintoma**: erro de cloning.
**Fix**: passe só dados (string, número, boolean, array, objeto plano).

---

## Próxima leitura

- [04 — Banco SQLite no Main](04-banco-sqlite.md) — o que o handler chama
  por trás
- [09 — Glossário](09-glossario.md)
