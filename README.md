# NotifyMe

> Lembretes desktop persistentes para Windows. Notificações que **não somem** até você marcar como concluído.

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-orange)
![Plataforma](https://img.shields.io/badge/plataforma-Windows%2010%2F11-blue)
![Licença](https://img.shields.io/badge/licença-MIT-green)

## O problema

O Windows tem notificações, mas todas somem sozinhas em poucos segundos. Pra lembretes críticos — "fechar o caixa às 18h", "ligar pro fornecedor", "pagar o DAS do MEI" — isso não funciona. Você precisa de algo que **fique gritando até você reconhecer**.

Apps que existem hoje:
- **Microsoft To Do** — notificação some como qualquer outra
- **Cortana / Alarmes** — mesma limitação
- **Task Scheduler** — solução técnica complexa demais pra usuário leigo

## A solução

Um app desktop pequeno e gratuito que:

- Cria lembretes com data, hora e recorrência
- Quando dispara, abre uma **janela `always-on-top` sem botão de fechar** — só "Concluído" e "Adiar 10 min"
- Roda silencioso na bandeja do sistema
- Inicia junto com o Windows
- Tudo offline, dados locais, zero login, zero servidor

## Stack

- **[Electron](https://www.electronjs.org/)** — empacota um app web como desktop
- **[Vue 3](https://vuejs.org/)** + **TypeScript** — UI
- **[Vite](https://vite.dev/)** — build e dev server
- **[Tailwind CSS](https://tailwindcss.com/)** — estilização
- **better-sqlite3** *(Fase 2)* — banco local
- **node-cron** *(Fase 3)* — agendamento

## Como rodar em desenvolvimento

```bash
git clone https://github.com/BelmanteGu/notifyme.git
cd notifyme
npm install
npm run dev
```

A janela do Electron abre automaticamente com hot-reload conectado ao Vite.

## Roadmap (em fases)

| Fase | O que é | Status |
|---|---|---|
| 0 | Setup base + Electron Hello World | ✅ |
| 1 | UI da lista de lembretes | 🔜 |
| 2 | SQLite + CRUD de lembretes | ⏳ |
| 3 | Agendamento + notificação básica | ⏳ |
| 4 | Janela persistente always-on-top | ⏳ |
| 5 | Tray + auto-start | ⏳ |
| 6 | Build .exe + release | ⏳ |
| 7 | Polimento + ícone + screenshots | ⏳ |

## Documentação

A pasta [`docs/`](docs/) tem documentação densa e didática de cada decisão:

- [00 — Visão geral](docs/00-visao-geral.md)
- [01 — Arquitetura do Electron](docs/01-arquitetura-electron.md)
- [09 — Glossário](docs/09-glossario.md)

Mais docs vão sendo adicionadas conforme as fases avançam.

## Contribuir

O projeto é open source (MIT) e aceita contribuições. Por enquanto, ainda em desenvolvimento ativo — abra uma issue antes de mandar PR pra alinhar escopo.

## Doações

Se o NotifyMe te ajuda, considere apoiar o projeto. *(Botão de doação será adicionado na Fase 7.)*

## Licença

MIT — veja [LICENSE](LICENSE).
