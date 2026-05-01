# NotifyMe

> Lembretes desktop persistentes para Windows. Notificações que **não somem** até você confirmar. Inclui também Timer (Pomodoro) e Cronômetro.

![Status](https://img.shields.io/badge/status-MVP%20funcional-orange)
![Plataforma](https://img.shields.io/badge/plataforma-Windows%2010%2F11-blue)
![Licença](https://img.shields.io/badge/licen%C3%A7a-MIT-green)
![Versão](https://img.shields.io/badge/vers%C3%A3o-0.0.1-blue)

## O problema

O Windows tem notificações, mas todas somem em ~5 segundos. Pra lembretes críticos — "fechar o caixa às 18h", "ligar pro fornecedor", "pagar o DAS do MEI" — isso não funciona. Você precisa de algo que **fique visível até você reconhecer**.

## A solução

App desktop pequeno e gratuito, com **3 funcionalidades** integradas:

### 🔔 Lembretes que não somem
- Cria lembretes com data, hora, descrição e recorrência (uma vez / todo dia / toda semana)
- Quando dispara, abre uma **janela `always-on-top` sem botão de fechar** — só "Concluído" e "Adiar 10 min"
- Visual estilo macOS Sequoia (glassmorphism, cantos arredondados, gradient sutil)
- Estado "atrasado" destacado em vermelho pra lembretes pendentes que passaram do horário

### ⏲️ Timer (Pomodoro)
- Presets rápidos: 5, 10, 15, 25, 50, 90 min
- **Input personalizado** pra qualquer duração (1-999 min)
- Display circular animado com progress ring
- Som ao zerar (chime gerado via Web Audio API, sem arquivo externo)

### ⏱️ Cronômetro
- Conta pra cima com precisão de centésimos
- Start / Pause / Reset
- Anti-drift (usa `Date.now() - startedAt` em vez de `+= ms`)

## Outras features

- **Tray icon + auto-start com Windows** — app fica rodando em background, lembretes disparam mesmo com janela fechada
- **Title bar customizada** estilo macOS (sem barra cinza nativa do Windows)
- **Tema light/dark** com toggle no app, detecta preferência do SO no primeiro boot
- **Tudo offline** — dados em `%APPDATA%\notifyme\data.json`, zero login, zero servidor
- **Modais de confirmação nativos** do sistema (`dialog.showMessageBox`, não `window.confirm()` feio)
- **Dropdown custom** com Teleport (sempre por cima de modais, sem corte de overflow)

## Stack

- **[Electron 33](https://www.electronjs.org/)** + **[Vue 3](https://vuejs.org/)** + **TypeScript**
- **[Vite 6](https://vite.dev/)** com `vite-plugin-electron`
- **[Tailwind 3](https://tailwindcss.com/)** com sistema HSL light/dark inspirado em shadcn-vue
- **[electron-store](https://github.com/sindresorhus/electron-store)** — persistência JSON com escrita atômica
- **[lucide-vue-next](https://lucide.dev/)** — ícones
- **[electron-builder](https://www.electron.build/)** — empacotamento `.exe` (NSIS + portable)
- **Web Audio API** — sons de alarme gerados programaticamente

Bundle final: **~40KB gzip** (Renderer) + **~12KB** (Main) + Electron runtime (~80MB no `.exe`).

## Como rodar em desenvolvimento

```bash
git clone https://github.com/BelmanteGu/notifyme.git
cd notifyme
npm install
npm run dev
```

A janela do Electron abre automaticamente com hot-reload.

## Como gerar o `.exe`

```bash
npm run dist          # gera instalador NSIS + portable
npm run dist:portable # só portable (single-file .exe)
npm run dist:dir      # só pasta unpacked (rápido pra testar)
```

Output em `release/0.0.1/`. Veja [docs/08-build-e-release.md](docs/08-build-e-release.md) pra detalhes (incluindo a pegadinha do "Cannot create symbolic link" no Windows e como resolver).

## Roadmap

| Fase | Funcionalidade | Status |
|---|---|---|
| 0 | Setup base (Electron + Vue + Vite + Tailwind) | ✅ |
| 1 | UI da lista de lembretes | ✅ |
| 2 | Persistência local (electron-store) | ✅ |
| 3 | Agendamento + notificação nativa | ✅ |
| 4 | Janela persistente always-on-top | ✅ |
| 5 | Tray + auto-iniciar com Windows | ✅ |
| 6 | Build `.exe` + scripts de release | ✅ |
| 7 | Polimento (versão dinâmica, dialog Sobre, doação) | ✅ |
| Extra | Redesign visual glassmorphism Apple-like | ✅ |
| Extra | Timer + Cronômetro + Som via Web Audio | ✅ |
| Extra | Title bar customizada + scrollbar custom | ✅ |
| Extra | Select com Teleport + modal de confirmação nativo | ✅ |
| — | Ícones próprios + screenshots + smoke-test | 🚧 |

## Documentação

A pasta [`docs/`](docs/) tem documentação densa e didática de cada parte do projeto:

### Conceitos
- [00 — Visão geral](docs/00-visao-geral.md) — motivação, decisões grandes, persona-alvo
- [01 — Arquitetura do Electron](docs/01-arquitetura-electron.md) — Main vs Renderer, Preload, IPC
- [02 — Vue dentro do Electron](docs/02-vue-dentro-electron.md) — estrutura completa do código
- [03 — IPC](docs/03-ipc.md) — comunicação Renderer ↔ Main detalhada
- [09 — Glossário](docs/09-glossario.md) — todos os termos técnicos

### Features
- [04 — Persistência](docs/04-persistencia.md) — por que electron-store em vez de SQLite (saga real)
- [05 — Agendamento](docs/05-agendamento.md) — setTimeout, recorrência, edge cases
- [06 — Notificação persistente](docs/06-notificacao-persistente.md) — a feature-killer do app
- [07 — Tray e auto-start](docs/07-tray-e-autostart.md) — como rodar em background
- [08 — Build e release](docs/08-build-e-release.md) — empacotando e publicando
- [10 — Componentes UI](docs/10-componentes-ui.md) — Select, Sidebar, TitleBar, etc
- [11 — Timer e Cronômetro](docs/11-timer-e-cronometro.md) — composables singleton + Web Audio
- [12 — Title bar customizada](docs/12-title-bar-customizada.md) — frame:false + IPC controls

### Decisões arquiteturais (ADRs)
- [001 — electron-store em vez de SQLite](docs/decisoes/001-electron-store-vs-sqlite.md)
- [002 — frame:false e título customizado](docs/decisoes/002-frame-false-titulo-customizado.md)
- [003 — Select customizado em vez de nativo](docs/decisoes/003-select-customizado.md)

## SmartScreen warning ao instalar

O instalador **não é assinado digitalmente** (certificados de assinatura custam $200-400/ano). Quando você executar o `.exe`, o Windows mostra:

> **O Windows protegeu seu PC**
> O Microsoft Defender SmartScreen impediu a inicialização de um aplicativo não reconhecido.

Pra prosseguir: clique em **"Mais informações"** → **"Executar mesmo assim"**.

Isso é normal pra apps open source pequenos. O código está aberto neste repo — pode auditar antes de instalar se preferir.

## Apoiar o projeto

O NotifyMe é gratuito e open source. Se ele te ajuda no dia a dia, considere uma doação:

- **[GitHub Sponsors](https://github.com/sponsors/BelmanteGu)** — recorrente mensal
- **[Ko-fi](https://ko-fi.com/belmantegu)** — pagamento único

## Contribuir

Contribuições são bem-vindas. Antes de mandar PR, abra uma **issue** descrevendo o que pretende fazer — pra alinharmos escopo. Rode `npm run build` antes de submeter pra garantir que tudo compila.

Bugs? Abre [aqui](https://github.com/BelmanteGu/notifyme/issues).

## Licença

[MIT](LICENSE) — pode usar, modificar e distribuir livremente.
