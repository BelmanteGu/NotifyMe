# 14 — Sticky notes (notas adesivas)

> Aba "Notas" da janela main com um board onde o usuário cria,
> arrasta e edita post-its visuais coloridos.

---

## 1. O que é

Quarta aba na sidebar (entre Cronômetro e Configurações). Abre uma
view com:
- Header: título "Notas" + subtitle + botão "Nova nota"
- Body: **board** com `position: relative` + `overflow: auto` onde
  cada nota fica `position: absolute`
- Empty state quando não tem notas

Cada nota:
- **6 cores** disponíveis (amarelo, rosa, azul, verde, laranja, roxo)
- **Texto editável inline** (textarea)
- **Drag & drop** dentro do board com animação bouncy
- **Rotação base aleatória** (-3° a +3°) na criação pra parecer "natural"
- **Persistente** em `notes.json`

---

## 2. Por que aba interna (e não overlay na tela)

A primeira tentativa foi um **canvas window transparente fullscreen**
always-on-top com mouse pass-through. Ao revisar, ficou claro que isso
descaracteriza o app: NotifyMe fica sobreposto a tudo, e o usuário
não tem clara separação entre o app e o desktop.

Abordagem atual: aba interna. Mais natural pra um app de produtividade
multi-funcional. Veja
[ADR 005](decisoes/005-sticky-notes-canvas-vs-windows.md).

---

## 3. Coordenadas relativas ao board

Antes (no canvas overlay), `localPos.x/y` eram coordenadas da viewport.
Agora o board é menor que a viewport (sidebar à esquerda, header acima),
então as coordenadas precisam ser **relativas ao board**.

Solução: Vue **provide / inject** do board ref:

```ts
// NotesView.vue
const boardRef = ref<HTMLElement | null>(null)
provide('notesBoard', boardRef)
```

```ts
// StickyNote.vue
const boardRef = inject<Ref<HTMLElement | null>>('notesBoard', ref(null))

function getRelativeMouse(event: MouseEvent) {
  const rect = boardRef.value?.getBoundingClientRect()
  return {
    x: event.clientX - rect.left + boardRef.value.scrollLeft,
    y: event.clientY - rect.top + boardRef.value.scrollTop,
  }
}
```

Inclui `scrollLeft/Top` pra notas continuarem corretas mesmo com scroll
horizontal/vertical no board.

---

## 4. Animação "papel balançando"

CSS-only. Cada nota tem:

```css
.sticky-note {
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform: rotate(var(--rotation, 0deg));
  transform-origin: top center;
}

.sticky-note.is-dragging {
  transform: rotate(calc(var(--rotation) + 2deg)) scale(1.04);
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.22);
  transition: none; /* responde imediato durante drag */
}
```

Quando solta (mouseup), `is-dragging` é removido → `transform` volta
pro estado normal com transition bouncy → settle natural com leve
oscilação.

`will-change: transform` força GPU layer pra animação ficar 60fps
sem travada.

---

## 5. Estrutura

```
src/types/note.ts             ← Note, NoteColor, NoteInput, NotePatch
                                 + COLOR_PALETTES (6 cores light/dark)

electron/store/notes.ts       ← electron-store em notes.json
electron/services/notes.ts    ← NotesService (CRUD)
electron/ipc/notes.ts         ← IPC handlers

src/composables/useNotes.ts   ← stub IPC
src/views/NotesView.vue       ← aba "Notas" com board interno
src/components/StickyNote.vue ← nota individual draggable
```

Note: **não** tem `windows/notesCanvasWindow.ts` nem `views/
NotesCanvasView.vue`. A janela main basta.

---

## 6. Color palette

```ts
export const COLOR_PALETTES: Record<NoteColor, { light: ..., dark: ... }> = {
  yellow: { light: { bg: '#FEF3C7', text: '#78350F' }, dark: ... },
  pink:   { ... },
  blue:   { ... },
  green:  { ... },
  orange: { ... },
  purple: { ... },
}
```

Tons pastel claros pra parecer papel real. No dark mode, inverte:
fundo escuro saturado + texto claro pastel.

Color picker é um popover no header da nota (botão `Palette` icon).
Click num círculo → emit `update` com nova cor → IPC → persistido.

---

## 7. Persistência

Arquivo: `%APPDATA%\notifyme\notes.json`

```json
{
  "notes": [
    {
      "id": "abc-uuid",
      "text": "Comprar leite",
      "x": 320, "y": 180,
      "color": "yellow",
      "rotation": 1.7,
      "createdAt": "2026-05-01T10:00:00Z",
      "updatedAt": "2026-05-01T10:05:00Z"
    }
  ]
}
```

### Debounce do texto

Cada keystroke disparar IPC seria caro. Solução: debounce de 400ms.
Se user para de digitar por 400ms, salva. Se continua, reseta. Também
flushta no `blur` pra garantir que a última edição foi persistida:

```ts
let textTimeout: number | null = null

function onTextInput(event: Event) {
  if (textTimeout !== null) clearTimeout(textTimeout)
  textTimeout = window.setTimeout(() => {
    emit('update', { text: localText.value })
  }, 400)
}
```

---

## 8. Sincronização entre janelas

Como a state vive no Main, qualquer janela aberta (atualmente só a
main, mas no futuro talvez widget ou outro lugar) recebe push
`notes:changed` ao mutar. Re-fetch automático.

```ts
// useNotes.ts
window.notifyme.notes.onChanged(() => refresh())
```

---

## 9. UX detalhes

- **Empty state**: ícone grande + texto "Nenhuma nota ainda" + CTA "Criar primeira nota"
- **Header das notas**: oculto por default (opacity 0.45), aparece no hover (0.85). Mostra color picker e botão X.
- **Clamp de drag**: `Math.max(-160, x)` pra não deixar a nota ficar inteiramente fora do board (pelo menos 40px sempre visíveis).
- **Scroll**: se notas saem da área visível, board faz scroll. Coordenadas reagem corretamente ao `scrollLeft/Top`.

---

## 10. Limitações conhecidas

- **Nota não pode arrastar pra fora do app** (overlay desktop foi removido).
- **Sem resize**: tamanho fixo 200×200. V2 poderia adicionar.
- **Sem markdown / rich text**: textarea simples.
- **Sem categorias / tags**: ajudaria pra organizar 50+ notas.
- **Sem busca**: idem.

V2 poderia evoluir pra mini-Kanban (colunas configuráveis com notas
dentro), mas isso é trabalho separado.

---

## Próxima leitura

- [decisoes/005-sticky-notes-canvas-vs-windows.md](decisoes/005-sticky-notes-canvas-vs-windows.md) — ADR
- [10 — Componentes UI](10-componentes-ui.md)
