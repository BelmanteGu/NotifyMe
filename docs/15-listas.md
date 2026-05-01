# 15 — Listas (to-do com páginas estilo caderno)

> Aba "Listas" da janela main. Cada lista é uma "página" com título,
> data e itens checáveis. Visual de papel pautado com margem vermelha
> lateral — estilo caderno Tilibra. Suporta export/import `.md`.

---

## 1. O que é

Quinta aba da sidebar (entre Notas e Configurações). Para cada lista:

- **Título** editável inline (ex: "Compras de mercado", "TODO da semana")
- **Data** clicável (input nativo `type="date"`)
- **Itens** com checkbox + texto editável + botão remover
- **Adicionar item** via Enter (input no fim da lista)

Botões da página:
- **Anterior / Próxima** — navega entre listas
- **Página X de N** — paginação visível
- **Exportar** — salva a lista atual como `.md` (dialog nativo do SO)
- **Importar** — abre `.md` e cria nova lista
- **Apagar** — remove a lista atual (com confirmação)
- **Nova página** (header) — cria lista nova com data de hoje

---

## 2. Visual: papel pautado

```css
.task-list-page {
  background: #fffef7;            /* papel off-white */
  background-image: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent 31px,
    rgba(99, 132, 168, 0.18) 31px,
    rgba(99, 132, 168, 0.18) 32px
  );
  background-position: 0 96px;    /* linhas começam após o header */
}

.task-list-page::before {
  /* Margem vermelha lateral, estilo caderno */
  content: '';
  position: absolute;
  left: 56px;
  width: 1.5px;
  background: rgba(239, 68, 68, 0.45);
}
```

Texto e itens com `line-height: 32px` pra alinhar com as linhas
horizontais. Visual: parece que você tá escrevendo no papel.

Dark mode: papel vira `#1a1a1c` (escuro) com linhas em azul fraco
(rgba 138, 161, 199, 0.12). Margem vermelha em rosa-claro.

---

## 3. Formato `.md` pra import/export

Estrutura simples e legível:

```md
# Compras de mercado

Data: 01/05/2026

- [x] Leite
- [ ] Pão integral
- [ ] Ovos (12)
- [x] Café
```

Parser tolerante (`electron/services/markdown.ts`):
- **Título**: primeira linha começando com `# ` (heading H1)
- **Data**: linha começando com `Data:` em formato `DD/MM/AAAA`
- **Itens**: linhas começando com `-`, `*`, ou `+`, seguido de `[x]`
  ou `[ ]`, espaço, e o texto do item
- Linhas em branco e linhas que não casam com nenhum padrão são
  **ignoradas silenciosamente** (parser tolerante a markdown
  variado de outras fontes — Bear, Obsidian, Logseq, etc)

### Export

Botão "Exportar" abre `dialog.showSaveDialog` do Electron com:
- Filtro `.md`
- Default name: `2026-05-01-compras-de-mercado.md` (data + slug do título)

### Import

Botão "Importar" abre `dialog.showOpenDialog` filtro `.md`. Lê o arquivo,
parsea, cria nova lista (com IDs novos pros itens — não mantém os do
arquivo).

---

## 4. Estrutura

```
src/types/list.ts             ← TaskList, TaskItem, TaskListInput, TaskListPatch
electron/store/lists.ts       ← electron-store em lists.json
electron/services/lists.ts    ← ListsService (CRUD + items)
electron/services/markdown.ts ← listToMarkdown / markdownToList
electron/ipc/lists.ts         ← IPC handlers + dialog nativo
src/composables/useLists.ts   ← stub IPC + cache reativo
src/views/ListsView.vue       ← UI completa (paginação + papel pautado)
```

Sem componente filho separado — `TaskListPage` está inline em `ListsView.vue`.
Pra um MVP, simplifica.

---

## 5. ListsService API

```ts
class ListsService extends EventEmitter {
  list(): TaskList[]
  findById(id): TaskList | null
  create(input: { title, date }): TaskList
  createFromImport(input: { title, date, items }): TaskList
  update(id, patch: { title?, date? }): TaskList | null
  delete(id): boolean

  addItem(listId, text): TaskList | null
  toggleItem(listId, itemId): TaskList | null
  updateItemText(listId, itemId, text): TaskList | null
  removeItem(listId, itemId): TaskList | null
}
```

Cada mutação atualiza `updatedAt` da lista e emite `'changed'` pro
broadcast IPC.

---

## 6. Persistência

Arquivo: `%APPDATA%\notifyme\lists.json`

Estrutura:
```json
{
  "lists": [
    {
      "id": "abc-uuid",
      "title": "Compras de mercado",
      "date": "2026-05-01",
      "items": [
        {
          "id": "i1",
          "text": "Leite",
          "done": true,
          "createdAt": "2026-05-01T10:00:00Z"
        }
      ],
      "createdAt": "2026-05-01T10:00:00Z",
      "updatedAt": "2026-05-01T10:05:00Z"
    }
  ]
}
```

Cada operação CRUD escreve o arquivo inteiro (atomic via tempfile +
rename, padrão electron-store). Pra centenas de listas, instantâneo.

---

## 7. Paginação

```ts
const currentIndex = ref(0)
const currentList = computed(() => sortedLists.value[currentIndex.value])
```

`sortedLists` (do composable) ordena por `date` desc, com desempate
em `createdAt` desc. Lista mais recente = índice 0.

Navegação:
- **Anterior** (`canGoPrev`): `currentIndex < lists.length - 1` → vai pra mais antiga
- **Próxima** (`canGoNext`): `currentIndex > 0` → vai pra mais nova

Watcher em `lists.value.length` mantém `currentIndex` válido se
listas forem deletadas/criadas.

---

## 8. UX detalhes

- **Title input**: editável inline, persiste no `update(id, { title })`
- **Date input**: type=date nativo (calendário do SO), `update(id, { date })`
- **Item text**: editável inline (sem debounce no MVP — cada keystroke
  é IPC. Pode adicionar debounce em v2 se sentir lentidão)
- **Toggle checkbox**: clica → `toggleItem()`. Fundo laranja + check
  branco quando done. Texto fica strike-through.
- **Adicionar item**: input no fim da lista, Enter cria. Foco
  automático no input vazio depois de adicionar (`nextTick`).
- **Remover item**: botão X só aparece em hover (opacity 0 → 1).
  Hover vermelho.
- **Empty state** (sem listas): hero card com 2 CTAs ("Nova página" +
  "Importar .md").

---

## 9. Validações e edge cases

- **Lista vazia** (sem itens): página exibe só o input de "Adicionar item"
- **Texto vazio em item**: aceita (item ainda existe, user pode editar depois)
- **Data inválida**: input type=date nativo previne valores inválidos
- **Importar arquivo malformado**: parser ignora linhas estranhas, ainda
  cria a lista com o que conseguiu extrair (título "Lista importada"
  + data hoje + 0 itens se nada casou)
- **Apagar lista atual**: confirmação obrigatória via ConfirmDialog
  destructive

---

## 10. Limitações conhecidas (v2 candidates)

- **Sem reordenar items** (drag entre items pra reorganizar)
- **Sem subitens** (hierarquia de checklist)
- **Sem busca / filtro** entre listas
- **Sem undo** ao apagar
- **Sem agrupamento por mês/semana** na navegação (só linear)
- **Item edit sem debounce** (cada keystroke é IPC) — adicionar
  pra UX mais smooth com listas grandes
- **Frontmatter YAML no .md** (date como metadata) — atual usa "Data:"
  body line. Se quiser compat com Obsidian/Bear, frontmatter é mais padrão

---

## Próxima leitura

- [10 — Componentes UI](10-componentes-ui.md)
- [14 — Sticky notes](14-sticky-notes.md) — feature semelhante (canvas vs board)
