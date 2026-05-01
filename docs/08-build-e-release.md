# 08 — Build e release

> Como empacotar o NotifyMe num `.exe` distribuível e publicar no GitHub.

---

## 1. Stack de empacotamento

- [`electron-builder`](https://www.electron.build/) — pega o app rodando em
  `npm run dev` e gera arquivos finais (instalador NSIS, executável portable, etc)
- [`vue-tsc`](https://github.com/vuejs/language-tools) — type-check do Vue
- [`vite`](https://vite.dev) — build do Renderer e do Main/Preload (via `vite-plugin-electron`)

Tudo orquestrado pelos scripts do `package.json`:

```bash
npm run build         # Só compila TS/Vue → dist/ + dist-electron/
npm run dist          # Compila + empacota .exe (instalador + portable)
npm run dist:dir      # Compila + empacota mas SEM instalador (só a pasta)
npm run dist:portable # Compila + só portable .exe
```

Configuração principal em `electron-builder.yml`.

---

## 2. Saídas geradas

```
release/
└── 0.0.1/
    ├── NotifyMe-Setup-0.0.1.exe          ← instalador NSIS (~80MB)
    ├── NotifyMe-0.0.1-portable.exe       ← portable single-file (~80MB)
    ├── win-unpacked/                     ← versão "dir" (sem instalador)
    │   ├── NotifyMe.exe
    │   ├── resources/app.asar
    │   └── ...
    ├── builder-debug.yml
    └── latest.yml
```

Pode ignorar `release/` no `.gitignore` (já está) — esses arquivos não vão
pro git, só pro GitHub Releases.

---

## 3. Configuração do `electron-builder.yml`

Pontos importantes:

### `appId: com.belmantegu.notifyme`
Identificador único do app (formato reverse-domain). Windows usa pra
diferenciar diferentes apps na lista de programas instalados.

### `productName: NotifyMe`
Nome exibido pro usuário (no atalho da Área de Trabalho, na lista de
programas instalados, no menu Iniciar).

### `directories.output: release/${version}`
Cada versão sai numa subpasta com o número da versão. Útil pra manter
binários antigos.

### `files`
Glob de o que entra no `.exe`. Cobre dist/, dist-electron/, package.json
e exclui:
- node_modules dispensáveis (READMEs, tests, docs internas)
- source maps (`*.map`)

### `asar: true`
Concatena os JSs num único arquivo `app.asar`. Vantagens:
- Inicialização mais rápida (1 fopen vs centenas)
- Leve ofuscação (não dá pra ver código facilmente)
- Reduz tamanho na pasta

Desvantagem: arquivos dentro de `app.asar` não dão pra ler com `fs.readFile`
direto — precisam ser **resources** (`extraResources` no config).

### `win.target: [nsis, portable]`

- **`nsis`** — instalador `.exe` que o usuário roda e ele se instala em
  `Program Files` ou `AppData\Local\Programs` (depende do `perMachine`).
- **`portable`** — single-file `.exe` que roda sem instalar (modo "rodar
  do pendrive"). Aceita até `--portable-update`.

### `nsis.perMachine: false`
Instala **só pro usuário atual**, não pra todos. Vantagem: sem UAC, sem
prompt de admin. Pra apps utilitários como NotifyMe, é a escolha certa
(usuário não-admin pode instalar).

### `nsis.deleteAppDataOnUninstall: false`
Importante: ao desinstalar, **não apaga** `%APPDATA%\notifyme\data.json`.
Os lembretes do usuário ficam preservados — se ele reinstalar amanhã,
volta tudo.

### `installerLanguages: [pt_BR, en_US]`
Wizard de instalação detecta idioma do Windows e mostra em pt-BR ou en-US.

---

## 4. Ícone do .exe

A config tem `# icon: build/icon.ico` comentado. Quando você adicionar
um `build/icon.ico` (256×256 mínimo, ICO multi-resolução), descomente.

Sem ícone customizado, o Electron usa o ícone padrão dele (cinza). É o
estado da Fase 6 — a Fase 7 substitui.

### Como gerar o icon.ico

1. Desenhe o sino laranja em vetor (Figma, Inkscape, Illustrator)
2. Exporte como PNG nas resoluções: 16, 32, 48, 64, 128, 256
3. Combine num `.ico` multi-resolução. Ferramentas:
   - https://icoconvert.com/ (online, grátis)
   - https://github.com/iconjs (CLI)
   - ImageMagick: `magick icon-256.png -resize 16x16 icon-16.ico`

---

## 5. Como rodar o build

### Pré-requisitos
- Node 20+ instalado
- `npm install` rodado uma vez
- Você está no Windows (pra builds Windows). Builds cross-platform são
  possíveis mas mais complicados.
- **Modo de desenvolvedor do Windows ativado** (veja seção a seguir) —
  necessário porque o `electron-builder` extrai um pacote com symlinks
  do macOS internamente.

### Pegadinha: erro "Cannot create symbolic link"

Sintoma típico:

```
ERROR: Cannot create symbolic link : O cliente não tem o privilégio necessário.
       : ...\winCodeSign\...\darwin\10.12\lib\libcrypto.dylib
```

Causa: o `electron-builder` baixa um pacote auxiliar chamado `winCodeSign`
(usado pra assinatura de binários) que **contém symlinks do macOS**, e
contas Windows comuns não têm permissão pra criar symlinks por padrão —
mesmo que a gente nem use signing.

**Solução recomendada — ativar Modo de Desenvolvedor (uma vez só):**

1. `Win + I` → **Configurações**
2. **Sistema → Para desenvolvedores**
3. Liga **"Modo de desenvolvedor"**
4. Confirma o aviso

Depois, limpa o cache corrompido:

```powershell
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron-builder\Cache" -ErrorAction SilentlyContinue
```

E roda o build de novo. Funciona daí em diante.

**Alternativa**: rodar PowerShell como administrador pra cada build.
Funciona mas é chato.

### Comandos

```bash
# Build completo: instalador + portable
npm run dist

# Só pasta unpacked (rápido, pra testar)
npm run dist:dir

# Só portable
npm run dist:portable
```

Tempo esperado: 2-5 minutos no primeiro build (baixa o Electron
pré-built ~120MB). Builds subsequentes são mais rápidos (cache).

---

## 6. Tamanho esperado

| Arquivo | Tamanho aprox |
|---|---|
| `NotifyMe-Setup-0.0.1.exe` | ~75-90 MB |
| `NotifyMe-0.0.1-portable.exe` | ~75-90 MB |
| `win-unpacked/` total | ~250 MB descompactado |

Maior parte é o runtime do Electron (Chromium + Node). Não dá pra
reduzir significativamente — é o preço do Electron. Pra comparação,
`better-sqlite3` adicionaria ~5MB; `electron-store` adicionou <100KB.

---

## 7. Smoke-test do build

Antes de publicar, sempre rodar e testar:

```bash
# 1. Build
npm run dist:dir

# 2. Roda o exe
./release/0.0.1/win-unpacked/NotifyMe.exe

# 3. Confere:
# - Janela abre normalmente
# - Tray icon aparece (ou área onde apareceria)
# - Cria lembrete pra +1 min
# - Janela de alerta abre no horário
# - Botão "Concluído" funciona
# - Quit pelo menu da tray realmente sai do processo
```

Se algum passo falhar, fix e rebuild. **Nunca publique sem smoke-test.**

---

## 8. Publicando no GitHub Releases

### Manual:

```bash
# 1. Bump version em package.json (ex: 0.0.1 → 0.1.0)
# 2. Commit e tag
git add package.json
git commit -m "chore: bump version to 0.1.0"
git tag v0.1.0
git push origin main --tags

# 3. Build
npm run dist

# 4. No GitHub: Releases → Draft new release → seleciona a tag
# 5. Sobe os arquivos:
#    - NotifyMe-Setup-0.1.0.exe
#    - NotifyMe-0.1.0-portable.exe
# 6. Escreve o changelog com base no git log desde a última tag
# 7. Publica
```

### Automatizado (futuro):

Pode-se configurar GitHub Actions pra:
1. Trigger em push de tag `v*`
2. Rodar `npm install && npm run dist`
3. Criar release automaticamente com os arquivos

Não implementamos isso na Fase 6 — fica como melhoria futura.

---

## 9. Code signing (opcional, recomendado)

Sem code signing, o Windows mostra **SmartScreen warning** ("Esse app
pode prejudicar seu PC, deseja continuar?") quando o usuário tenta
instalar.

Soluções:
1. **Comprar certificado** (caro: $200-400/ano em [Sectigo](https://sectigo.com/),
   [DigiCert](https://www.digicert.com/), etc)
2. **Self-signed** (warning continua, mas pelo menos confirma que é
   "seu" cert sempre)
3. **Não assinar e aceitar o warning** — opção pra projetos open source
   pequenos. Documentar no README que é normal e seguro.

NotifyMe vai pela opção 3 por enquanto. Quem quiser, baixa, vê o
warning, clica "Mais informações" → "Executar mesmo assim".

---

## 10. Auto-update (não implementado)

`electron-builder` suporta auto-update via `electron-updater`. Em apps
profissionais, isso é importante. Pra NotifyMe MVP:
- Pulamos por simplicidade
- Usuário baixa manual quando quiser atualizar
- Funciona perfeitamente pro caso de uso

Pode ser adicionado na v2 com config tipo:

```yaml
publish:
  - provider: github
    owner: BelmanteGu
    repo: notifyme
```

E no app:

```ts
import { autoUpdater } from 'electron-updater'
autoUpdater.checkForUpdatesAndNotify()
```

---

## Próxima leitura

- [09 — Glossário](09-glossario.md) — todos os termos técnicos
- [00 — Visão geral](00-visao-geral.md)
