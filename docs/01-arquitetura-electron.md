# 01 — Arquitetura do Electron

> **A coisa mais importante de Electron.** Se você só ler uma doc do projeto, leia essa.

---

## 1. O Electron é dois mundos

Quando você abre um app Electron, **dois processos começam a rodar ao mesmo tempo**:

```
┌─────────────────────────────────────────────────┐
│                  APP ELECTRON                    │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │      MAIN PROCESS  (Node.js puro)        │   │
│  │  ─────────────────────────────────────   │   │
│  │  • Cria janelas                          │   │
│  │  • Acessa sistema de arquivos            │   │
│  │  • Acessa banco de dados                 │   │
│  │  • Notificações nativas                  │   │
│  │  • Menus, tray, atalhos globais          │   │
│  │  • Tem TODOS os privilégios do SO        │   │
│  └──────────────────────────────────────────┘   │
│                      ↕  IPC  ↕                   │
│  ┌──────────────────────────────────────────┐   │
│  │   RENDERER PROCESS  (navegador Chromium) │   │
│  │  ─────────────────────────────────────   │   │
│  │  • Mostra a UI (HTML/CSS/JS — Vue)       │   │
│  │  • Roda como uma página web              │   │
│  │  • NÃO acessa SO diretamente             │   │
│  │  • Pra qualquer coisa de SO, pede ao     │   │
│  │    Main via IPC                          │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

**Por que essa divisão existe?**

Por **segurança**. Se você abrir uma página web num navegador comum, ela não pode deletar arquivos do seu PC. O Electron mantém esse modelo: a "página web" (Renderer) **não pode** acessar Node.js. Só o Main pode. Se a página fosse comprometida (XSS, injeção), ela não consegue formatar seu HD.

---

## 2. Mapeando isso no NotifyMe

| Pasta/arquivo | Roda em qual processo? | Pra que serve |
|---|---|---|
| `electron/main.ts` | **Main** | Cria a janela, vai gerenciar SQLite, cron, notificações |
| `electron/preload.ts` | **Preload** (ponte) | Expõe APIs seguras pro Renderer chamar |
| `src/main.ts` | **Renderer** | Inicializa o Vue |
| `src/App.vue` e tudo em `src/` | **Renderer** | UI |
| `index.html` | **Renderer** | Página HTML carregada na janela |

> **Dica de mnemônico**: `electron/` = Main, `src/` = Renderer.

---

## 3. O que cada processo PODE e NÃO PODE

### Main Process

✅ **PODE** fazer:
- `import fs from 'node:fs'` — ler/escrever arquivos
- `import { Notification } from 'electron'` — notificação nativa
- `import sqlite from 'better-sqlite3'` — banco de dados
- `import cron from 'node-cron'` — agendamento
- `import { Tray } from 'electron'` — bandeja do sistema
- `import { app } from 'electron'` — controlar o ciclo de vida do app

❌ **NÃO PODE**:
- Renderizar HTML/CSS direto (precisa criar uma `BrowserWindow` que carrega o Renderer)
- Usar APIs do navegador (`document`, `window`, `localStorage`)

### Renderer Process

✅ **PODE** fazer:
- Tudo que Vue + DOM permitem
- `fetch()` chamadas HTTP (se precisar)
- `localStorage`, `sessionStorage`
- Animações CSS, manipular DOM, etc

❌ **NÃO PODE** (com a config segura padrão):
- `import fs` — vai dar erro
- Acessar SQLite diretamente
- Disparar notificação nativa direto
- Mexer em arquivos do PC

**Como o Renderer faz coisas que precisam do Main?** Via **IPC** (Inter-Process Communication). Veja [03-ipc.md](03-ipc.md).

---

## 4. Mas… e o Preload?

O **Preload** é um terceiro arquivo que serve de **ponte segura** entre Main e Renderer.

```
Renderer (Vue)     ──┐
                     │   pode chamar
                     ↓
       window.notifyme.criarLembrete(...)
                     │
                     │   é exposto por
                     ↓
Preload (preload.ts) ─┐
                      │   chama o Main via
                      ↓
              ipcRenderer.invoke('reminder:create', ...)
                      │
                      │   é tratado pelo
                      ↓
Main (main.ts)      ──┘
                      ↓
              ipcMain.handle('reminder:create', ...)
                      ↓
                INSERT INTO reminders ...
```

O Preload roda num contexto **com acesso a Node**, mas é o único lugar onde o Renderer pode "tocar" no Node — e o que o Preload expõe é o que você decide. Toda função exposta é uma "API pública" do Main pro Renderer.

**Por que não dar acesso direto a Node ao Renderer?** Porque qualquer dependência malicioso do `npm` que aparecer no Vue conseguiria deletar arquivos. Com Preload + IPC, você controla **exatamente** o que o Renderer pode fazer.

No NotifyMe, a config está em `electron/main.ts` linha ~50:

```ts
webPreferences: {
  preload: path.join(__dirname, 'preload.mjs'),
  contextIsolation: true,    // ← isola contextos
  nodeIntegration: false,    // ← Renderer NÃO acessa Node
}
```

Essa é a **configuração segura recomendada pelo time do Electron**. Algumas docs antigas mostram `nodeIntegration: true` — não faça isso. É inseguro e gera vulnerabilidades famosas.

---

## 5. Comparação com Cliloop

Se você vem do Cliloop (Vue 3 + Firebase), a analogia é:

| Cliloop | Electron |
|---|---|
| Frontend (Vue no navegador) | **Renderer** (Vue dentro da janela do Electron) |
| Cloud Functions (Node no Firebase) | **Main** (Node no PC do usuário) |
| `httpsCallable('foo')(args)` | `window.notifyme.foo(args)` (via IPC) |
| Firestore SDK no frontend | **Não existe** — banco fica no Main |

A diferença chave: no Cliloop o "backend" tá num servidor longe; no NotifyMe o "backend" é o **mesmo PC do usuário**. Mas a **separação de responsabilidades é igual**: lógica sensível e dados ficam no "backend", UI no "frontend".

---

## 6. Como o ciclo de vida funciona

Quando você roda `npm run dev`:

```
1. Vite sobe servidor de desenvolvimento (ex: localhost:5173)
2. vite-plugin-electron compila electron/main.ts → dist-electron/main.js
3. vite-plugin-electron compila electron/preload.ts → dist-electron/preload.mjs
4. Electron inicia → executa dist-electron/main.js
5. main.ts chama new BrowserWindow(...) e carrega localhost:5173
6. Janela abre mostrando o Vue rodando do Vite
7. Hot reload conectado: editar src/* → atualiza Renderer instantaneamente
                          editar electron/* → reinicia Main
```

Quando você roda `npm run build` (na Fase 6):

```
1. Vite faz build do Vue → pasta dist/
2. Vite compila Main + Preload → pasta dist-electron/
3. electron-builder empacota tudo num .exe
4. .exe distribuível, sem precisar de Node instalado no PC do usuário
```

---

## 7. Erros comuns de iniciante

### Erro 1 — Tentar usar `import fs` no Vue

```ts
// src/views/Home.vue
import fs from 'node:fs'  // ❌ NÃO FUNCIONA
fs.readFileSync(...)
```

**Por quê não funciona**: o Renderer roda no Chromium, que não tem Node.

**Como fazer certo**: expor uma função no Preload que lê o arquivo no Main, e chamar via `window.notifyme.lerArquivo()`.

### Erro 2 — Achar que `console.log` no Main aparece no DevTools

Não aparece. O DevTools mostra logs do **Renderer** (porque é Chromium).

Logs do Main aparecem no **terminal** onde você rodou `npm run dev`.

### Erro 3 — Tentar abrir o `index.html` direto no navegador

Não vai funcionar. O `index.html` espera estar dentro do Electron com o Preload carregado. Sempre rode `npm run dev`.

---

## 8. Ler a seguir

- [03 — IPC: como Renderer e Main conversam](03-ipc.md) — *(será criado na Fase 2)*
- [04 — Banco SQLite no Main](04-banco-sqlite.md) — *(será criado na Fase 2)*
- [09 — Glossário](09-glossario.md) — pra revisar termos novos
