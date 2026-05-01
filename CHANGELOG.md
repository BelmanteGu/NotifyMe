# Changelog

Todas as mudanças notáveis são documentadas aqui.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

## [Unreleased]

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
- **Documentação densa** em `docs/` (10 arquivos cobrindo arquitetura, decisões, IPC, persistência, agendamento, etc)
- **Decisão registrada**: SQLite → electron-store (`docs/decisoes/001-electron-store-vs-sqlite.md`)

### Não incluído nesta versão
- Ícones próprios — TODO via `build/CRIAR_ICONES.md`
- Sons customizados de notificação
- Sincronização entre dispositivos
- Suporte oficial a macOS/Linux (técnicamente funciona, mas não testado)
- Code signing (instalador exibe SmartScreen warning — esperado)
- Auto-update via electron-updater
- Categorias / tags / prioridades nos lembretes
