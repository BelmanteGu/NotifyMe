# Changelog

Todas as mudanças notáveis são documentadas aqui.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Adicionado
- **Timer (Pomodoro)** com presets 5/10/15/25/50/90 min e input personalizado (1-999 min). Display circular com progress ring SVG. Som de alarme ao zerar (3 notas geradas via Web Audio API).
- **Cronômetro** com precisão de centésimos. Anti-drift via `Date.now() - startedAt`.
- **Sidebar** lateral à esquerda navegando entre Lembretes / Timer / Cronômetro. Item ativo elevado com `bg-card + shadow-soft`. Footer da sidebar tem botão "Sobre" + ThemeToggle.
- **Title bar customizada** estilo macOS — `frame: false`, sem File/Edit/View/Window/Help. Botões minimize/maximize/close próprios via IPC. Drag region funcional.
- **Som de alarme** quando lembrete dispara (2 notas C5+E5 suaves) — Web Audio API, zero arquivos externos.
- **Modal de confirmação nativo** do sistema operacional via `dialog.showMessageBox` (substitui o feio `window.confirm()` do navegador).
- **Componente `<Select>` customizado** em `src/components/ui/Select.vue` com Teleport pro `<body>` (sempre acima de modais, ignora overflow:hidden), keyboard navigation completa, glassmorphism.
- **Sino animado** (`bell-ring`) no estado vazio da tab Pendentes.
- **Inputs de data e hora digitáveis** com mask `DD/MM/AAAA` e `HH:MM` em vez de `<input type="date">` nativo confuso.
- **Border radius 12px** na janela toda (estilo macOS Sequoia).
- **Scrollbar customizada** fina, semi-transparente, modo overlay onde suportado (não empurra conteúdo).
- **Inputs estilo shadcn-vue** com focus ring laranja, altura uniforme `h-10`.
- **Background gradient radial laranja** sutil no app + variação mais marcante no AlertView.
- **Animação de entrada** no AlertView (scale + fade-in 0.28s ease-out).
- 4 docs novos:
  - `docs/10-componentes-ui.md` — Select, Sidebar, TitleBar, EmptyState, etc
  - `docs/11-timer-e-cronometro.md` — composables singleton + Web Audio
  - `docs/12-title-bar-customizada.md` — frame:false + IPC controls
- 2 ADRs novos:
  - `docs/decisoes/002-frame-false-titulo-customizado.md`
  - `docs/decisoes/003-select-customizado.md`

### Modificado
- **Redesign visual completo** com glassmorphism, gradient laranja, ícones com gradient + glow, tipografia hierárquica.
- App.vue virou shell (TitleBar + Sidebar + view switcher), conteúdo de lembretes movido pra `RemindersView.vue`.
- Tabs Pendentes/Concluídos refatoradas pra estilo pill segmentada (iOS-like).
- Travessões "—" removidos dos textos visíveis pro usuário (mantidos em comentários de código).
- Border radius geral aumentado: sm 14px, md 18px, lg 24px, xl 32px.

### Faltando para o primeiro release público
- Ícone próprio (`build/icon.ico` e `build/tray-icon.png`) — veja `build/CRIAR_ICONES.md`
- Screenshots no README
- Smoke-test final em PC limpo

## [0.0.1] - 2026-05-01

Primeiro MVP funcional.

### Adicionado
- **Persistência**: lembretes salvos em `%APPDATA%\notifyme\data.json` via `electron-store` (escrita atômica, imune a OneDrive/Defender)
- **CRUD completo**: criar, listar, marcar como concluído, snooze (adiar 10 min), excluir, limpar todos os concluídos
- **UI principal** com tabs Pendentes / Concluídos, contadores, empty states distintos
- **Tema light/dark** com persistência em localStorage e detecção de preferência do SO
- **Agendamento** via setTimeout — dispara no horário exato (ms de precisão)
- **Recorrência**: 'Uma vez', 'Todo dia', 'Toda semana'. Avança triggerAt automaticamente até dar futuro (não dispara em "rajada" se PC ficou desligado por dias)
- **Notificação dupla** ao disparar:
  - Notificação nativa do Windows (toast com som padrão)
  - **Janela persistente** always-on-top, sem botão X nativo, com botões "Concluído" e "Adiar 10 min" (o diferencial do app)
- **Tray icon** com menu: Mostrar / Iniciar com Windows (toggle) / Sair
- **Auto-start** com Windows via `setLoginItemSettings`
- **Close = hide**: clicar no X da janela main esconde mas mantém processo na tray
- **Single-instance lock**: tentativa de abrir 2ª instância foca a primeira
- **Dialog "Sobre"** com versão dinâmica, link pro GitHub, botões de doação (Ko-fi, GitHub Sponsors)
- **Build .exe** via electron-builder (NSIS instalador + portable)
- **Documentação densa** em `docs/` cobrindo arquitetura, decisões, IPC, persistência, agendamento, etc
- **Decisão registrada**: SQLite → electron-store (`docs/decisoes/001-electron-store-vs-sqlite.md`)

### Não incluído nesta versão
- Sincronização entre dispositivos (não é o foco — app pessoal local)
- Suporte oficial a macOS/Linux (técnicamente funciona mas não testado)
- Code signing (instalador exibe SmartScreen warning — esperado pra OSS)
- Auto-update via electron-updater
- Categorias / tags / prioridades nos lembretes
- Sons customizados de notificação
