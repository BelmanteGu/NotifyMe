# 09 — Glossário

> Termos novos que aparecem ao longo do projeto NotifyMe. Volte aqui sempre que esbarrar em algo desconhecido.

---

### App (em Electron)

Objeto principal do Electron. Representa o ciclo de vida do aplicativo:
quando inicia, quando todas as janelas fecham, quando o usuário tenta sair.

```ts
import { app } from 'electron'
app.whenReady().then(() => { /* criar janela */ })
```

---

### BrowserWindow

A "janela" de um app Electron. Cada `new BrowserWindow(...)` cria uma janela
nova com seu próprio Renderer. Você pode ter várias (a janela principal +
as notificações persistentes que abrem na hora certa, na Fase 4).

---

### Build

Processo de compilar o código-fonte (TypeScript, Vue, etc) em arquivos prontos
pra rodar. No NotifyMe:
- `npm run build` → compila Vue + Electron pra `dist/` e `dist-electron/`
- `electron-builder` (Fase 6) → empacota tudo num `.exe`

---

### contextBridge

API do Electron usada no Preload pra expor funções do Main pro Renderer
de forma controlada. Sem isso, o Renderer não consegue chamar nada do Main.

```ts
// preload.ts
contextBridge.exposeInMainWorld('notifyme', {
  criarLembrete: (data) => ipcRenderer.invoke('reminder:create', data),
})
// Agora no Renderer: window.notifyme.criarLembrete({ titulo: 'Pagar conta' })
```

---

### contextIsolation

Configuração de segurança do Electron. Quando `true` (padrão recomendado),
o Renderer roda num contexto **isolado** do Preload. Significa que código
malicioso no Renderer não consegue mexer nas variáveis internas do Preload.

---

### CRUD

Sigla pra **C**reate, **R**ead, **U**pdate, **D**elete — as 4 operações
básicas em qualquer banco de dados. Quando alguém fala "preciso fazer o
CRUD de lembretes", quer dizer "preciso conseguir criar, listar, atualizar
e apagar lembretes".

---

### DevTools

Ferramentas do desenvolvedor (a aba que abre com F12 no Chrome).
No Electron em modo dev, abre automaticamente. Mostra console, network,
estado dos componentes Vue (com a extensão Vue DevTools).
**Importante**: só mostra logs do Renderer. Logs do Main aparecem no terminal.

---

### Dist

Pasta gerada pelo build, contendo os arquivos finais (compilados).
No NotifyMe:
- `dist/` → código do Vue compilado (HTML/CSS/JS final)
- `dist-electron/` → código do Main + Preload compilado

Essa pasta entra no `.gitignore` — nunca é commitada.

---

### Electron Builder

Ferramenta que pega o app Electron + dependências e empacota num `.exe`
(ou `.dmg` no Mac, `.AppImage` no Linux) pronto pra distribuir.
Configuração na Fase 6.

---

### Hot reload (HMR — Hot Module Replacement)

Quando você edita um arquivo `.vue` ou `.ts` enquanto `npm run dev` está
rodando, a mudança aparece na janela **sem precisar reiniciar o app**.
Mágica do Vite. No Main process, o hot reload reinicia o processo
inteiro (não tem como recarregar Node "no ar" sem reiniciar).

---

### HSL (Hue, Saturation, Lightness)

Sistema de cores usado no projeto (igual ao Cliloop). Em vez de hexadecimal
(`#F97316`), a gente escreve `hsl(24 95% 53%)`. Mais fácil de manipular —
quer escurecer? só muda o último número.

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

Detalhes em [03-ipc.md](03-ipc.md) (Fase 2).

---

### Main Process

O processo Node.js do Electron. Roda no PC do usuário e tem acesso completo
ao SO. Cria janelas, acessa banco, dispara notificações. Veja [01-arquitetura-electron.md](01-arquitetura-electron.md).

---

### node-cron

Biblioteca npm que roda funções em horários agendados, usando sintaxe cron
(ex: `'0 9 * * 1-5'` = todo dia útil às 9h). Vamos usar na Fase 3 pra disparar
lembretes.

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

### Renderer Process

O processo do Chromium do Electron. Roda dentro de uma `BrowserWindow` e
mostra a UI. É basicamente uma página web. **NÃO** tem acesso a Node
(quando `nodeIntegration: false`, que é o padrão seguro).

---

### shadcn-vue

Sistema de componentes pra Vue 3 (porte do shadcn/ui do React). Define
um padrão de cores via variáveis CSS HSL (light/dark) que o NotifyMe
**copia** do Cliloop. Não vamos instalar a biblioteca inteira — só
copiamos o **sistema de cores**.

---

### SQLite

Banco de dados que roda **dentro de um arquivo** (`.db`), sem servidor.
Perfeito pra app desktop: sem instalação, super rápido, suporta SQL
completo. Vamos usar `better-sqlite3` na Fase 2.

---

### Tailwind CSS

Framework CSS utility-first. Em vez de escrever classes próprias, você
combina utilitários: `class="px-4 py-2 bg-primary rounded-md"`. Mesmo
sistema do Cliloop.

---

### Tray (system tray / bandeja do sistema)

A área no canto inferior direito do Windows com ícones pequenos
(antivírus, OneDrive, etc). Apps podem ficar lá silenciosamente. NotifyMe
vai usar isso na Fase 5.

---

### TypeScript

Superset de JavaScript com tipos. Adiciona segurança em tempo de compilação.
O NotifyMe usa TS no Main, no Preload e no Renderer (Vue + TS).

---

### Vite

Build tool moderno. Substitui Webpack. Servidor de dev super rápido (usa
ESM nativo do navegador) e build otimizado pra produção. Mesmo do Cliloop.

---

### vite-plugin-electron

Plugin do Vite que orquestra a build do Main + Preload junto com o Vue.
Sem ele, você teria que ter dois ou três processos de build separados.
Configurado em `vite.config.ts`.

---

### vue-tsc

Versão do compilador TypeScript que entende `.vue`. O TS padrão dá erro
em arquivos `.vue`; o `vue-tsc` resolve. Rodamos no `npm run build` pra
type-check antes de empacotar.

---

### webPreferences

Bloco de configuração de uma `BrowserWindow` que controla o que aquela
janela pode fazer. Onde definimos `preload`, `contextIsolation`, etc.
Veja [01-arquitetura-electron.md](01-arquitetura-electron.md) seção 4.
