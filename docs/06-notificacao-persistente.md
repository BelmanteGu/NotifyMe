# 06 — Notificação persistente

> A feature-killer do NotifyMe. A janela `always-on-top` que **não some**
> até o usuário escolher entre "Concluído" ou "Adiar 10 min".

---

## 1. O problema que isso resolve

Notificações nativas do Windows somem em 5 segundos. Pra lembretes
importantes ("fechar caixa", "tomar remédio"), isso é frustrante: você
estava em outra coisa, viu de canto de olho, voltou pro trabalho, esqueceu.

Apps existentes (Microsoft To Do, Cortana, Wise Reminder) sofrem do mesmo
limite porque usam o sistema de notificação do SO.

**Diferencial do NotifyMe**: ao disparar, abre uma **janela própria** que
fica sempre por cima de tudo até você confirmar.

---

## 2. Como funciona

Quando o `ReminderScheduler` dispara um lembrete, em `electron/main.ts`:

```ts
(reminder) => {
  showReminderNotification(reminder, { mainWin })  // toast nativo + som
  openAlertWindow(reminder, { ... })               // janela persistente
}
```

As **duas** acontecem juntas:
- A notificação nativa fornece o **som** padrão do Windows (importante pra atrair atenção)
- A janela persistente fornece a **persistência** (não some até confirmar)

A notificação nativa some em ~5s e fica no Action Center. A janela
persistente fica até você clicar em um botão.

---

## 3. Configuração da janela

```ts
new BrowserWindow({
  width: 480,
  height: 320,
  frame: false,           // sem barra de título nativa, sem botão X
  resizable: false,
  minimizable: false,     // não pode minimizar
  maximizable: false,
  fullscreenable: false,
  alwaysOnTop: true,      // SEMPRE por cima
  skipTaskbar: false,     // visível na taskbar (lembrete extra)
  center: true,
  backgroundColor: '#0D0D0E',
})
```

E `setVisibleOnAllWorkspaces(true)` — aparece em todos os desktops virtuais
do Windows. Não tem como esconder em outro workspace.

`flashFrame(true)` faz o ícone da janela piscar na taskbar — atrai atenção
adicional se a janela mesma já não chamou.

---

## 4. Reaproveitamento do bundle do Vue

Em vez de criar um segundo `index.html` e configurar dois entry points
no Vite, a janela de alerta carrega o **mesmo `index.html`** mas com
query string:

```
?view=alert&id=<reminderId>
```

E em `src/main.ts`:

```ts
const params = new URLSearchParams(window.location.search)
if (params.get('view') === 'alert') {
  createApp(AlertView, { reminderId: params.get('id') ?? '' }).mount('#app')
} else {
  createApp(App).mount('#app')
}
```

Vantagens:
- Um único build, um único bundle
- Mesmo CSS Tailwind compartilhado
- Configuração de Vite mantém-se simples

---

## 5. AlertView.vue

A view é minimalista — esse é o ponto. Sem tabs, sem header complexo,
sem barra lateral. Só:

- **Título** do lembrete (grande, em destaque)
- **Descrição** (se tiver)
- **Hora** prevista
- Dois botões grandes:
  - **Adiar 10 min** — chama `snooze(id, 10)`, fecha a janela
  - **Concluído** — chama `markCompleted(id)`, fecha a janela

Tem também um botão `X` discreto pra fechar sem ação. Não tentamos prevenir
isso — seria draconian. O ponto é tornar a notificação **muito difícil
de ignorar**, não impossível.

---

## 6. Snooze

O backend não tinha conceito de "adiar" antes. A Fase 4 adicionou:

```ts
// electron/services/reminders.ts
snooze(id: string, minutes: number): Reminder | null {
  const newTriggerAt = new Date(Date.now() + minutes * 60_000).toISOString()
  return this.updateTriggerAt(id, newTriggerAt)
}
```

E o handler IPC:

```ts
// electron/ipc/reminders.ts
ipcMain.handle('reminders:snooze', (_event, id, minutes) => {
  const reminder = service.snooze(id, minutes)
  if (reminder) {
    scheduler.cancel(id)        // cancela o timer atual
    scheduler.schedule(reminder) // re-agenda com o novo triggerAt
    onChange()                   // notifica UI principal pra refresh
  }
  return reminder
})
```

Conceitualmente: snooze é só um `updateTriggerAt` mascarado. O scheduler
trata uniforme — não distingue snooze de "criou um novo lembrete pra
daqui a 10 min". Simplicidade.

---

## 7. Tracking de janelas abertas

Cada lembrete pode ter no máximo **uma** janela de alerta aberta. Se o
trigger dispara enquanto a janela anterior ainda existe, focamos a
existente em vez de criar outra:

```ts
// electron/windows/alertWindow.ts
const existing = ctx.openWindows.get(reminder.id)
if (existing && !existing.isDestroyed()) {
  existing.show()
  existing.focus()
  return
}
```

O `Map<id, BrowserWindow>` é mantido em `main.ts` e limpa as janelas
fechadas via listener `'closed'`.

Em `before-quit`, todas as janelas de alerta abertas são destruídas.

---

## 8. Push pro Renderer principal

Quando o usuário clica "Concluído" ou "Adiar 10 min" na janela de alerta,
a mutação acontece **fora** da janela principal. O composable
`useReminders` da janela main não sabe que algo mudou.

Solução: o IPC handler emite `onChange()` em **toda** mutação. O `onChange`
chama `webContents.send('reminders:changed')` em **todas** as janelas
abertas — main e alerts. Cada uma decide se quer refresh.

Em `main.ts`:

```ts
function notifyRendererChanged() {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) {
      w.webContents.send('reminders:changed')
    }
  }
}
```

E o composable:

```ts
window.notifyme.reminders.onChanged(() => refresh())
```

---

## 9. Limitações conhecidas (Fase 4)

- **Sem som customizado**: usa o som padrão do Windows da notificação
  nativa que dispara junto. Não tem como customizar sem incluir arquivo
  de áudio.
- **Alt+F4 fecha**: não previnimos. Forçar antagoniza o usuário.
- **Não toca som **se** a notificação nativa estiver desabilitada**: o
  som vem da notif nativa, então se o usuário desativou notificações no
  Windows, perde o som. Aceitável — a janela persistente continua
  visível.
- **Janela tem ~50ms de delay pra abrir**: o tempo de criar BrowserWindow
  e carregar o bundle. Imperceptível.
- **Múltiplos lembretes simultâneos** abrem múltiplas janelas, todas
  always-on-top. Pode ficar bagunçado se 5 lembretes dispararem ao mesmo
  tempo. Pra MVP é aceitável — caso raro.

---

## Próxima leitura

- [05 — Agendamento](05-agendamento.md) — quem chama `openAlertWindow`
- [07 — Tray e auto-start](07-tray-e-autostart.md) — *(Fase 5)*
