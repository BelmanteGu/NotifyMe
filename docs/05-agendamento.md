# 05 — Agendamento de lembretes

> Como o NotifyMe sabe disparar uma notificação no horário certo. Decisões
> sobre `setTimeout` vs `node-cron`, recorrência, e o que acontece quando
> o app está fechado.

---

## 1. Decisão: `setTimeout` em vez de `node-cron`

A Fase originalmente apontava `node-cron`, mas pivotamos pra `setTimeout`
puro. Por quê:

| Critério | `node-cron` | `setTimeout` |
|---|---|---|
| Granularidade | minuto | milissegundo |
| Sintaxe | cron expression (`'0 9 * * 1-5'`) | `delay = triggerAt - now` |
| Suporta horário exato? | Sim, mas overkill | Direto, simples |
| Recorrência | Built-in (cron) | A gente calcula a próxima |
| Dependência | npm | zero (built-in do Node) |

Pra um app de lembretes onde **cada lembrete tem um instante exato em ms**,
`setTimeout` é o ferramenta natural. `node-cron` brilha pra padrões abstratos
("toda terça às 14h"), mas a gente nunca precisa disso — converte tudo em ms.

---

## 2. Como funciona o `ReminderScheduler`

O scheduler vive em `electron/scheduler/index.ts` e é instanciado uma vez
no Main process, dentro de `initialize()`.

```ts
const scheduler = new ReminderScheduler(
  remindersService,
  (reminder) => showReminderNotification(reminder, { mainWin: win }),
  notifyRendererChanged
)
```

Três coisas que recebe:
- O **service** dos lembretes (pra ler/atualizar o triggerAt em recorrentes)
- Um callback `onTrigger` — chamado quando um lembrete dispara
- Um callback `onChange` — chamado quando o scheduler muda algo (avança
  triggerAt de recorrente), pra notificar o Renderer fazer refresh

Por dentro, mantém um `Map<id, NodeJS.Timeout>` — um timer por lembrete pendente.

### Fluxo de um lembrete pendente

```
1. Reminder criado     → IPC handler chama scheduler.schedule(reminder)
2. schedule()          → calcula delay, armazena setTimeout no Map
3. Tempo passa…
4. setTimeout dispara  → fire(id)
5. fire()              → busca lembrete fresh (pode ter mudado)
                        → onTrigger(reminder) [mostra notificação]
                        → se recorrente: avança triggerAt + re-agenda
                        → se 'once': fica pendente até user marcar
```

### Cancelamento

- Lembrete deletado → `cancel(id)` → `clearTimeout` + remove do Map
- Lembrete marcado completo → `cancel(id)` (não tem mais por que disparar)

---

## 3. Recorrência

Os 3 tipos suportados:

| `recurrence` | Comportamento ao disparar |
|---|---|
| `'once'` | Mantém status `pending`. Usuário marca como concluído manualmente. |
| `'daily'` | Avança `triggerAt` em +1 dia (até dar um instante futuro) e re-agenda |
| `'weekly'` | Igual, +7 dias |

### Por que avançar até dar futuro

Imagina: lembrete diário às 9h. Usuário desligou o PC quinta à noite,
ligou só na segunda. O `triggerAt` armazenado era da quinta às 9h.

Sem o "loop até futuro", o scheduler agendaria pra **passado** e
dispararia 4 vezes (sex/sáb/dom/seg) em sequência — barulhento.

Com o loop:

```ts
do {
  next.setDate(next.getDate() + 1)
} while (next.getTime() <= now)
```

Avança quinta → sex → sáb → dom → segunda 9h. Resultado: **uma única**
notificação, no momento certo do dia atual.

> Limitação: o usuário **perde** os disparos dos dias intermediários. Se
> o lembrete diário era importante (tomar remédio), não vai ter alerta
> retroativo. Pra MVP isso é aceitável — o usuário viu o app fechado e
> sabe que precisa abrir.

---

## 4. Lembrete pendente cujo horário já passou

Quando o `app.whenReady()` dispara e o scheduler chama `start()`:

```ts
for (const r of allReminders) {
  if (r.status === 'pending') {
    this.schedule(r)  // ← se delay <= 0, dispara IMEDIATAMENTE
  }
}
```

O `schedule()` detecta `delay <= 0` e usa `setImmediate(() => this.fire(id))`.
Isso garante:
- Lembretes "once" cujo horário passou aparecem como notificação ao abrir o app
- Lembretes recorrentes pulam pra próxima ocorrência futura (e nem disparam
  pelo passado — só agendam o futuro)

UX resultado:
- Você abre o app domingo de noite → "Pagar boleto (atrasado)" aparece
  como notificação. Card mostra badge `Atrasado · Sexta, 14:00`.
- Você marca como concluído ou deixa pendente.

---

## 5. Limitação do `setTimeout` no Node

Node aceita delay máximo de 2³¹-1 ms = **~24,8 dias**. Pra lembretes mais
distantes (ex: "lembrar de renovar passaporte em 6 meses"), agendar diretamente
dá overflow e o lembrete dispara **imediatamente**.

Solução: agendar um "watchdog" no limite do timer, que apenas re-agenda:

```ts
if (delay > MAX_TIMEOUT_MS) {
  setTimeout(() => {
    // 24.8 dias depois, refaz o cálculo
    const fresh = service.findById(reminder.id)
    if (fresh && fresh.status === 'pending') schedule(fresh)
  }, MAX_TIMEOUT_MS)
}
```

Cada wake-up reduz a distância ao alvo até caber em um único setTimeout.
Pra lembrete de 1 ano: 14 wake-ups e dispara no horário certo.

---

## 6. Notificação nativa (Fase 3)

O callback `onTrigger` chama `showReminderNotification` em
`electron/services/notifications.ts`:

```ts
const notif = new Notification({
  title: `Lembrete: ${reminder.title}`,
  body: reminder.description ?? 'Hora de fazer isso',
})
notif.show()
```

**Limitações da notificação nativa do Windows:**
- Some sozinha em ~5 segundos (vai pra Action Center)
- Só som padrão, sem customização
- Sem botões "Concluído" / "Adiar"

> **É exatamente esse comportamento que o NotifyMe quer resolver.**

A Fase 4 vai introduzir **uma janela `always-on-top` sem botão X** que
substitui a notificação nativa. Aí você é forçado a confirmar — o
diferencial do app.

A notificação nativa fica como fallback / aviso secundário. Útil pra
quem quer ver no Action Center depois.

---

## 7. App fechado vs app rodando

| Estado do app | Lembretes disparam? |
|---|---|
| App aberto | Sim, no horário exato |
| App minimizado | Sim |
| App na tray (Fase 5) | Sim (vai ser o estado normal) |
| App fechado completamente | **Não** |

Pra MVP, a Fase 5 vai resolver a maior parte do caso "fechado":
- App **inicia com o Windows** (auto-start)
- App fica **minimizado na tray** quando você clica no X (em vez de fechar)

Fechamento total só por Quit/menu da tray. Resultado: na prática, o app
está sempre rodando depois do primeiro setup.

---

## 8. Push pro Renderer (`reminders:changed`)

Quando o scheduler avança o `triggerAt` de um lembrete recorrente, o
Renderer precisa saber pra atualizar o card (mostrar "amanhã 9h" em vez
do "ontem 9h" desatualizado).

Mecanismo:

```ts
// Main
win.webContents.send('reminders:changed')

// Preload
ipcRenderer.on('reminders:changed', handler)

// Renderer (composable)
window.notifyme.reminders.onChanged(() => refresh())
```

Mesma técnica do IPC normal, só que **invertida** (Main → Renderer em
vez de Renderer → Main). Veja [03-ipc.md](03-ipc.md) seção 4 pra o
detalhe das APIs.

---

## 9. Testando o agendamento

Forma rápida de ver funcionando sem esperar um dia inteiro:

1. Cria um lembrete com horário **2 minutos no futuro**
2. Marca recorrência "Todo dia"
3. Aguarda — notificação nativa aparece
4. Card atualiza pra "Amanhã, mesmo horário"
5. Repete pra confirmar

Pra simular "passado": cria lembrete com horário **agora** ou **5 minutos
atrás** — vai disparar imediatamente ao salvar.

---

## Próxima leitura

- [03 — IPC](03-ipc.md) — onde o canal `reminders:changed` foi planejado
- [06 — Notificação persistente](06-notificacao-persistente.md) — *(Fase 4)*
