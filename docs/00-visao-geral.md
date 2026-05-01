# 00 — Visão geral do NotifyMe

> **Para quem está lendo isso pela primeira vez.** Esta doc explica o **porquê** do projeto, **o que** ele faz e **como** as decisões técnicas foram tomadas. As outras docs (01 a 09) entram nos detalhes técnicos.

---

## 1. O problema que estamos resolvendo

O Windows tem um sistema de notificação que funciona pra avisos passageiros — chegou um e-mail, atualizou um app — mas falha completamente pra **lembretes que precisam ser executados**:

- "Fechar o caixa às 18h"
- "Pagar o DAS até dia 20"
- "Ligar pro fornecedor X amanhã de manhã"
- "Levantar e alongar a cada 1h"

Em todas essas situações, a notificação aparece, **some sozinha em segundos**, e você esquece. O Windows trata um "lembre-me de pagar a guia do MEI" exatamente igual a um "Spotify atualizou". Isso é um bug do design, não um bug do código.

### Evidências reais (foram o que motivaram o projeto)

- **Windows Central Forum** — thread com vários usuários: *"Most reminder apps act as an alarm and once you dismiss it, there is nothing to remind you about it later"*
- **Quora**: *"I want hourly reminders to pop up on my Windows desktop reminding me to do small exercises while I'm working"* — sem solução satisfatória
- **The Register Forum (2025)**: usuários pedindo um sistema de lembretes que persista até ser confirmado

Apps existentes (Microsoft To Do, Cortana, Wise Reminder, Desktop-Reminder) ou são limitados pelo mesmo design "notificação que some", ou têm UX dos anos 2000.

---

## 2. O que o NotifyMe é (e o que ele NÃO é)

### É:
- Um app desktop **simples**, **leve**, **offline**, **sem login**, **sem nuvem**
- **Open source** (MIT) com botão de doação
- Específico pra **Windows** (não tenta ser multiplataforma — foco)
- Foco em **um único diferencial**: notificação que persiste até ser confirmada

### Não é:
- Um substituto pro Microsoft To Do (não tem sync, anexo, subtarefa)
- Um pomodoro timer (existem milhares)
- Um calendário (use o Google Calendar ou o do Outlook pra eventos)
- Multiplataforma (Mac/Linux ficam pra muito depois — talvez nunca)

**Princípio de design**: cada vez que a gente sente vontade de adicionar uma feature, pergunta "isso é o diferencial do app?" Se não é, vai pra v2 ou nunca.

---

## 3. Decisões grandes (e por quê)

### Decisão 1 — Electron, não .NET/WPF

| Critério | Electron | .NET/WPF |
|---|---|---|
| Linguagem que o autor já domina | ✅ JS/TS (do Cliloop) | ❌ C# (precisa aprender) |
| Curva de aprendizado | Baixa | Alta |
| Tamanho do `.exe` final | ~150 MB | ~5 MB |
| Performance | Suficiente pra app de lembrete | Melhor |
| Comunidade open source | Gigante | Moderada |

**Conclusão**: o tamanho do `.exe` é o único contra real, mas pra um app que vai ficar rodando 24/7 silencioso na tray, não é crítico. A produtividade de usar Vue 3 + TypeScript que o autor já domina vence.

### Decisão 2 — Vue 3 (não React, não Svelte)

O autor já construiu o Cliloop em Vue 3. Reaproveitar essa expertise reduz a curva de aprendizado a praticamente zero pra parte de UI. A escolha aqui não é técnica, é prática.

### Decisão 3 — SQLite local (não JSON, não IndexedDB)

Será explicado em detalhe em [04-banco-sqlite.md](04-banco-sqlite.md), mas o resumo é:
- **JSON em arquivo**: bom até ~100 lembretes, ruim depois (precisa ler arquivo inteiro pra cada query)
- **IndexedDB**: existe só no Renderer, não compartilha facilmente com o Main process que faz o agendamento
- **SQLite via better-sqlite3**: profissional, escala bem, queries SQL, transações, e roda dentro do Main

### Decisão 4 — Sem nuvem, sem login

O foco do app é **simplicidade radical**. Adicionar nuvem significa:
- Backend (custos, manutenção, autenticação)
- Privacidade (LGPD, política de uso)
- Conflitos de sincronização entre dispositivos
- Latência (e se a internet falhar?)

Usuário quer um lembrete? Cria, persiste em SQLite local, dispara. Acabou. Quem precisa de sync usa o Google Tasks.

### Decisão 5 — Open source com doações (não freemium, não pago)

- **Pago**: maior atrito de adoção. Pra um app simples, ninguém paga US$ 5.
- **Freemium**: complica o código. Limitar lembretes é frustrante; limitar features esconde o diferencial.
- **Open source + doações**: maximiza adoção. Quem gostou e tem grana, doa. Quem não tem, usa.

---

## 4. Quem é o usuário-alvo

### Persona 1 — Dono de pequeno negócio
> "Tenho uma pizzaria. Toda noite tenho que fechar o caixa, mandar foto pro contador, conferir estoque pro dia seguinte. Esqueço alguma coisa toda semana."

### Persona 2 — Trabalhador remoto
> "Trabalho em casa. Esqueço de levantar, esqueço de almoçar, esqueço de fechar o expediente."

### Persona 3 — Freelancer / autônomo
> "Tenho 5 clientes. Cada um tem seus prazos. O Trello não me grita."

**Não é o usuário-alvo**: equipes (vai pro Asana/Linear), pessoas que vivem no celular (já usam Google Tasks), gente em Mac/Linux.

---

## 5. Modelo mental: o "loop" de um lembrete

```
[1] Usuário cria lembrete
       ↓
[2] Lembrete fica salvo no SQLite local
       ↓
[3] node-cron está sempre rodando no Main, checando os lembretes
       ↓
[4] Chegou a hora → dispara
       ↓
[5] Abre janela "always-on-top" sem botão X
       ↓
[6] Usuário clica em "Concluído" ou "Adiar 10 min"
       ↓
[7] SQLite atualizado, próxima ocorrência calculada (se recorrente)
```

Tudo isso roda offline. Ponto.

---

## 6. Onde estamos no roadmap

A Fase atual é **Fase 0 — Setup base**. Setup do Electron + Vue + Vite + Tailwind, janela em branco aparece, build configurado. Nenhuma feature ainda.

Próxima: **Fase 1** — UI estática da lista de lembretes (sem dados ainda, só mostrar como ficaria).

Veja o [README](../README.md) pro roadmap completo.

---

## 7. Dúvidas frequentes

> **"Por que não fazer só um web app?"**
> Porque um web app fechado significa lembretes não disparados. Um app desktop roda em background mesmo com o navegador fechado. Esse é o ponto.

> **"Por que não fazer um app no celular?"**
> O foco é Windows. Quem trabalha no PC o dia inteiro tem o foco no PC. Versão mobile fica pra muito depois — provavelmente nunca, já que o Google Tasks e similares já fazem isso.

> **"E se eu quiser sincronizar entre 2 PCs?"**
> Não vai fazer parte do MVP. Talvez na v2, talvez nunca. Quem quer sync sério, use Google Tasks.

> **"E o macOS?"**
> O Electron suporta, mas o app nem sempre vai funcionar idiomaticamente no Mac (o sistema de notificação é diferente). Foco em Windows pra MVP. Pull request bem-vindo se alguém quiser portar.

---

## Próxima leitura

- [01 — Arquitetura do Electron](01-arquitetura-electron.md) — entender a divisão Main vs Renderer (a coisa mais importante de Electron)
- [09 — Glossário](09-glossario.md) — todos os termos técnicos novos com explicação curta
