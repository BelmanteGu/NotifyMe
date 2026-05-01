# Ícones do NotifyMe

> Esta pasta hospeda os arquivos de ícone usados pelo `electron-builder`
> ao empacotar o app. **Os arquivos não existem ainda — esta doc explica
> como criar.**

## Arquivos esperados

| Arquivo | Uso | Tamanho mínimo |
|---|---|---|
| `icon.ico` | Ícone do `.exe` (instalador, atalho, taskbar) | 256×256 multi-resolução |
| `tray-icon.png` | Ícone da bandeja do sistema | 16×16 e 32×32 |

## Por que ainda não estão aqui

Eu (Claude) construí o NotifyMe inteiro, mas não posso gerar arquivos
binários (PNG/ICO). Sem os ícones:
- O `.exe` empacotado usa o ícone genérico do Electron (cinza)
- O tray icon fica invisível (mas o menu de contexto ainda funciona)

Funcionalmente OK pra MVP, mas visualmente meio sem graça.

## Como criar (~30 minutos)

### 1. Desenhe o sino laranja

A identidade visual é um **sino laranja** (cor primária do app: `#F97316`).

Ferramentas grátis:
- **Figma** (web) — https://figma.com
- **Inkscape** (desktop) — https://inkscape.org
- **GIMP** (desktop) — https://gimp.org

Use como referência: `<Bell />` do [lucide-vue-next](https://lucide.dev/icons/bell)
em laranja `#F97316` sobre fundo transparente ou laranja escuro.

### 2. Exporte os PNGs

Você precisa de várias resoluções pra HiDPI:

```
icon-16.png    16×16
icon-32.png    32×32
icon-48.png    48×48
icon-64.png    64×64
icon-128.png  128×128
icon-256.png  256×256
icon-512.png  512×512
```

### 3. Combine num `icon.ico` multi-resolução

Opção fácil — site online:
1. Vá em https://icoconvert.com/
2. Suba `icon-256.png`
3. Selecione "Multi-Size" e marque todas as resoluções acima
4. Baixa o `.ico` resultante
5. Renomeie pra `icon.ico` e coloque nesta pasta (`build/icon.ico`)

Opção CLI (ImageMagick):
```bash
magick icon-256.png -define icon:auto-resize=16,32,48,64,128,256 icon.ico
```

### 4. Crie o tray icon

```
tray-icon.png  16×16 (também 32×32 se quiser)
```

Para HiDPI, electron-builder reconhece automaticamente arquivos com
sufixo `@2x`:
```
tray-icon.png       16×16
tray-icon@2x.png    32×32
```

Coloque ambos em `build/` (ou `public/`).

### 5. Atualize o `electron-builder.yml`

Descomente a linha do icon:

```yaml
win:
  icon: build/icon.ico   # ← descomentar
  target:
    ...
```

### 6. Smoke-test

```bash
npm run dist:dir
./release/0.0.1/win-unpacked/NotifyMe.exe
```

Confira:
- Ícone da janela é o sino laranja (não mais o cinza do Electron)
- Tray icon visível na bandeja
- Atalhos da Área de Trabalho com o ícone correto

## Alternativa rápida (placeholder bonito)

Se você quer um ícone "qualquer" pra começar, sem desenhar:

1. Acesse https://icons8.com ou https://flaticon.com
2. Pesquise "bell" ou "notification"
3. Baixa um PNG/ICO grátis (atribuição obrigatória — coloque créditos no README)
4. Renomeia e coloca em `build/`

## Licença dos ícones criados

Quando fizer ícones próprios, eles são livres. Se usar de bancos como
Flaticon/Icons8, **siga a licença** (atribuição) — registre no README.
