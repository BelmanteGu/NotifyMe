# 12 — Title bar customizada

> Como o NotifyMe substitui a barra de título nativa do Windows
> (cinza, com File/Edit/View/Window/Help) por uma barra própria,
> integrada ao tema do app.

---

## 1. Por que customizar

A barra de título nativa do Windows tem 2 problemas:

1. **Visual destoa** — fundo cinza claro/escuro genérico do SO, não combina
   com a paleta do app
2. **Menus File/Edit/View** aparecem por padrão — o NotifyMe não usa esses
   menus (controle todo via tray e UI), então só ocupam espaço

Apps modernos (Discord, Slack, Linear, VS Code) substituem por barras
custom que integram visual e às vezes adicionam funcionalidade (ex:
abas embutidas no VS Code).

---

## 2. Como funciona

### Configuração da `BrowserWindow` ([electron/main.ts](../electron/main.ts))

```ts
mainWin = new BrowserWindow({
  width: 1100,
  height: 720,
  frame: false,                // ← tira frame nativo (barra + bordas)
  titleBarStyle: 'hidden',     // ← redundante mas explícito
  autoHideMenuBar: true,       // ← garante que menu não aparece
  backgroundColor: '#0D0D0E',
  webPreferences: { /* ... */ },
})
```

`Menu.setApplicationMenu(null)` em `initialize()` remove **completamente**
o menu padrão (File/Edit/View/Window/Help) — afeta todas as janelas do app.

### Barra custom no Renderer ([src/components/TitleBar.vue](../src/components/TitleBar.vue))

A barra é um componente Vue de altura fixa (`h-9` = 36px) renderizado no
topo do `App.vue`:

```vue
<template>
  <div class="h-screen flex flex-col bg-app overflow-hidden">
    <TitleBar />
    <div class="flex-1 flex">
      <Sidebar />
      <main>...</main>
    </div>
  </div>
</template>
```

---

## 3. Drag region (mover a janela)

CSS especial pra Electron:

```css
.drag-region   { -webkit-app-region: drag; }
.no-drag       { -webkit-app-region: no-drag; }
```

A barra inteira tem `drag-region` por default. Os botões (Minimize, Maximize,
Close) têm `no-drag` pra serem clicáveis.

```vue
<div class="drag-region flex items-center justify-between">
  <div>Logo + Título</div>
  <div class="no-drag flex">
    <button>Minimize</button>
    <button>Maximize</button>
    <button>Close</button>
  </div>
</div>
```

> **Pegadinha**: `-webkit-app-region: drag` desabilita cliques em botões
> filhos. Precisa explicitamente declarar `no-drag` em cada elemento
> interativo dentro da drag area.

---

## 4. Botões de controle (IPC)

### Renderer pede ao Main

A barra não pode controlar a janela diretamente (Renderer não tem acesso
a `BrowserWindow`). Comunica via IPC:

```ts
// preload.ts
system: {
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    toggleMaximize: () => ipcRenderer.send('window:toggleMaximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximizedChanged: (cb) => { /* listener */ },
  }
}
```

### Main implementa

```ts
// electron/main.ts
ipcMain.on('window:minimize', () => mainWin?.minimize())
ipcMain.on('window:toggleMaximize', () => {
  if (!mainWin) return
  if (mainWin.isMaximized()) mainWin.unmaximize()
  else mainWin.maximize()
})
ipcMain.on('window:close', () => mainWin?.close())
ipcMain.handle('window:isMaximized', () => mainWin?.isMaximized() ?? false)
```

> Note `ipcMain.on` (fire-and-forget) pra ações sem retorno e `ipcMain.handle`
> pra `isMaximized` que precisa de resposta. Convenção do Electron.

---

## 5. Sincronização do estado de maximizado

O ícone do botão Maximize/Restore precisa mudar quando a janela é
maximizada/restaurada — inclusive quando o usuário usa atalhos do SO
(Win+↑) ou clica duas vezes na barra.

### Push do Main

```ts
// electron/main.ts
mainWin.on('maximize', () => {
  mainWin?.webContents.send('window:maximizedChanged', true)
})
mainWin.on('unmaximize', () => {
  mainWin?.webContents.send('window:maximizedChanged', false)
})
```

### TitleBar escuta

```ts
// src/components/TitleBar.vue
const isMaximized = ref(false)

onMounted(async () => {
  isMaximized.value = await window.notifyme.system.window.isMaximized()
  unsubscribe = window.notifyme.system.window.onMaximizedChanged((v) => {
    isMaximized.value = v
  })
})

onBeforeUnmount(() => {
  unsubscribe?.()
})
```

E o ícone alterna entre `Square` (maximizar) e `Copy` (restaurar — duas
janelas empilhadas) baseado em `isMaximized.value`.

---

## 6. Border radius da janela toda

`src/style.css` aplica:

```css
body {
  border-radius: 12px;
  overflow: hidden;
}
```

Combinado com `frame: false`, isso dá cantos arredondados estilo macOS.
**Não** usamos `transparent: true` — preservamos a sombra padrão do
Windows (mais simples, funciona sempre).

---

## 7. Fluxo "Close = Hide" continua funcionando

Mesmo com title bar custom, o handler de close em `main.ts` ainda
intercepta:

```ts
mainWin.on('close', (event) => {
  if (!isQuitting) {
    event.preventDefault()
    mainWin?.hide()
  }
})
```

Quando o usuário clica no `X` da TitleBar:
1. TitleBar chama `window.notifyme.system.window.close()`
2. Main recebe `'window:close'` e chama `mainWin.close()`
3. O event listener `'close'` intercepta e faz `mainWin.hide()` (não destrói)
4. App continua na tray

Veja [07-tray-e-autostart.md](07-tray-e-autostart.md).

---

## 8. Casos não cobertos

- **Resize por bordas**: `frame: false` mantém o resize por bordas (Electron
  cuida automaticamente). Não precisamos implementar manualmente.
- **Snap regions** (Win+Setas): funcionam normalmente.
- **Aero shake** (sacudir título pra minimizar outras): funciona.
- **Touch bar do Mac**: não suportado, mas o app é Windows-first.
- **macOS traffic lights**: não tentamos replicar — em macOS, o user já
  espera os botões verdes/amarelos/vermelhos. Pra port pra Mac, ajustar
  TitleBar com `process.platform === 'darwin'`.

---

## Próxima leitura

- [01 — Arquitetura do Electron](01-arquitetura-electron.md) — Main vs Renderer
- [03 — IPC](03-ipc.md) — comunicação Renderer ↔ Main
- [10 — Componentes UI](10-componentes-ui.md) — outros components
