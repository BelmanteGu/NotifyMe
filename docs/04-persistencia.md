# 04 — Persistência: arquivo JSON via electron-store

> Como o NotifyMe guarda os lembretes em disco. **Não usamos SQLite.**
> Esta doc explica o porquê — incluindo a tentativa anterior que falhou.

---

## 1. Decisão atual

```
electron/store/index.ts    ← inicializa o store, expõe getStore()
electron/services/reminders.ts  ← lê e escreve via store.get / store.set
```

A lib é [`electron-store`](https://github.com/sindresorhus/electron-store)
(do sindresorhus, autor de toneladas de libs essenciais do ecossistema Node).

Na prática:
- **Os lembretes ficam num arquivo JSON** em `%APPDATA%\notifyme\data.json`
- Cada operação (criar, deletar, marcar) lê o array, modifica, e reescreve
  o JSON inteiro
- Pra centenas de lembretes isso é instantâneo (microssegundos)

---

## 2. Por que NÃO SQLite (a saga)

A primeira tentativa foi com `node-sqlite3-wasm`. Crashes encontrados em ordem:

### Round 1 — `__dirname is not defined`
O Vite bundleou o `node-sqlite3-wasm` dentro do `main.js`. Como o package
é `"type": "module"`, o `main.js` é tratado como ES Module — onde `__dirname`
não existe. A lib usa `__dirname` internamente pra carregar o `.wasm`.

**Fix tentado**: marcar como `external` no `vite.config.ts` pra ser
carregado em runtime de `node_modules` (onde é CJS e `__dirname` funciona).

### Round 2 — `Named export 'Database' not found`
Com a lib externalizada, agora `import { Database } from 'node-sqlite3-wasm'`
falha porque o Node não detecta named exports de pacotes CJS quando
importados via ESM.

**Fix tentado**: usar `createRequire(import.meta.url)` pra carregar a lib
como CJS de dentro do módulo ESM.

### Round 3 — `database is locked`
Agora a lib carrega, mas a primeira chamada `db.exec(...)` dentro de
`runMigrations` dá erro de lock. Mesmo apagando o arquivo, mesmo após reboot,
o lock voltava.

Hipótese mais forte: **o OneDrive sincroniza `%APPDATA%\Roaming` em
background**. Quando o app cria/escreve no `.db`, o OneDrive abre o arquivo
pra ler/sincronizar. SQLite não consegue obter lock exclusivo enquanto
outro handle existe.

Mesmo `PRAGMA busy_timeout = 5000` não resolveu — o OneDrive segura
o handle por mais tempo que isso.

---

## 3. Por que electron-store resolve

A lib escreve com **estratégia atômica**:

```
1. Escreve no arquivo temporário data.json.tmp
2. Renomeia data.json.tmp → data.json (operação atômica do SO)
3. Pronto
```

Mesmo que o OneDrive ou Defender estejam **lendo** o `data.json`, o
**rename** é instantâneo e sobrescreve sem precisar de lock exclusivo.
Não tem janela de tempo pra dar lock.

Bônus: se o app crashar no meio de uma escrita, o arquivo `data.json` original
fica intacto (a escrita interrompida ficou no `.tmp` e é descartada). Sem
corrupção.

---

## 4. Trade-offs aceitos

| Funcionalidade | SQLite | electron-store | Importante pro NotifyMe? |
|---|---|---|---|
| Queries SQL | ✅ | ❌ (filter no JS) | Não — temos no máx alguns lembretes |
| Índices | ✅ | ❌ | Não, mesma razão |
| Transações ACID | ✅ | Atomic writes | Suficiente pra 1 escrita por vez |
| Performance pra 10⁵ rows | ✅ | ❌ | Não, jamais teremos isso |
| Performance pra 10² rows | ✅ | ✅ | Sim, esse é o tamanho real |
| Migrations versionadas | Manual | Built-in | Empate |
| Build sem dor | ❌ (nativo) | ✅ | Crítico |
| Imune a OneDrive/Defender | ❌ | ✅ | Crítico |

---

## 5. API do electron-store

A interface é tipada com generic schema:

```ts
interface StoreSchema {
  reminders: Reminder[]
  schemaVersion: number
}

const store = new Store<StoreSchema>({
  name: 'data',
  defaults: { reminders: [], schemaVersion: 1 },
})
```

Operações principais:

```ts
store.get('reminders')          // Reminder[] (vazio se não existe)
store.get('reminders', [])      // com fallback explícito
store.set('reminders', [...])   // sobrescreve a chave
store.delete('reminders')       // apaga a chave
store.has('reminders')          // boolean
store.clear()                   // apaga TUDO
store.path                      // caminho absoluto do data.json
```

Diferente do SQLite, **não tem `.find()` ou `.where()`**. A gente lê o array
inteiro e usa `.filter()` / `.find()` do JavaScript. Isso é totalmente
suficiente até alguns milhares de items.

---

## 6. Como o RemindersService usa

Cada método do service segue o padrão:

```ts
delete(id: string): boolean {
  const all = this.store.get('reminders', [])
  const filtered = all.filter((r) => r.id !== id)
  if (filtered.length === all.length) return false   // não achou
  this.store.set('reminders', filtered)              // grava
  return true
}
```

**Por que não modificar in-place?** Imutabilidade: criamos um array novo
em vez de mutar o existente. Isso é defensivo — se algum dia o store
expor o array por referência (cache de leitura), evitamos surpresas.

---

## 7. Onde o arquivo fica

```
C:\Users\<você>\AppData\Roaming\notifyme\data.json
```

Mesma pasta do SQLite anterior, mesma localização. O OneDrive ainda pode
sincronizar — mas como a escrita é atômica, **não tem mais lock**.

Conteúdo do arquivo (exemplo):

```json
{
  "schemaVersion": 1,
  "reminders": [
    {
      "id": "abc-123",
      "title": "Pagar o DAS",
      "triggerAt": "2026-05-20T09:00:00.000Z",
      "recurrence": "once",
      "status": "pending",
      "createdAt": "2026-05-01T14:30:00.000Z"
    }
  ]
}
```

Você pode abrir esse arquivo no editor de texto pra inspecionar/editar
manualmente. Útil pra debug.

---

## 8. Migrations (caso a gente precise no futuro)

`electron-store` tem suporte built-in:

```ts
new Store({
  defaults,
  migrations: {
    '1.0.0': (store) => {
      // primeira release, nada pra migrar
    },
    '1.1.0': (store) => {
      // adicionar campo `priority` em todos os lembretes
      const reminders = store.get('reminders', []) as Reminder[]
      store.set(
        'reminders',
        reminders.map((r) => ({ ...r, priority: 'normal' }))
      )
    },
  },
})
```

Não estamos usando ainda — `defaults` cobre o cenário inicial.

---

## 9. Quando voltar pra SQLite (talvez nunca)

Sinais que indicariam que precisaríamos de SQLite:
- Mais de ~10.000 lembretes (UI fica lenta lendo tudo)
- Necessidade de queries complexas (ex: "lembretes nesta semana
  agrupados por dia") com performance crítica
- Múltiplos processos escrevendo simultaneamente

Pra um app de lembretes pessoal, **nada disso vai acontecer**. SQLite
ficou registrado no glossário como conhecimento, e como decisão
(`docs/decisoes/001-electron-store-vs-sqlite.md`) — caso voltemos
algum dia.

---

## Próxima leitura

- [03 — IPC](03-ipc.md) — quem chama os métodos do `RemindersService`
- [05 — Agendamento com node-cron](05-agendamento-cron.md) — *(Fase 3)*
