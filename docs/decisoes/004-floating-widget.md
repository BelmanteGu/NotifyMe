# 004 — Widget flutuante de timer/cronômetro

- **Data**: 2026-05-01
- **Status**: aceita
- **Contexto**: usuários do NotifyMe queriam ver o tempo do timer ou
  cronômetro mesmo com a janela main minimizada — pra acompanhar
  Pomodoro enquanto trabalham em outra coisa. A janela main esconder
  via close=hide (Fase 5) era suficiente pra "rodar em background"
  mas não dava feedback visual.

## Decisão

Implementar uma **BrowserWindow secundária** (singleton, frame:false,
alwaysOnTop, movível, redimensionável) que mostra o tempo do componente
ativo (timer ou cronômetro). Aparece automaticamente quando algo está
rodando E o usuário habilitou a opção em Configurações.

## Pré-requisito: state no Main process

Pra o widget funcionar, **dois Renderers (main + widget) precisam ver
o mesmo estado em tempo real**. Antes, o timer state vivia no
composable singleton no Renderer da janela main. Cada Renderer é um
processo Vue separado — não compartilham módulo.

Antes desta feature, fizemos o **refactor**: movemos `useTimer.ts` e
`useStopwatch.ts` pra serem **stubs IPC**. State canônico vive no
Main em `electron/services/timer.ts` e `stopwatch.ts`. Tick é
broadcast via `webContents.send` pra todas as `BrowserWindows` abertas.
Veja [11-timer-e-cronometro.md](../11-timer-e-cronometro.md).

## Alternativas consideradas

1. **Hub IPC com state ainda no Renderer main**
   - Renderer main empurra tick → Main repassa pro widget Renderer
   - 2 hops de IPC, latência ~100ms acumulada
   - Se janela main for destruída, timer some
   - Refactor menor mas frágil
   - **Descartado**

2. **Usar `<dialog>` modal HTML em vez de janela separada**
   - Sem alwaysOnTop quando outra app está em foco
   - Anula o ponto da feature
   - **Descartado**

3. **App de tray "expandido"** (clicar na tray expande mini-UI)
   - Mais minimalista mas menos visível
   - User-controlled em vez de auto-show
   - **Descartado** — queremos visual proeminente

4. **Native overlay via Win32** (HWND_TOPMOST + dwExStyle)
   - Pesadelo pra implementar e manter
   - Não cross-platform (descartando potencial Mac/Linux)
   - **Descartado**

## Por que BrowserWindow secundária venceu

- Reusa **toda a infraestrutura de janelas custom** já feita (frame:false,
  drag region, IPC, preload). Praticamente "copiar e ajustar" do alertWindow.
- **Sincronização gratuita**: broadcast de tick já manda pra todas as
  janelas — adicionar widget é só abrir mais uma `BrowserWindow`.
- **Persistência simples**: `electron-store` (já em uso) salva posição
  e tamanho.
- **Vue compartilhado**: mesmo bundle, mesmo CSS, mesmos composables.
  `WidgetView` é uma view a mais com `?view=widget` na URL.

## Consequências

### O que ganhamos
- Widget always-on-top que sobrevive a fechar a janela main
- Posição/tamanho persistidos entre sessões
- Toggle em Configurações pra desativar
- Botão pra trazer a janela main de volta ao foco
- Auto-show/hide baseado em "algo está rodando"

### Pré-requisito implementado junto
- TimerService + StopwatchService no Main process
- Composables Renderer → stubs IPC
- Veja [11-timer-e-cronometro.md](../11-timer-e-cronometro.md)

### O que adicionou em complexidade
- Mais um arquivo de janela (`widgetWindow.ts`)
- Mais uma view Vue (`WidgetView.vue`)
- Mais uma página de Configurações na sidebar
- Composable `useSettings.ts` + IPC settings
- Componente `Switch.vue` (toggle iOS-like)
- Função `updateWidgetVisibility()` no Main que orquestra abrir/fechar

Total: ~6 arquivos novos, ~600 linhas. Aceitável pra a feature.

### O que NÃO mudou
- API pública (timer/stopwatch dos composables continua igual)
- Comportamento da janela main (close=hide etc continua)
- AlertWindow dos lembretes / TimerAlert / Tray — sem impacto

## Limitações deixadas pra v2

- Multi-monitor: posição salva em coordenadas absolutas; se monitor
  desconectar, widget pode abrir fora da tela
- Sem "esconder quando main visível, mostrar quando minimizada"
  (sempre mostra se algo rodando + setting ON)
- Sem múltiplos timers (1 só)

## Onde está a documentação técnica

- [docs/13-floating-widget.md](../13-floating-widget.md) — implementação completa
- [docs/11-timer-e-cronometro.md](../11-timer-e-cronometro.md) — services no Main
