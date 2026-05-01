# 13 — Widget flutuante

> Janela pequena always-on-top que mostra o tempo do timer ou cronômetro
> mesmo com a janela main minimizada. Toggle em Configurações.

---

## 1. O que é e por quê

O widget aparece automaticamente quando você inicia o **timer** ou
**cronômetro** e some quando ambos param. Útil pra:

- Trabalhar em outra janela enquanto a Pomodoro tá contando
- Acompanhar tempo sem ter o NotifyMe ocupando uma porção da tela
- Ver tempo decorrido durante uma reunião sem interromper

---

## 2. Como ativar/desativar

```
Sidebar → Configurações → toggle "Mostrar widget quando algo estiver rodando"
```

Quando ON (default):
- Inicia timer ou cronômetro → widget aparece no canto inferior direito
- Para ambos → widget some
- Reinicia algum → widget volta

Quando OFF:
- Widget nunca aparece, mesmo com timer rodando

---

## 3. Comportamento da janela

| Atributo | Valor |
|---|---|
| `frame` | false (sem barra de título nativa) |
| `alwaysOnTop` | true (sempre por cima de tudo) |
| `skipTaskbar` | true (não polui a barra de tarefas) |
| `resizable` | true (220×100 a 600×300) |
| `movível` | sim (drag region na barra superior) |
| Posição inicial | canto inferior direito |
| Visibilidade | `setVisibleOnAllWorkspaces` (todos desktops virtuais) |

### Posição e tamanho persistentes

Quando o user move ou redimensiona, o Main salva em `settings.json`:

```ts
widget.on('move', () => {
  const [x, y] = widget.getPosition()
  saveSettings({ widgetX: x, widgetY: y })
})

widget.on('resize', () => {
  const [w, h] = widget.getSize()
  saveSettings({ widgetWidth: w, widgetHeight: h })
})
```

Próxima vez que abrir, restaura a posição/tamanho de antes.

---

## 4. UI do widget

```
┌─────────────────────────────┐
│ 🕐 TIMER         [▢] [×]    │ ← drag region + abrir main + fechar
├─────────────────────────────┤
│   25:30          [▶/⏸]     │
│                  [↻]        │
└─────────────────────────────┘
```

- **Header (drag)**: ícone do modo + label ("TIMER" ou "CRONÔMETRO") +
  botão "Maximize" (mostra a janela main em foco) + botão `×` (fecha
  o widget; setting permanece ON, então abre de novo no próximo start)
- **Body**: display grande com `MM:SS` ou `HH:MM:SS.cc` + 2 botões
  empilhados (play/pause + reset)

### Auto-adaptação do modo

`WidgetView.vue` usa `useTimer()` + `useStopwatch()` ao mesmo tempo. Um
computed decide qual mostrar:

```ts
const mode = computed(() => {
  if (timer.isRunning.value) return 'timer'
  if (stopwatch.isRunning.value) return 'stopwatch'
  // ...
})
```

Se ambos rodam, prioriza timer. Mudar de timer pra cronômetro com widget
aberto **não fecha**: o componente se auto-adapta via composables.

---

## 5. Orquestração no Main

`updateWidgetVisibility()` em `electron/main.ts` é a função chave:

```ts
function updateWidgetVisibility() {
  const showWidget = settings.showWidget
  const desiredMode = showWidget ? getCurrentRunningMode() : null

  if (desiredMode === lastWidgetMode) return // idempotente
  
  if (desiredMode === null) closeWidgetWindow()
  else if (!isWidgetOpen()) openWidgetWindow({ ... })
  
  lastWidgetMode = desiredMode
}
```

Chamada em:
- Cada `tick` do `timerService` (a cada segundo + start/pause/reset)
- Cada `tick` do `stopwatchService` (a cada 50ms — mas idempotente, sem custo)
- Mudança da setting `showWidget` (toggle no SettingsView)

A idempotência (`desiredMode === lastWidgetMode → return`) evita criar/
destruir janela em todo tick. Só age quando o estado **muda**.

---

## 6. Por que state vive no Main

A Feature B requeria que o widget **e** a janela main vissem o mesmo
state em tempo real. Antes da refatoração da Feature B parte 1, o state
do timer vivia no Renderer da janela main (composable singleton). Cada
janela é um Renderer separado — sem estado compartilhado.

Solução: mover o state pro Main process (`TimerService`,
`StopwatchService`). Cada janela vira um stub IPC. Tick é broadcast pra
todas as `BrowserWindows` via `webContents.send`. Veja
[ADR 004](decisoes/004-floating-widget.md).

---

## 7. Botão "Abrir NotifyMe"

O widget tem um pequeno `[▢]` no header que mostra a janela main em
foco. Implementado via:

```ts
// preload.ts
window.notifyme.system.window.showMain = () =>
  ipcRenderer.send('window:showMain')

// main.ts
ipcMain.on('window:showMain', () => showMainWindow())
```

`showMainWindow()` recria a janela main caso tenha sido destruída,
restaura se minimizada, e foca.

---

## 8. Fechar o widget manualmente

Botão `×` no header chama `window.close()`. A `BrowserWindow.on('closed')`
limpa a referência singleton (`widget = null`).

A setting `showWidget` **não é alterada** por isso. Resultado:
- Widget some pra essa "sessão"
- Próxima vez que algo iniciar, widget reaparece (porque setting ON)
- Pra desativar de vez, ir em Configurações e desligar o toggle

---

## 9. Limitações conhecidas

- **Múltiplos timers/cronômetros**: hoje só tem um de cada. Widget não
  precisa lidar com múltiplos.
- **Drag region em frame:false** funciona via `-webkit-app-region: drag`,
  mas o resize só funciona pelas bordas (não há canto visível pra
  arrastar). Em alguns temas Windows isso pode ser sutil.
- **Posição em multi-monitor**: salva em coordenadas absolutas. Se o
  user mover pra um monitor que depois é desconectado, na próxima vez
  pode abrir fora da tela. Mitigação: precisaria validar `screen.
  getAllDisplays()` antes de aplicar a posição salva. Não implementado
  pra MVP.
- **Sem opção "esconder ao foco da main"**: se a janela main ficar
  visível, o widget continua. Pra fluxo "widget só quando minimizado",
  precisaria do main expor `'show'`/`'hide'` events e o widget reagir.
  Pra MVP não.

---

## 10. Persistência: `settings.json`

Localização: `%APPDATA%\notifyme\settings.json`

Conteúdo (exemplo):
```json
{
  "showWidget": true,
  "widgetX": 1640,
  "widgetY": 880,
  "widgetWidth": 280,
  "widgetHeight": 150
}
```

**Arquivo separado** do `data.json` dos lembretes — assim:
- Lembretes são "dados do user" (preserva uninstall)
- Settings são "preferências" (poderiam reaparecer com defaults)

Atualmente nenhum dos dois é deletado no uninstall (`deleteAppDataOnUninstall:
false` no `electron-builder.yml`), mas a separação dá flexibilidade futura.

---

## Próxima leitura

- [11 — Timer e Cronômetro](11-timer-e-cronometro.md) — composables IPC stubs
- [decisoes/004-floating-widget.md](decisoes/004-floating-widget.md) — ADR
- [10 — Componentes UI](10-componentes-ui.md) — outros componentes
