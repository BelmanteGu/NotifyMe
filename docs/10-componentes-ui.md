# 10 — Componentes UI customizados

> Os componentes em `src/components/` (e `src/components/ui/`) que substituem
> elementos nativos do navegador por versões integradas ao tema do app.

---

## 1. Por que substituir nativos

Selects, scrollbars, alertas e barras de título nativas do navegador/SO
trazem 2 problemas:

1. **Visual destoa** — cores, bordas e tipografia não combinam com o tema do
   app (especialmente em dark mode)
2. **Comportamento limitado** — `<select>` nativo não permite customizar
   dropdown, animação, item destacado por keyboard, etc

A regra: **substituímos quando o nativo prejudica a sensação Apple-like
do app**. Mantemos nativos quando eles são padrão de plataforma e usuários
**esperam** o visual do SO (ex: file picker, dialog de confirmação destrutiva).

---

## 2. `<Select>` ([src/components/ui/Select.vue](../src/components/ui/Select.vue))

Substitui `<select>` nativo. Trigger estilo input com chevron, dropdown
glassmorphism com animação.

### Uso

```vue
<Select
  v-model="recurrence"
  :options="[
    { value: 'once', label: 'Uma vez' },
    { value: 'daily', label: 'Todo dia' },
    { value: 'weekly', label: 'Toda semana' },
  ]"
  placeholder="Selecionar"
/>
```

### Features

- **Teleport pra `<body>`** — dropdown sempre por cima de modais e
  containers com overflow:hidden (z-[200])
- **Position fixed calculada** do bounding rect do trigger
- **Auto-update** em scroll (capture:true) e resize
- **Keyboard navigation completa**:
  - Closed: Enter/Space/ArrowDown abre
  - Open: ArrowUp/Down navega item destacado, Enter seleciona, Esc fecha
- **Click fora fecha** — considera tanto trigger quanto dropdown teleportado
- **A11y**: `aria-expanded`, `aria-haspopup="listbox"`, `role="listbox"`,
  `role="option"`, `aria-selected`

### Decisões

- Por que **não usei radix-vue** ou shadcn-vue? Adiciona ~10KB extra ao
  bundle pra um Select. Componente custom tem 200 linhas e é zero-dep.
- Por que **Teleport**? Modais com `overflow: hidden` cortavam o dropdown.
  Veja [decisoes/003-select-customizado.md](decisoes/003-select-customizado.md).
- Por que **não animar height** do dropdown? Animação simples `opacity +
  translate-y` é mais responsiva. Height anim com max-height tem reflow ruim.

---

## 3. `<Sidebar>` ([src/components/Sidebar.vue](../src/components/Sidebar.vue))

Navegação vertical lateral com 3 sections do app: Lembretes / Timer /
Cronômetro. Largura fixa 208px (`w-52`).

### Uso

```vue
<Sidebar
  v-model:current="currentView"
  @open-about="aboutOpen = true"
/>
```

### Comportamento

- Item ativo: `bg-card` + `shadow-soft` (efeito "elevado")
- Item inativo: `text-muted-foreground` + hover sutil
- Footer da sidebar: botão "Sobre" + ThemeToggle empilhados
- Ícones: Lucide (`Bell`, `Timer`, `Clock4`)

### Tipos

```ts
export type View = 'reminders' | 'timer' | 'stopwatch'
```

Exportado pro App.vue importar e usar no `ref<View>()`.

---

## 4. `<TitleBar>` ([src/components/TitleBar.vue](../src/components/TitleBar.vue))

Barra de título customizada que substitui a do Windows nativo. Altura
fixa `h-9` (36px), drag region ativa, botões custom à direita.

### Uso

```vue
<TitleBar />
```

Auto-conectada via `window.notifyme.system.window.*` exposto pelo preload.

### Botões

| Ícone | Ação | Lucide |
|---|---|---|
| `Minus` | Minimiza a janela | `Minus` |
| `Square` / `Copy` | Maximiza ou restaura (alterna) | `Square` (maximizar) / `Copy` (restaurar) |
| `X` | Fecha (= esconde, app continua na tray) | `X` |

### Drag region

A área da esquerda (logo + título) tem `-webkit-app-region: drag` —
clicar e arrastar move a janela. Os botões têm `no-drag` (= `app-region:
no-drag`) pra serem clicáveis.

### Estado de maximizado

A TitleBar escuta `window:maximizedChanged` (push do Main) pra trocar o
ícone do botão maximize/restore. Veja [12-title-bar-customizada.md](12-title-bar-customizada.md).

---

## 5. `<EmptyState>` ([src/components/EmptyState.vue](../src/components/EmptyState.vue))

Estado vazio reutilizável com 2 variants:

```vue
<EmptyState variant="pending" @create="modalOpen = true" />
<EmptyState variant="completed" />
```

| Variant | Ícone | Animação | Botão |
|---|---|---|---|
| `pending` | Bell (sino) | `animate-bell-ring` (balança) | "Criar primeiro lembrete" |
| `completed` | CheckCheck | nenhuma (estático) | nenhum |

### Animação `bell-ring`

Definida em `src/style.css`. Rotação sequencial -14° / +12° / -10° / +8°
/ -5° / +3° em 3.2s, com pausa de ~44% no zero pra não ficar irritante.
`transform-origin: top center` (oscila do topo, como sino real).

---

## 6. `<ReminderModal>` ([src/components/ReminderModal.vue](../src/components/ReminderModal.vue))

Modal de criar lembrete com:
- Título (input)
- Descrição (textarea)
- Data (input texto com mask `DD/MM/AAAA`)
- Hora (input texto com mask `HH:MM`)
- Repetir (`<Select>`)
- Erro inline em vermelho se data/hora inválida

### Máscaras de data e hora

Helpers em `src/utils/formatDate.ts`:
- `maskBRDate(value)` — aplica `DD/MM/AAAA` enquanto digita
- `maskTime(value)` — aplica `HH:MM`
- `combineBRDateTime(brDate, time)` — combina + valida → retorna ISO 8601 ou `null`

Validação inclui sanity check: `31/02/2026` retorna `null` (não vira "03/03"
com Date silenciosa).

### Glassmorphism + cantos arredondados

`rounded-xl` (32px) + `glass-strong`. Backdrop `bg-black/60 backdrop-blur-md`.

---

## 7. `<AboutModal>` ([src/components/AboutModal.vue](../src/components/AboutModal.vue))

Dialog "Sobre o NotifyMe" com:
- Ícone grande do app (sino com glow atrás)
- Versão (lida dinamicamente do `package.json` via import)
- Botões: GitHub, Reportar problema, Apoiar (Ko-fi + Sponsors)

Links abrem no navegador padrão via `window.notifyme.system.openExternal`
(que valida URL e usa `shell.openExternal` no Main).

---

## 8. `<ReminderCard>` ([src/components/ReminderCard.vue](../src/components/ReminderCard.vue))

Card de um lembrete na lista. 3 estados visuais:

| Estado | Border | Ícone | Visual |
|---|---|---|---|
| Pendente normal | `border-border` | Bell laranja gradient | hover lift |
| Pendente atrasado | `border-destructive/40` | AlertCircle vermelho | label vermelha |
| Concluído | `border-border` | CheckCircle2 laranja claro | opacity 65%, título riscado |

### Menu de ações

Botão `MoreVertical` (3 pontinhos) no canto superior direito abre dropdown
glass-strong com:
- "Marcar como concluído" (não aparece se já completed)
- "Excluir" (vermelho)

Click fora fecha (listener no `document`, removido em `onBeforeUnmount`).

---

## 9. `<ThemeToggle>` ([src/components/ThemeToggle.vue](../src/components/ThemeToggle.vue))

Botão de alternar light/dark. Ícone `Sun` ou `Moon` conforme estado atual.
Estilo: button `w-10 h-10 rounded-xl` consistente com outros botões do header.

Usa `useTheme()` ([src/composables/useTheme.ts](../src/composables/useTheme.ts))
que persiste em `localStorage` e detecta preferência do SO no primeiro boot.

---

## 10. Convenção: classes utilitárias custom

Definidas em `src/style.css`:

| Classe | O que faz |
|---|---|
| `.glass` | translucent + backdrop-blur (cards Apple-like) |
| `.glass-strong` | mesma idea, mais opaca (modais) |
| `.icon-badge` | gradient laranja + box-shadow + inset highlight |
| `.btn-primary` | gradient laranja + shadow tactile + hover lift |
| `.lift` | hover translate-Y (-1px) suave |
| `.glow-pulse` | animação pulsante de glow (alerta) |
| `.animate-bell-ring` | sino balançando (empty state) |
| `.bg-app` | gradient radial laranja sutil de fundo |
| `.scroll-overlay` | overflow:overlay onde suportado |
| `.drag-region` / `.no-drag` | -webkit-app-region |

---

## Próxima leitura

- [11 — Timer e Cronômetro](11-timer-e-cronometro.md) — composables singleton + sound
- [12 — Title bar customizada](12-title-bar-customizada.md) — frame:false + IPC controls
- [09 — Glossário](09-glossario.md)
