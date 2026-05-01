# 002 — `frame: false` e título customizado

- **Data**: 2026-05-01
- **Status**: aceita
- **Contexto**: a janela main do NotifyMe vinha com a barra de título
  nativa do Windows e o menu padrão (File/Edit/View/Window/Help). Visual
  destoava do tema escuro/glassmorphism do app, e os menus eram inúteis
  (o NotifyMe não usa esse modelo de comando).

## Decisão

Usar `frame: false` + `titleBarStyle: 'hidden'` + `autoHideMenuBar: true`
no `BrowserWindow`. Implementar TitleBar customizada como componente Vue
no Renderer com botões minimize/maximize/close próprios.

## Alternativas consideradas

1. **Manter frame nativo + tirar só os menus** (`Menu.setApplicationMenu(null)`)
   - Visual ainda destoa: barra de título cinza padrão do Windows
   - Solução incompleta
   - Descartado

2. **`frame: false` + `transparent: true`** (cantos super arredondados estilo
   macOS Sequoia)
   - Mais radical
   - Risco: sombra do Windows não acompanha (pode ficar quadrado sem sombra
     ou com sombra esquisita)
   - Bug histórico de transparent + Electron em algumas configs Windows
   - Descartado por enquanto: pode entrar numa fase futura, mas o ROI vs risco
     é baixo pra MVP

3. **`titleBarStyle: 'hidden'` com `titleBarOverlay`** (Windows 11+)
   - Botões nativos do Windows (minimize/maximize/close) ficam visíveis
     mas estilizados via JS API
   - Funciona só no Windows 11
   - Limitação: muito difícil customizar visualmente (cor de hover, etc)
   - Descartado: queremos full controle visual

4. **Usar lib como `electron-window-state` ou `custom-electron-titlebar`**
   - Adiciona ~30KB de bundle
   - Camada de abstração desnecessária pra um componente de ~80 linhas
   - Descartado

## Por que `frame: false` venceu

- Total liberdade visual (cor, gradient, glass, ícones próprios)
- Funciona em Windows 10 e 11 igualmente
- ~80 linhas de Vue (TitleBar.vue) + 4 linhas de IPC handlers no Main
- Mantém comportamento padrão de resize por bordas e snap regions
- Border radius 12px no `body` dá cantos arredondados estilo Apple

## Consequências

### O que ganhamos
- Visual integrado ao tema do app (dark mode lindo, light mode coerente)
- Sem menus desnecessários ocupando espaço vertical
- Drag region customizável (a barra + área extra se quisermos)

### O que perdemos / cuidados
- Precisa implementar manualmente: minimize/maximize/close, sync de estado
  maximizado, drag region. Total ~100 linhas de código.
- Atalhos de teclado de janela (Ctrl+M etc) param de funcionar — Electron
  não tem essa shortcut nativa quando frame:false
- Em macOS, traffic lights (botões verde/amarelo/vermelho) não aparecem —
  precisaríamos detectar `process.platform === 'darwin'` e renderizar UI
  diferente. Pra MVP só Windows, deixamos pra v2.

### Riscos não-resolvidos
- Em Windows 11, snap layouts (hover no botão maximize) não funcionam com
  custom titlebar a menos que use `titleBarStyle: 'hidden'` (que estamos
  usando). Funciona ok no nosso caso.
- Acessibilidade: a barra custom não tem labels nativos do Windows
  Narrator. Mitigamos com `aria-label` explícito nos botões.

## Onde está a documentação técnica

- [docs/12-title-bar-customizada.md](../12-title-bar-customizada.md) —
  implementação completa, drag region, IPC, sync de maximizado
