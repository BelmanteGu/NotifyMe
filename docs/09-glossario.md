# 09 — Glossário

> Termos novos que aparecem ao longo do projeto NotifyMe. Volte aqui sempre que esbarrar em algo desconhecido.

---

### ADR (Architectural Decision Record)

Documento curto que registra uma decisão arquitetural importante:
contexto, alternativas consideradas, decisão tomada, consequências.
No NotifyMe ficam em `docs/decisoes/`.

---

### AlertView

Componente Vue (`src/views/AlertView.vue`) renderizado dentro da janela
de alerta persistente. Mostra título do lembrete + 2 botões grandes
(Concluído / Adiar 10 min). Veja [06-notificacao-persistente.md](06-notificacao-persistente.md).

---

### App (em Electron)

Objeto principal do Electron. Representa o ciclo de vida do aplicativo:
quando inicia, quando todas as janelas fecham, quando o usuário tenta sair.

```ts
import { app } from 'electron'
app.whenReady().then(() => { /* criar janela */ })
```

---

### asar

Formato de arquivo do Electron que **concatena vários JSs num único
arquivo `app.asar`**. Vantagens: inicialização mais rápida, leve
ofuscação, redução de tamanho. Configurado no `electron-builder.yml`
(`asar: true`).

---

### AudioContext

API do navegador (Web Audio API) pra gerar e manipular áudio
programaticamente. NotifyMe usa pra gerar chimes de alarme **sem
arquivo de áudio externo**.

```ts
const ctx = new AudioContext()
const osc = ctx.createOscillator()
osc.frequency.value = 523.25  // C5
osc.start()
```

Veja [11-timer-e-cronometro.md](11-timer-e-cronometro.md) seção 6.

---

### bell-ring

Animação CSS no NotifyMe que faz o sino oscilar como se estivesse
tocando. Aplicada no EmptyState quando não há lembretes pendentes.
Definida em `src/style.css` como `@keyframes bell-ring` + classe
`.animate-bell-ring`.

---

### BrowserWindow

A "janela" de um app Electron. Cada `new BrowserWindow(...)` cria uma janela
nova com seu próprio Renderer. No NotifyMe há a janela main + janelas de
alerta persistente (`openAlertWindow`).

---

### Build

Processo de compilar o código-fonte (TypeScript, Vue, etc) em arquivos prontos
pra rodar. No NotifyMe:
- `npm run build` → compila Vue + Electron pra `dist/` e `dist-electron/`
- `npm run dist` → compila + empacota num `.exe` via electron-builder

---

### Combobox

Variação do `<Select>` que **permite digitar valores customizados** além
de escolher de uma lista fixa. NotifyMe usa essa abordagem no Timer:
presets fixos (5/10/25 min) + input numérico pra valor custom.

---

### contextBridge

API do Electron usada no Preload pra expor funções do Main pro Renderer
de forma controlada.

```ts
contextBridge.exposeInMainWorld('notifyme', {
  reminders: { create: (data) => ipcRenderer.invoke(...) }
})
```

---

### contextIsolation

Configuração de segurança do Electron. Quando `true` (padrão recomendado),
o Renderer roda num contexto **isolado** do Preload. Significa que código
malicioso no Renderer não consegue mexer nas variáveis internas do Preload.

---

### createRequire

Função built-in do Node 12+ pra carregar módulos CommonJS de dentro de
módulos ESM. Usada no NotifyMe quando precisamos importar libs CJS:

```ts
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const cjsLib = require('alguma-lib-cjs')
```

---

### CRUD

Sigla pra **C**reate, **R**ead, **U**pdate, **D**elete — as 4 operações
básicas em qualquer banco de dados. No NotifyMe é o que o `RemindersService`
implementa.

---

### dialog.showMessageBox

API do Electron pra mostrar dialog **nativo** do sistema operacional
(visual do Windows/macOS, não HTML). NotifyMe usa pra confirmações
destrutivas (substitui `window.confirm()` que tem visual feio de browser).

```ts
const result = await dialog.showMessageBox(parent, {
  type: 'warning',
  buttons: ['Cancelar', 'Apagar'],
  message: 'Apagar 5 lembretes?',
  detail: 'Não dá pra desfazer.',
  noLink: true,
})
```

---

### DevTools

Ferramentas do desenvolvedor (a aba que abre com F12 no Chrome).
No Electron em modo dev, abre automaticamente. Mostra console, network,
estado dos componentes Vue.
**Importante**: só mostra logs do Renderer. Logs do Main aparecem no terminal.

---

### Dist

Pasta gerada pelo build, contendo os arquivos finais (compilados):
- `dist/` → código do Vue compilado
- `dist-electron/` → código do Main + Preload
- `release/` → artefatos do electron-builder (.exe, instalador)

---

### Drag region

Conceito do Electron pra `frame: false`. CSS `-webkit-app-region: drag`
marca uma área da janela como **arrastável** (mover a janela). Botões
dentro dela precisam de `-webkit-app-region: no-drag` pra serem clicáveis.
Usado na TitleBar do NotifyMe.

---

### electron-builder

Ferramenta que pega o app Electron + dependências e empacota num `.exe`.
Configuração em `electron-builder.yml`. No NotifyMe gera instalador
NSIS + portable.

---

### electron-store

Lib do sindresorhus que persiste dados num arquivo JSON com **escrita
atômica** (tempfile + rename). Substituiu o SQLite no NotifyMe — veja
o ADR em [decisoes/001-electron-store-vs-sqlite.md](decisoes/001-electron-store-vs-sqlite.md).

---

### Frame: false

Configuração de `BrowserWindow` que remove a barra de título nativa do
SO. Combinado com `titleBarStyle: 'hidden'`, dá controle total visual
pra implementar TitleBar custom. Veja
[12-title-bar-customizada.md](12-title-bar-customizada.md) e
[ADR 002](decisoes/002-frame-false-titulo-customizado.md).

---

### Hot reload (HMR)

Quando você edita um arquivo `.vue` ou `.ts` enquanto `npm run dev` está
rodando, a mudança aparece na janela **sem precisar reiniciar o app**.

---

### HSL (Hue, Saturation, Lightness)

Sistema de cores usado no projeto. Em vez de hexadecimal (`#F97316`),
escrevemos `hsl(24 95% 53%)`.

```css
--primary: 24 95% 53%;          /* laranja vibrante */
.dark { --primary: 24 95% 60%; } /* laranja mais claro p/ dark mode */
```

---

### IPC (Inter-Process Communication)

Como o Main e o Renderer "conversam" entre si. Como eles são processos
separados (não compartilham memória), precisam de mensagens.

- `ipcRenderer.invoke('canal', dados)` — Renderer pede algo ao Main, com resposta
- `ipcMain.handle('canal', async (event, dados) => {...})` — Main responde

Detalhes em [03-ipc.md](03-ipc.md).

---

### isQuitting

Flag em `electron/main.ts` que distingue:
- `false` (padrão): clicar X esconde a janela (app continua na tray)
- `true`: app realmente vai sair (definido pelo "Sair" da tray)

---

### Main Process

O processo Node.js do Electron. Roda no PC do usuário e tem acesso completo
ao SO. Cria janelas, acessa store, dispara notificações, mantém o tray.
Veja [01-arquitetura-electron.md](01-arquitetura-electron.md).

---

### NSIS (Nullsoft Scriptable Install System)

Sistema de instalador pra Windows. O `electron-builder` usa NSIS pra
gerar o `.exe` de instalação que apresenta o wizard.

---

### nativeImage

API do Electron pra trabalhar com imagens (ícones, etc). Usada pelo
tray. No Windows aceita PNG, ICO, JPG, BMP. **Não aceita SVG**.

---

### nodeIntegration

Configuração do Electron. Quando `true`, o Renderer pode usar APIs Node
diretamente. **Inseguro** — não fazemos isso. No NotifyMe está `false`.

---

### OscillatorNode

Nó da Web Audio API que gera uma onda (sine, square, etc). NotifyMe
usa pra gerar as notas dos chimes de alarme. Veja `src/utils/sound.ts`.

---

### Preload

Script que roda **antes** do Renderer carregar, num contexto com acesso ao
Node. Serve de ponte: expõe APIs do Main pro Renderer via `contextBridge`.

---

### ReminderScheduler

Classe em `electron/scheduler/index.ts` que mantém um `Map<id, Timeout>`
de timers `setTimeout`, um pra cada lembrete pendente. Veja
[05-agendamento.md](05-agendamento.md).

---

### Renderer Process

O processo do Chromium do Electron. Roda dentro de uma `BrowserWindow` e
mostra a UI. **NÃO** tem acesso a Node (`nodeIntegration: false`).

---

### shadcn-vue

Sistema de componentes pra Vue 3 (porte do shadcn/ui do React). Define
um padrão de cores via variáveis CSS HSL (light/dark) que o NotifyMe
**copia**. Não usamos a biblioteca completa — só o **sistema de cores**
e inspiração visual pra Select/Input/etc.

---

### shell.openExternal

API do Electron pra abrir URLs no navegador padrão do usuário.
NotifyMe expõe via IPC `system:openExternal` com validação de URL
(só http/https).

---

### Single-instance lock

Mecanismo do Electron pra garantir que só uma instância do app rode
por vez. `app.requestSingleInstanceLock()` retorna `false` se já tem
outra instância.

---

### Singleton (em composables)

Padrão do NotifyMe nos composables `useTimer` e `useStopwatch`: o estado
vive **fora** da função, no escopo do módulo. Toda chamada de
`useTimer()` retorna **as mesmas refs**. Garante que o timer continua
rodando ao trocar de view. Veja
[11-timer-e-cronometro.md](11-timer-e-cronometro.md) seção 3.

---

### Snooze

Adiar um lembrete em N minutos. Implementado como
`updateTriggerAt(now + minutes * 60s)`. Usado pelo botão "Adiar 10 min"
da janela de alerta.

---

### Sound (Web Audio chime)

NotifyMe gera sons de alarme programaticamente via Web Audio API
(OscillatorNode + GainNode com envelope). Funções em `src/utils/sound.ts`:
- `playAlertSound()` — 2 notas suaves pro alerta de lembrete
- `playTimerEndSound()` — 3 notas urgentes pro fim do timer

---

### SQLite

Banco de dados que roda **dentro de um arquivo** (`.db`), sem servidor.
**Não usamos** no NotifyMe (tentamos e desistimos — veja ADR 001).

---

### Stopwatch / Cronômetro

Time-keeping function no NotifyMe que **conta pra cima** a partir de
zero. Implementado em `useStopwatch.ts` com Date.now diff (anti-drift).
Display em `HH:MM:SS.cc`. Veja
[11-timer-e-cronometro.md](11-timer-e-cronometro.md).

---

### Tailwind CSS

Framework CSS utility-first. Em vez de escrever classes próprias, você
combina utilitários: `class="px-4 py-2 bg-primary rounded-md"`.

---

### Teleport (Vue 3)

Recurso nativo do Vue 3 pra "teleportar" o conteúdo de um componente
pra outro lugar do DOM (geralmente `<body>`). Usado em modais e no
Select pra escapar de containers com `overflow: hidden` e ficar acima
de outras layers.

```vue
<Teleport to="body">
  <div class="fixed">...</div>
</Teleport>
```

---

### Timer (countdown)

Time-keeping function no NotifyMe que **conta pra baixo** de um valor
inicial até zero. Quando zera, dispara `playTimerEndSound()` + Notification.
Implementado em `useTimer.ts` com presets + input customizado.

---

### titleBarStyle

Configuração de `BrowserWindow`. `'hidden'` esconde a barra de título
nativa mas mantém área pra controles customizados. Combinado com
`frame: false` pra remover totalmente o frame.

---

### Tray (system tray / bandeja do sistema)

A área no canto inferior direito do Windows com ícones pequenos
(antivírus, OneDrive, etc). NotifyMe fica lá silenciosamente. Veja
[07-tray-e-autostart.md](07-tray-e-autostart.md).

---

### TypeScript

Superset de JavaScript com tipos. Adiciona segurança em tempo de compilação.
O NotifyMe usa TS no Main, no Preload e no Renderer (Vue + TS).

---

### Vite

Build tool moderno. Substitui Webpack. Servidor de dev super rápido (usa
ESM nativo do navegador) e build otimizado pra produção.

---

### vite-plugin-electron

Plugin do Vite que orquestra a build do Main + Preload junto com o Vue.
Configurado em `vite.config.ts`.

---

### vue-tsc

Versão do compilador TypeScript que entende `.vue`. Rodamos no
`npm run build` pra type-check antes de empacotar.

---

### webPreferences

Bloco de configuração de uma `BrowserWindow` que controla o que aquela
janela pode fazer. Onde definimos `preload`, `contextIsolation`, etc.
