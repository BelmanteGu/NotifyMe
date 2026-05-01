# 07 — Tray icon + auto-iniciar com Windows

> Como o NotifyMe fica rodando em background pra disparar lembretes
> mesmo quando você "fechou" a janela.

---

## 1. O problema

Lembretes só funcionam se o app estiver rodando. Mas pedir pro usuário
manter a janela aberta o tempo todo é ruim — atrapalha, ocupa taskbar.

A solução padrão pra apps de utilitário (OneDrive, antivírus, Discord) é:
1. **Bandeja do sistema** (system tray) — ícone discreto no canto inferior
   direito que indica "estou aqui, rodando"
2. **Auto-start** — app inicia junto com o Windows, sem o usuário precisar
   abrir manualmente
3. **Fechar = esconder** — clicar no X da janela apenas esconde, não
   encerra o processo

O NotifyMe implementa os 3.

---

## 2. Como o Tray funciona no NotifyMe

```ts
// electron/tray.ts
const tray = new Tray(getTrayIcon())
tray.setToolTip('NotifyMe — Lembretes que não somem')
tray.setContextMenu(menu)
tray.on('click', showWindow)
```

### Menu de contexto (botão direito):

```
[ ] Mostrar NotifyMe         ← janela main vem pra frente
─────
[✓] Iniciar com o Windows    ← toggle de auto-start
─────
[ ] Sair                      ← seta isQuitting + app.quit()
```

### Click simples (botão esquerdo):

Mostra a janela main (mesma ação de "Mostrar NotifyMe" no menu).

---

## 3. Hijack do botão "X" da janela

```ts
// electron/main.ts
mainWin.on('close', (event) => {
  if (!isQuitting) {
    event.preventDefault()  // <— cancela o close
    mainWin?.hide()         // <— só esconde
  }
})
```

A flag `isQuitting`:
- **`false`** (padrão): close → hide. App continua na tray.
- **`true`**: close → app.quit() de fato. Definido pelo menu "Sair".

Resultado: usuário clica X → janela some, ícone da tray continua. Lembretes
continuam disparando.

---

## 4. Auto-start no Windows

API do Electron pra registrar como item de inicialização:

```ts
app.setLoginItemSettings({ openAtLogin: true })
```

E pra checar:

```ts
const isAutoStart = app.getLoginItemSettings().openAtLogin
```

Por baixo, isso adiciona uma entrada no registro do Windows
(`HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run`)
apontando pra o executável do NotifyMe.

No menu da tray temos um checkbox "Iniciar com o Windows" que toggle
esse setting. Reconstrói o menu após cada click pra mostrar o estado novo.

---

## 5. Ícone do tray (Fase 5 vs Fase 7)

Pra MVP da Fase 5, o ícone usa este fallback:

```ts
function getTrayIcon(): NativeImage {
  const candidates = [
    path.join(APP_ROOT, 'build', 'tray-icon.png'),
    path.join(APP_ROOT, 'public', 'tray-icon.png'),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return nativeImage.createFromPath(p)
  }
  return nativeImage.createEmpty()  // ← invisível, mas funcional
}
```

Se nenhum dos PNGs existir, usa um ícone vazio. O tray ainda funciona
(menu, clique), só não tem visual. **Fase 7 vai colocar um PNG real**
de um sino laranja em `build/tray-icon.png`.

> **Importante**: NativeImage no Windows aceita PNG, ICO, JPG, BMP.
> **Não aceita SVG**. Por isso temos que fornecer PNG real.
> Recomendado: PNG 16×16 e/ou 32×32 (Windows escolhe o melhor pra HiDPI).

---

## 6. Fluxo completo do ciclo de vida

```
1. Usuário liga o PC
   ↓
2. Windows inicia → executa NotifyMe.exe (porque setLoginItemSettings)
   ↓
3. app.whenReady → initialize():
      - abre store
      - cria scheduler.start() (carrega lembretes pendentes do JSON)
      - cria janela main
      - cria tray icon
   ↓
4. Usuário clica X da janela
   ↓
5. close handler intercepta → mainWin.hide() (não app.quit)
   ↓
6. Tempo passa, scheduler dispara um lembrete
   ↓
7. openAlertWindow + showReminderNotification disparam
   ↓
8. Usuário clica "Concluído" na janela de alerta
   ↓
9. markCompleted no IPC, janela de alerta fecha
   ↓
10. Eventualmente usuário clica "Sair" no menu da tray
    ↓
11. isQuitting=true, app.quit():
       - before-quit: scheduler.stopAll(), close alerts, destroy tray
       - window-all-closed: app.quit() de fato
```

---

## 7. Single-instance lock + tray

A Fase 0 já tinha `app.requestSingleInstanceLock()`. Combinado com o tray,
o comportamento é:

- Usuário tenta abrir o NotifyMe **enquanto outro já está rodando** (ex:
  clicou no atalho da Área de Trabalho com app na tray)
- A segunda instância detecta o lock e sai imediatamente
- A primeira instância recebe o evento `'second-instance'` e mostra a
  janela main (em vez de criar outra)

Resultado: um único NotifyMe sempre, e atalho funciona pra trazer ele
de volta.

---

## 8. macOS / Linux

Esta seção do projeto foca em Windows. Comportamento esperado em outros SOs:

- **macOS**: o tray vira "menu bar icon" (canto superior direito). O
  `setLoginItemSettings` funciona via Launch Services. Comportamento de
  fechar a janela é diferente no macOS — historicamente, fechar não
  encerra o app. Nosso código já trata isso via `process.platform`.
- **Linux**: depende da distro. Algumas têm tray, outras não. Auto-start
  via Login Items pode não funcionar uniformemente.

Pra portar pra Mac/Linux com seriedade, abrir issue no GitHub. Por enquanto,
foco Windows.

---

## 9. Conferindo que está funcionando

1. Roda o app (`npm run dev` ou .exe instalado)
2. Cria um lembrete pra +5 minutos
3. Clica o X da janela main → janela some, mas:
   - Olhe a bandeja: tray icon aparece (ou área vazia onde apareceria)
   - Botão direito no tray → menu visível
4. Aguarda 5 minutos sem fazer nada
5. **Esperado**: notificação dispara mesmo sem janela aberta
6. Clica "Iniciar com o Windows" no menu da tray → marcado como ativo
7. Reinicia o PC
8. **Esperado**: NotifyMe roda automaticamente, ícone aparece na tray

---

## Próxima leitura

- [08 — Build e release](08-build-e-release.md) — *(Fase 6)*
- [06 — Notificação persistente](06-notificacao-persistente.md) — quem
  o tray mantém vivo pra disparar
