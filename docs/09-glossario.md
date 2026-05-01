# 09 — Glossário

> Termos novos que aparecem ao longo do projeto NotifyMe. Volte aqui sempre que esbarrar em algo desconhecido.

---

### ADR (Architectural Decision Record)

Documento curto que registra uma decisão arquitetural importante:
contexto, alternativas consideradas, decisão tomada, consequências.
No NotifyMe ficam em `docs/decisoes/`. Exemplo:
[001-electron-store-vs-sqlite.md](decisoes/001-electron-store-vs-sqlite.md).

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

### BrowserWindow

A "janela" de um app Electron. Cada `new BrowserWindow(...)` cria uma janela
nova com seu próprio Renderer. No NotifyMe há a janela main (`createMainWindow`)
e janelas de alerta persistente (`openAlertWindow`).

---

### Build

Processo de compilar o código-fonte (TypeScript, Vue, etc) em arquivos prontos
pra rodar. No NotifyMe:
- `npm run build` → compila Vue + Electron pra `dist/` e `dist-electron/`
- `npm run dist` → compila + empacota num `.exe` via electron-builder

---

### contextBridge

API do Electron usada no Preload pra expor funções do Main pro Renderer
de forma controlada. Sem isso, o Renderer não consegue chamar nada do Main.

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

Mais robusto que `import` em ESM importando CJS (que pode falhar com
named exports não detectados).

---

### CRUD

Sigla pra **C**reate, **R**ead, **U**pdate, **D**elete — as 4 operações
básicas em qualquer banco de dados. No NotifyMe é o que o `RemindersService`
implementa: criar, listar/buscar, atualizar (markCompleted, snooze,
updateTriggerAt), deletar.

---

### DevTools

Ferramentas do desenvolvedor (a aba que abre com F12 no Chrome).
No Electron em modo dev, abre automaticamente. Mostra console, network,
estado dos componentes Vue.
**Importante**: só mostra logs do Renderer. Logs do Main aparecem no terminal.

---

### Dist

Pasta gerada pelo build, contendo os arquivos finais (compilados):
- `dist/` → código do Vue compilado (HTML/CSS/JS final)
- `dist-electron/` → código do Main + Preload compilado
- `release/` → artefatos do electron-builder (.exe, instalador)

Todas estão no `.gitignore`.

---

### electron-builder

Ferramenta que pega o app Electron + dependências e empacota num `.exe`
(ou `.dmg` no Mac, `.AppImage` no Linux). Configuração em
`electron-builder.yml`. No NotifyMe gera:
- Instalador NSIS (`NotifyMe-Setup-X.Y.Z.exe`)
- Portable single-file (`NotifyMe-X.Y.Z-portable.exe`)

---

### electron-store

Lib do sindresorhus que persiste dados num arquivo JSON com **escrita
atômica** (tempfile + rename). Substituiu o SQLite no NotifyMe — veja
o ADR em [decisoes/001-electron-store-vs-sqlite.md](decisoes/001-electron-store-vs-sqlite.md).

---

### Hot reload (HMR)

Quando você edita um arquivo `.vue` ou `.ts` enquanto `npm run dev` está
rodando, a mudança aparece na janela **sem precisar reiniciar o app**.
Mágica do Vite. No Main process, o hot reload reinicia o processo
inteiro.

---

### HSL (Hue, Saturation, Lightness)

Sistema de cores usado no projeto. Em vez de hexadecimal (`#F97316`),
escrevemos `hsl(24 95% 53%)`. Mais fácil de manipular — quer escurecer?
só muda o último número.

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
gerar o `.exe` de instalação que apresenta o wizard ("Próximo, Próximo,
Concluir"). Configurado em `electron-builder.yml`.

---

### nativeImage

API do Electron pra trabalhar com imagens (ícones, etc). Usada pelo
tray:
```ts
const icon = nativeImage.createFromPath('build/tray-icon.png')
new Tray(icon)
```

No Windows aceita PNG, ICO, JPG, BMP. **Não aceita SVG** (limitação real
da plataforma).

---

### nodeIntegration

Configuração do Electron. Quando `true`, o Renderer pode usar APIs Node
diretamente. **Inseguro** — não fazemos isso. No NotifyMe está `false`.

---

### Preload

Script que roda **antes** do Renderer carregar, num contexto com acesso ao
Node. Serve de ponte: expõe APIs do Main pro Renderer via `contextBridge`.
Em `electron/preload.ts`.

---

### ReminderScheduler

Classe em `electron/scheduler/index.ts` que mantém um `Map<id, Timeout>`
de timers `setTimeout`, um pra cada lembrete pendente. Quando o timer
dispara, chama o callback `onTrigger` (que mostra notificação + abre
janela de alerta) e cuida da lógica de recorrência.

Veja [05-agendamento.md](05-agendamento.md).

---

### Renderer Process

O processo do Chromium do Electron. Roda dentro de uma `BrowserWindow` e
mostra a UI. É basicamente uma página web. **NÃO** tem acesso a Node
(quando `nodeIntegration: false`, que é o padrão seguro).

---

### shadcn-vue

Sistema de componentes pra Vue 3 (porte do shadcn/ui do React). Define
um padrão de cores via variáveis CSS HSL (light/dark) que o NotifyMe
**copia** do Cliloop. Não usamos a biblioteca completa — só o
**sistema de cores**.

---

### shell.openExternal

API do Electron pra abrir URLs no navegador padrão do usuário (Chrome,
Firefox, Edge), em vez de tentar carregar dentro do próprio app.
Usado no AboutModal pra abrir links pro GitHub e pra doação.

```ts
import { shell } from 'electron'
shell.openExternal('https://github.com/BelmanteGu/notifyme')
```

No NotifyMe vai exposto via IPC `system:openExternal` com validação
de URL (só http/https aceitos).

---

### Single-instance lock

Mecanismo do Electron pra garantir que só uma instância do app rode
por vez. `app.requestSingleInstanceLock()` retorna `false` se já tem
outra instância — nesse caso a nova encerra e a primeira recebe um
evento `'second-instance'` pra trazer a janela em foco.

No NotifyMe é importante porque:
- Sem isso, `npm run dev` reiniciando podia gerar 2 instâncias
- Usuário clicando atalho 2x abriria 2 janelas

---

### Snooze

Adiar um lembrete em N minutos. Implementado como
`updateTriggerAt(now + minutes * 60s)`. Usado pelo botão "Adiar 10 min"
da janela de alerta.

---

### SQLite

Banco de dados que roda **dentro de um arquivo** (`.db`), sem servidor.
**Não usamos** no NotifyMe (tentamos e desistimos — veja ADR 001), mas
o termo aparece nas docs porque é a alternativa "óbvia" que rejeitamos.

---

### Tailwind CSS

Framework CSS utility-first. Em vez de escrever classes próprias, você
combina utilitários: `class="px-4 py-2 bg-primary rounded-md"`.

---

### Tray (system tray / bandeja do sistema)

A área no canto inferior direito do Windows com ícones pequenos
(antivírus, OneDrive, etc). NotifyMe fica lá silenciosamente após
fechar a janela. Veja [07-tray-e-autostart.md](07-tray-e-autostart.md).

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
Sem ele, você teria que ter três processos de build separados.
Configurado em `vite.config.ts`.

---

### vue-tsc

Versão do compilador TypeScript que entende `.vue`. Rodamos no
`npm run build` pra type-check antes de empacotar.

---

### webPreferences

Bloco de configuração de uma `BrowserWindow` que controla o que aquela
janela pode fazer. Onde definimos `preload`, `contextIsolation`, etc.
Veja [01-arquitetura-electron.md](01-arquitetura-electron.md) seção 4.
