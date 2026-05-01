# 001 — electron-store em vez de SQLite

- **Data**: 2026-05-01
- **Status**: aceita
- **Contexto**: durante a Fase 2 do NotifyMe, escolhemos persistir os lembretes
  em disco usando SQLite via `node-sqlite3-wasm`. Após múltiplas tentativas
  de fix, o problema de `database is locked` se mostrou recorrente em ambiente
  Windows + OneDrive.

## Decisão

Usar **`electron-store`** (arquivo JSON com escrita atômica) em vez de
SQLite no NotifyMe.

## O caminho até aqui

Tentativa 1 — `node-sqlite3-wasm` (WASM, sem build nativo):

| Erro | Causa | Tentativa |
|---|---|---|
| `__dirname is not defined` | Vite bundleou a lib em ESM puro | Marcar como `external` no Vite |
| `Named export 'Database' not found` | Node ESM não detecta named exports do CJS | Usar `createRequire(import.meta.url)` |
| `database is locked` | OneDrive sincroniza `%APPDATA%\Roaming` e segura o `.db` enquanto SQLite tenta lock exclusivo | Sem solução barata |

O lock persistiu mesmo com `PRAGMA busy_timeout = 5000` e múltiplas
tentativas de limpeza de processo zombie. A causa-raiz é o OneDrive (e
potencialmente Windows Defender) mantendo handles abertos pro arquivo.
SQLite precisa de **lock exclusivo** em qualquer escrita — algo que o
OneDrive impede.

## Alternativas consideradas

1. **`better-sqlite3`** (binding nativo C++) — descartado: requer Visual
   Studio Build Tools no PC, contraria o objetivo de "open source instalável
   por qualquer um".

2. **Pasta diferente fora do OneDrive** (ex: `LocalAppData` ou `Temp`) —
   descartado por ser hack frágil. O usuário pode mudar políticas de
   sincronização do OneDrive a qualquer momento.

3. **Configurar o usuário pra excluir a pasta `notifyme` do OneDrive** —
   descartado: depende de ação do usuário, não é viável pra distribuição
   open source.

4. **Outra biblioteca SQLite (sql.js, etc)** — todas têm o mesmo problema
   de lock subjacente, já que SQLite mesmo precisa de lock exclusivo.

## Por que electron-store venceu

- **Escrita atômica via tempfile + rename**: imune a handles de leitura
  abertos por OneDrive/Defender
- **Sem dependência nativa, sem WASM**: `npm install` sempre funciona
- **API simples**: `store.get(key)`, `store.set(key, value)`
- **Tipos TS first-class**: generic `<StoreSchema>`
- **Migrations built-in**
- **Mantida pelo sindresorhus**: confiável, ativa

## Consequências

### O que perdemos
- Queries SQL → trocamos por `.filter()` / `.find()` do JavaScript
- Índices → desnecessários até ~10⁴ lembretes
- Transações ACID → suficiente garantia de atomicidade na escrita única

### O que ganhamos
- Reliability: sem lock errors em nenhum cenário
- Build simplicity: zero deps nativas
- Onboarding mais fácil pra contribuidores
- Bundle ~1MB menor (sem WASM)

### Se um dia o app crescer
- Até 1.000 lembretes: imperceptível
- Até 10.000 lembretes: ainda OK, lê tudo na memória
- Mais que isso: avaliar voltar pra SQLite (com pasta fora do OneDrive
  ou outra estratégia). Provavelmente nunca vai acontecer pra app de
  lembrete pessoal.

## Onde está a saga registrada

- [docs/04-persistencia.md](../04-persistencia.md) — explicação técnica completa
- [docs/03-ipc.md](../03-ipc.md) — IPC ainda funciona igual (transparente
  pra essa decisão)
