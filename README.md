# NotifyMe

> Lembretes desktop persistentes para Windows. Notificações que **não somem** até você confirmar.

![Status](https://img.shields.io/badge/status-MVP%20funcional-orange)
![Plataforma](https://img.shields.io/badge/plataforma-Windows%2010%2F11-blue)
![Licença](https://img.shields.io/badge/licen%C3%A7a-MIT-green)
![Versão](https://img.shields.io/badge/vers%C3%A3o-0.0.1-blue)

## O problema

O Windows tem notificações, mas todas somem em ~5 segundos. Pra lembretes críticos — "fechar o caixa às 18h", "ligar pro fornecedor", "pagar o DAS do MEI" — isso não funciona. Você precisa de algo que **fique visível até você reconhecer**.

Apps que existem hoje:
- **Microsoft To Do** — notificação some como qualquer outra
- **Cortana / Alarmes** — mesma limitação
- **Task Scheduler do Windows** — solução técnica complexa demais pra usuário leigo

## A solução

Um app desktop pequeno e gratuito que:

- Cria lembretes com data, hora, descrição e recorrência (uma vez / todo dia / toda semana)
- Quando dispara, abre uma **janela `always-on-top` sem botão de fechar** — só "Concluído" e "Adiar 10 min"
- Roda silencioso na bandeja do sistema
- Inicia junto com o Windows
- Tudo offline, dados locais, zero login, zero servidor

## Stack

- **[Electron 33](https://www.electronjs.org/)** — empacota um app web como desktop
- **[Vue 3](https://vuejs.org/)** + **TypeScript** — UI
- **[Vite 6](https://vite.dev/)** — build e dev server
- **[Tailwind 3](https://tailwindcss.com/)** — estilização (paleta laranja, sistema HSL light/dark)
- **[electron-store](https://github.com/sindresorhus/electron-store)** — persistência JSON com escrita atômica
- **[lucide-vue-next](https://lucide.dev/)** — ícones
- **[electron-builder](https://www.electron.build/)** — empacotamento `.exe`

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

Output em `release/0.0.1/`. Veja [docs/08-build-e-release.md](docs/08-build-e-release.md) pra detalhes.

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
| — | Ícones próprios + screenshots + smoke-test | 🚧 |

## Documentação

A pasta [`docs/`](docs/) tem documentação densa e didática de cada parte do projeto:

- [00 — Visão geral](docs/00-visao-geral.md) — motivação, decisões grandes, persona-alvo
- [01 — Arquitetura do Electron](docs/01-arquitetura-electron.md) — Main vs Renderer, Preload, IPC
- [02 — Vue dentro do Electron](docs/02-vue-dentro-electron.md) — como Vue + Vite + Tailwind se encaixam
- [03 — IPC](docs/03-ipc.md) — comunicação Renderer ↔ Main detalhada
- [04 — Persistência](docs/04-persistencia.md) — por que electron-store em vez de SQLite (saga real)
- [05 — Agendamento](docs/05-agendamento.md) — setTimeout, recorrência, edge cases
- [06 — Notificação persistente](docs/06-notificacao-persistente.md) — a feature-killer do app
- [07 — Tray e auto-start](docs/07-tray-e-autostart.md) — como rodar em background
- [08 — Build e release](docs/08-build-e-release.md) — empacotando e publicando
- [09 — Glossário](docs/09-glossario.md) — todos os termos técnicos
- [decisoes/](docs/decisoes/) — Architectural Decision Records (ADRs)

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

Toda doação ajuda a manter o projeto ativo e responder issues.

## Contribuir

Contribuições são bem-vindas. Antes de mandar PR, abra uma **issue** descrevendo o que pretende fazer — pra alinharmos escopo. Não temos CI ainda; rode `npm run build` antes de submeter pra garantir que tudo compila.

Bugs? Abre [aqui](https://github.com/BelmanteGu/notifyme/issues).

## Licença

[MIT](LICENSE) — pode usar, modificar e distribuir livremente.
