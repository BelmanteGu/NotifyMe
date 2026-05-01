# 005 — Sticky notes: aba interna (não janela overlay nem múltiplas)

- **Data**: 2026-05-01 (revisada após primeira tentativa)
- **Status**: aceita
- **Contexto**: o usuário pediu "post-its físicos espalhados na tela".
  Avaliamos 3 abordagens: (a) uma BrowserWindow por nota, (b) uma
  canvas window transparente fullscreen com todas as notas, (c) aba
  interna na janela main com um board onde as notas vivem.

## Decisão

**Aba interna na janela main**. Quarta seção da sidebar ("Notas"),
com um board interno (container `position: relative` + `overflow: auto`)
onde cada nota fica `position: absolute`.

## Histórico — primeiras tentativas e por que mudamos

### Primeira tentativa: canvas window transparente fullscreen

Implementamos uma `BrowserWindow` `transparent: true`, frame:false,
fullscreen, always-on-top, com `setIgnoreMouseEvents(true, { forward:
true })` pra deixar clicks atravessarem onde não tem nota.

**O que estava bom**:
- ~50MB de RAM independente do número de notas
- Notas visíveis sobre qualquer app (Chrome, Word, etc)
- Animação de papel balançando funcional

**Por que mudamos**:
- **UX confusa**: NotifyMe ficava sobreposto a tudo o tempo todo
  quando a feature estava ativa. Usuário não tinha distinção clara
  entre "estou no app" e "estou em outra coisa"
- **Performance imprevisível**: window transparent + always-on-top em
  Windows tem comportamentos esquisitos (sombra esquisita, snap
  layouts confusos)
- **Mouse pass-through frágil**: `setIgnoreMouseEvents` precisa ser
  gerenciado dinamicamente em hover, susceptível a race conditions
  quando o cursor passa rapidamente entre notas adjacentes
- **Multi-monitor**: canvas só cobria o primary display

### Segunda tentativa (descartada): janela por nota

Cada nota como `BrowserWindow` própria.

**Descartado** porque cada janela carrega ~30-50MB de Chromium. 10
notas = 300-500MB extra. Inaceitável pra um app que se vende como leve.

### Solução final: aba interna

NotesView é uma view normal da sidebar. Notas são divs absolutos
dentro de um board scrollável. Drag manual via mouse events com
coordenadas relativas ao board (via Vue inject).

## Por que aba interna venceu

| Critério | Janela por nota | Canvas overlay | Aba interna |
|---|---|---|---|
| RAM com 10 notas | ~500MB | ~50MB | ~0 (já tá rodando) |
| Sempre por cima | ✅ | ✅ | ❌ |
| Visual coerente com app | ❌ | ⚠️ | ✅ |
| Esforço | Alto | Médio | Baixo |
| Multi-monitor | ✅ | ❌ | ✅ |
| Sem mouse pass-through | ✅ | ❌ | ✅ |
| Sente parte do app | ❌ | ❌ | ✅ |

A "always-on-top" não é mais um requisito. Pra ver as notas, o usuário
vai na aba "Notas" da sidebar. Se quer ter elas visíveis junto com
outras coisas, abre o app numa janela ao lado de Chrome/Word.

## Consequências

### O que ganhamos
- App continua leve e coeso
- Sem mouse pass-through (uma classe de bugs eliminada)
- Sem conflito com snap layouts / sombra do Windows
- Multi-monitor "grátis" (a janela main já move entre displays)
- UX mais natural

### O que perdemos
- Notas só são visíveis quando o app está aberto (mas com tray + auto-start, isso é trivial)
- Não vê nota "flutuando sobre o desktop" igual a sticky note físico

### Arquivos removidos da abordagem anterior
- `electron/windows/notesCanvasWindow.ts`
- `src/views/NotesCanvasView.vue`
- IPC `notes:setMouseInteractive`
- Setting `showNotesCanvas`

### Arquivos da abordagem atual
- `src/views/NotesView.vue` (NEW) — aba com board interno
- `src/components/StickyNote.vue` — drag agora usa coordenadas
  relativas ao board (Vue inject)
- O resto do backend (NotesService, store, IPC CRUD) continua igual

## Onde está a documentação técnica

- [docs/14-sticky-notes.md](../14-sticky-notes.md) — implementação completa
