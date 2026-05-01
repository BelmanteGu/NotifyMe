# 005 — Sticky notes: canvas única vs múltiplas janelas

- **Data**: 2026-05-01
- **Status**: aceita
- **Contexto**: o usuário pediu "post-its físicos espalhados na tela",
  com cores selecionáveis, drag & drop e animação de balanço como
  papel. A primeira pergunta arquitetural: **cada nota deve ser uma
  janela própria, ou uma janela única "canvas" com todas as notas
  como divs internos?**

## Decisão

**Uma canvas única**: BrowserWindow transparente fullscreen
always-on-top. As notas vivem como `<div>`s Vue posicionados
absolutamente dentro dela.

## Alternativas consideradas

### A — Uma BrowserWindow por nota

Cada post-it vira uma janela própria, frame:false, alwaysOnTop, com
seu próprio Renderer process.

**Prós**:
- Movível pelo Windows nativo (não precisa implementar drag manual)
- Cada nota tem isolamento completo (crash de uma não afeta as outras)
- Resize com bordas nativas do Windows

**Contras**:
- **Pesado**: cada BrowserWindow carrega ~30-50MB de Chromium. Com
  10 notas, isso é 300-500MB extra de RAM. Inaceitável pra um app
  que se vende como "leve" e fica rodando 24/7 na tray.
- Sombra do Windows torna o efeito "papel" menos convincente
- Cada janela tem seu próprio ciclo de vida → mais bugs potenciais
- Alt+F4 fecha a nota (pode ser indesejado)

**Descartado**: o custo de RAM mata o caso de uso.

### B — Uma BrowserWindow canvas única

Janela única transparent + fullscreen + alwaysOnTop. Notas são divs
internos posicionados via `position: absolute`. Drag implementado
com mousedown/mousemove no Vue.

**Prós**:
- **Leve**: ~50MB total independente do número de notas
- Controle total de visual (sombra, rotação, animações CSS)
- Sincronização entre notas trivial (mesmo state Vue)
- Click-through gerenciável via `setIgnoreMouseEvents`

**Contras**:
- Drag implementado manualmente (~30 linhas de Vue)
- Sem resize nativo — precisaria implementar handle com mousedown
- Single monitor por padrão (pra cobrir múltiplos seria mais complexo)

**Escolhido**.

### C — Web overlay sem Electron (Win32 native)

Usar API nativa do Windows pra criar uma janela transparente click-through
e desenhar via Direct2D ou GDI+.

**Prós**:
- Performance máxima
- Integração profunda com a shell do Windows

**Contras**:
- Inviável: precisaria de C++/C# nativo, FFI complexa
- Cross-platform morto (mesmo que NotifyMe seja Windows-only hoje)
- Manutenção pesada

**Descartado**.

### D — `<dialog>` HTML em vez de janela

Usar elemento `<dialog>` nativo do navegador no Renderer da janela main.

**Prós**:
- Zero janelas extras

**Contras**:
- Não é always-on-top quando outra app está em foco
- Anula o ponto da feature ("vejo as notas mesmo no Chrome/Word")

**Descartado**.

## Por que canvas única venceu

Tabela resumo:

| Critério | A (uma por nota) | B (canvas) | C (Win32) | D (dialog HTML) |
|---|---|---|---|---|
| RAM com 10 notas | ~500MB | ~50MB | ~10MB | 0 (já tá rodando) |
| Always-on-top | ✅ | ✅ | ✅ | ❌ |
| Esforço de implementação | Baixo | Médio | Altíssimo | Trivial |
| Visual papel/balanço | Difícil (sombra Win) | ✅ | ✅ | Limitado |
| Multi-monitor | Trivial | Médio | Médio | N/A |

A canvas única ganha em **leveza + esforço + visual**, perdendo um pouco
em multi-monitor (mitigável depois).

## Consequências

### O que ganhamos
- App continua "leve": +50MB pra feature inteira
- Animação de balanço CSS-only (zero JavaScript bouncy logic)
- Cores e visual customizáveis sem limite
- Sincronização trivial entre notas

### O que perdemos / pendências
- Drag implementado manualmente (~30 linhas — ok)
- Resize ainda não suportado (todas as notas 200x200)
- Multi-monitor: notas só no display primário. Seguir
  `screen.getAllDisplays()` na v2.

### Implicações arquiteturais
- O `setIgnoreMouseEvents(true, { forward: true })` precisa ser
  gerenciado dinamicamente baseado em hover. Funciona perfeitamente
  com Electron 33.

## Onde está a documentação técnica

- [docs/14-sticky-notes.md](../14-sticky-notes.md) — implementação completa
