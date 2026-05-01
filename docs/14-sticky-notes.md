# 14 — Sticky notes (notas adesivas)

> Post-its visuais espalhados na tela. Cada nota é um "papel" colorido,
> arrastável, editável, sempre por cima de tudo.

---

## 1. O que é

Quando o usuário ativa **Configurações → Espalhar notas adesivas na tela**,
abre-se uma janela transparente fullscreen always-on-top que mostra
todas as notas como divs Vue posicionadas livremente.

Características de cada nota:
- **6 cores** disponíveis (amarelo, rosa, azul, verde, laranja, roxo)
- **Texto editável** inline (textarea direto no post-it)
- **Drag & drop** — arrasta com o mouse, balança como papel ao soltar
- **Rotação base aleatória** (-3° a +3°) na criação pra parecer "espalhado"
- **Persistente** — texto, posição, cor salvos em `notes.json`

Botão "+" no canto inferior direito cria uma nova nota.

---

## 2. Decisão arquitetural: UMA canvas (não janela por nota)

A abordagem ingênua seria "uma BrowserWindow por nota". Problema:
cada `BrowserWindow` carrega ~30-50MB de Chromium. Com 10 notas, isso
seria 300-500MB extra de RAM — pesado pra um app simples.

A solução escolhida: **uma única janela transparente fullscreen** com
todas as notas como `<div>`s Vue absolutos. Custo: ~50MB total
independente do número de notas.

Trade-off: notas não podem cruzar para outras telas (multi-monitor),
mas isso é aceitável pra MVP.

Veja [ADR 005](decisoes/005-sticky-notes-canvas-vs-windows.md) pro
raciocínio completo.

---

## 3. Mouse pass-through

A canvas cobre a tela inteira, mas a maior parte é transparente. Sem
cuidado, ela bloquearia clicks no app de baixo (browser, IDE, etc).

Solução: `setIgnoreMouseEvents(true, { forward: true })` por padrão.
- `ignore: true` → physical clicks atravessam pra app de baixo
- `forward: true` → mouse move/hover events ainda chegam ao Renderer
  (necessário pra detectar entrada do cursor numa nota)

Quando o cursor entra em uma nota, o Renderer chama
`window.notifyme.notes.setMouseInteractive(true)` que faz o Main
chamar `setIgnoreMouseEvents(false)`. Sai da nota → volta pra `true`.

```ts
// src/views/NotesCanvasView.vue
let hoverCount = 0

function handleNoteHover(hovering: boolean) {
  hoverCount = Math.max(0, hoverCount + (hovering ? 1 : -1))
  window.notifyme.notes.setMouseInteractive(hoverCount > 0)
}
```

O contador (em vez de boolean simples) evita race condition quando
o cursor passa rapidamente de uma nota pra outra adjacente — o
mouseleave de A pode disparar **depois** do mouseenter de B.

---

## 4. Animação "papel balançando"

Cada nota usa `transition` CSS com bouncy easing:

```css
.sticky-note {
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

Comportamento:
- Estado normal: `transform: rotate(--rotation)` (rotação base aleatória)
- Em drag (`is-dragging`): `transform: rotate(rotation + 2deg) scale(1.04)` + sombra mais forte (efeito "elevado") + `transition: none` pra responder na hora ao mouse
- Drop (mouseup): volta pra estado normal com bouncy transition →
  oscila um pouco e settle (efeito "papel descansando")

`will-change: transform` força GPU layer pra animação ficar suave.

---

## 5. Estrutura

```
src/types/note.ts             ← Note, NoteColor, NoteInput, NotePatch
                                 + COLOR_PALETTES (6 cores light/dark)

electron/store/notes.ts       ← electron-store em notes.json
electron/services/notes.ts    ← NotesService (CRUD)
electron/ipc/notes.ts         ← IPC handlers
electron/windows/notesCanvasWindow.ts  ← BrowserWindow transparent fullscreen

src/composables/useNotes.ts   ← stub IPC
src/views/NotesCanvasView.vue ← overlay com todas as notas
src/components/StickyNote.vue ← cada nota individual
```

---

## 6. Color palette

Definida em `src/types/note.ts`:

```ts
export const COLOR_PALETTES: Record<NoteColor, { light: ..., dark: ... }> = {
  yellow: {
    light: { bg: '#FEF3C7', text: '#78350F' },
    dark:  { bg: '#78350F', text: '#FEF3C7' },
  },
  pink:   { ... },
  blue:   { ... },
  green:  { ... },
  orange: { ... },
  purple: { ... },
}
```

Tons pastel claros pra parecer papel real. No dark mode, inverte:
fundo escuro saturado + texto claro pastel.

Color picker:
- Botão pequeno no header da nota (visível ao hover)
- Click abre popover com 6 círculos
- Clica num → emit `update` com nova cor → IPC → persistido

---

## 7. Persistência

Arquivo: `%APPDATA%\notifyme\notes.json`

Estrutura:
```json
{
  "notes": [
    {
      "id": "abc-uuid",
      "text": "Comprar leite",
      "x": 320,
      "y": 180,
      "color": "yellow",
      "rotation": 1.7,
      "createdAt": "2026-05-01T10:00:00Z",
      "updatedAt": "2026-05-01T10:05:00Z"
    }
  ]
}
```

Cada operação CRUD escreve o arquivo inteiro (atomic via tempfile +
rename, electron-store padrão). Pra centenas de notas, instantâneo.

### Debounce do texto

Textarea editável dispara `update` no IPC a cada keystroke seria muito
caro. Solução: debounce de 400ms. Se user para de digitar por 400ms,
salva. Se continuar digitando, reseta o timer. Também dá flush no `blur`
pra garantir que a última edição foi persistida.

```ts
let textTimeout: number | null = null

function onTextInput(event: Event) {
  if (textTimeout !== null) clearTimeout(textTimeout)
  textTimeout = window.setTimeout(() => {
    emit('update', { text: localText.value })
    textTimeout = null
  }, 400)
}
```

---

## 8. Sincronização entre janelas

Quando user edita uma nota na canvas, o Main:
1. Persiste via `NotesService.update`
2. Emite `notes:changed` pra todas as janelas via broadcast

Outras janelas (futura "Notas" view na sidebar, por exemplo) escutam
e fazem refresh.

Atualmente só a canvas usa `useNotes()`, mas a infra já está pronta
pra múltiplas views compartilharem o estado.

---

## 9. Como ativar/desativar

```
Sidebar → Configurações → toggle "Espalhar notas adesivas na tela"
```

Quando ON:
- Canvas window abre
- Todas as notas existentes aparecem
- Botão "+" disponível pra criar mais

Quando OFF:
- Canvas window fecha
- Notas continuam salvas em `notes.json` (não são apagadas)
- Reativar volta tudo

Por padrão `showNotesCanvas: false` — usuário escolhe ativar.

---

## 10. Limitações conhecidas

- **Single monitor**: a canvas cobre o `primaryDisplay`. Em multi-monitor,
  notas só aparecem no monitor primário. Pra v2: detectar todos
  displays e abrir uma canvas por monitor (ou uma canvas que abrange
  todos via `Rectangle.union`).
- **Sem resize**: tamanho da nota é fixo (200×200). Adicionar resize
  daria mais flexibilidade. V2.
- **Sem categorias/tags**: pra organizar muitas notas, ajudaria. V2
  poderia evoluir pra mini-Kanban (colunas configuráveis com notas
  dentro).
- **Sem markdown/rich text**: textarea simples. Bom pra MVP.
- **Sem busca**: se tiver 50 notas, fica difícil achar uma específica.
  V2: barra de busca na "Notas" view (sidebar).

---

## Próxima leitura

- [decisoes/005-sticky-notes-canvas-vs-windows.md](decisoes/005-sticky-notes-canvas-vs-windows.md)
- [10 — Componentes UI](10-componentes-ui.md) — outros components
- [13 — Floating widget](13-floating-widget.md) — abordagem semelhante
