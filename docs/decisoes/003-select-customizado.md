# 003 — Select customizado em vez de `<select>` nativo

- **Data**: 2026-05-01
- **Status**: aceita
- **Contexto**: o modal de criar lembrete tinha um `<select>` nativo pro
  campo "Repetir". O dropdown abria com visual genérico do Chromium —
  fundo azul (Windows accent), letras brancas, sem combinar com o tema
  laranja/glassmorphism do app. Especialmente feio em dark mode.

## Decisão

Implementar componente `<Select>` customizado em
`src/components/ui/Select.vue` que substitui o `<select>` nativo. Renderiza
o dropdown via `<Teleport to="body">` com `position: fixed` calculada do
trigger button.

## Alternativas consideradas

1. **Manter `<select>` nativo, customizar só com CSS**
   - O `<select>` é um "replaced element" — `appearance: none` esconde a
     seta padrão mas o dropdown em si **não dá pra estilizar** em browsers
     modernos. Limitação fundamental do navegador.
   - Descartado

2. **Usar lib `radix-vue` ou `shadcn-vue`** (adapta o shadcn-ui pra Vue)
   - Componentes muito bons, headless, totalmente customizáveis
   - Adiciona ~10-20KB ao bundle (Renderer)
   - Pra um Select simples, é overkill
   - Pode entrar se a gente precisar de Combobox + Dialog + Popover etc
     no futuro
   - Descartado por agora

3. **Usar `vue-multiselect` ou similar**
   - Selectores mais antigos, com API datada
   - Opinião visual forte (não combina com nosso tema sem hack)
   - Descartado

4. **Custom componente, mas dropdown com `position: absolute`**
   - Foi a primeira tentativa
   - Problema: o componente ficava dentro do modal que tem
     `overflow: hidden` no card, cortando o dropdown
   - Aumentar `z-index` não resolve overflow:hidden
   - Pivotamos pra Teleport

## Por que custom + Teleport venceu

- Zero deps adicionais (só Lucide pra ícones, já tínhamos)
- ~200 linhas de Vue (componente + style)
- Total controle visual: mesma paleta do app, dark mode, animação,
  glassmorphism
- Teleport pra `<body>` garante que o dropdown apareça **acima de qualquer
  modal**, ignorando overflow de containers ancestrais
- Position fixed calculada do `getBoundingClientRect()` mantém alinhamento
  com o trigger mesmo em scroll/resize

## Consequências

### O que ganhamos
- Visual coerente com o resto do app
- Keyboard navigation completa (Up/Down/Enter/Escape/Space)
- A11y: aria-expanded, aria-haspopup, role=listbox, role=option
- Animação de entrada suave (fade + translate)
- Funciona dentro de modais, drawers, qualquer container

### O que perdemos
- Não tem o "type-ahead" nativo do `<select>` (digitar letra pula pra
  primeiro item começando com ela). Pra MVP com 3 opções, irrelevante.
  Posso adicionar depois.
- Não funciona em ambientes sem JS (irrelevante — somos Electron)

### Pegadinhas técnicas
- `handleClickOutside` precisa considerar tanto o trigger quanto o
  dropdown teleportado (2 refs separados, não pode usar só `.contains`)
- Posição precisa ser recalculada em scroll (com `capture: true` pra
  pegar scroll de containers ancestrais) e resize
- z-index alto (`z-[200]`) pra ficar acima de qualquer modal (z-50)

## Quando voltar pra `<select>` nativo

Nunca, provavelmente. Mesmo se a gente quisesse "voltar ao simples",
o feedback visual seria pior. Único cenário plausível: se o NotifyMe
precisar virar PWA web (não Electron), aí Selects mobile-friendly
nativos podem ser melhor que recriar dropdown próprio em mobile —
porque mobile tem UI nativa (rolinha de iOS, etc).

## Onde está a documentação técnica

- [docs/10-componentes-ui.md](../10-componentes-ui.md) seção 2 — Select component
