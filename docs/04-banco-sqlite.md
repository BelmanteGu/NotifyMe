# 04 — Banco SQLite no Main process

> Como persistir os lembretes em disco. Schema, migrations, e a escolha de
> usar `node-sqlite3-wasm` em vez de `better-sqlite3`.

---

## 1. Por que SQLite (e não JSON, IndexedDB ou JSON Server)

Já discutido em [00-visao-geral.md](00-visao-geral.md), mas vale o detalhe:

| Opção | Onde fica | Prós | Contras |
|---|---|---|---|
| Arquivo `.json` | Disco | Simples, legível, zero dep | Lê arquivo inteiro pra qualquer query, perde dados em crash |
| IndexedDB | Renderer | API web nativa | Só existe no Renderer — Main não consegue agendar cron sem IPC contínuo |
| SQLite | Disco (.db) | SQL, transações, queries indexadas, escala fácil | Curva inicial pequena |
| Servidor (Postgres/Mongo) | Rede | Industrial | Requer instalar/configurar — fora de escopo pra app desktop pequeno |

**SQLite venceu** pra app desktop offline. O `.db` fica em
`%APPDATA%\NotifyMe\notifyme.db` no Windows e sobrevive a updates.

---

## 2. Por que `node-sqlite3-wasm`

A escolha do *driver* JavaScript pra SQLite tem 3 candidatos populares:

| Driver | Como funciona | Build no Windows |
|---|---|---|
| **better-sqlite3** | Binding C++ nativo, sync, super rápido | **Requer Visual Studio Build Tools** |
| **sqlite3** (node-sqlite3) | Binding C++ nativo, async | **Requer Visual Studio Build Tools** |
| **node-sqlite3-wasm** | SQLite compilado pra WASM | **Zero build, funciona em qualquer máquina** |

Pra um projeto open source que vai ser instalado por usuários comuns, **forçar
o usuário a instalar Visual Studio Build Tools é inaceitável**. Mesmo pra
desenvolvimento, o `npm install` pode falhar pra contribuidores que não
tenham as ferramentas.

`node-sqlite3-wasm` paga ~1MB extra no bundle final (o WASM compilado), em
troca de:
- ✅ `npm install` sempre funciona
- ✅ Sem `electron-rebuild` quando atualizar Electron
- ✅ Sem linker errors esquisitos
- ✅ API quase idêntica ao `better-sqlite3` (Promise-free, síncrona)

Pra um app de lembretes (alguns milhares de rows max), a performance é
**indistinguível**.

---

## 3. API que usamos

```ts
import { Database } from 'node-sqlite3-wasm'

const db = new Database('caminho/do/arquivo.db')

// Sem retorno
db.exec(`CREATE TABLE foo (...)`)

// Statement preparado
const stmt = db.prepare('SELECT * FROM reminders WHERE id = ?')

// Pega 1 row (ou undefined)
const row = stmt.get([id])

// Pega array de rows
const rows = stmt.all([])

// Executa INSERT/UPDATE/DELETE — retorna { changes, lastInsertRowid }
const result = db.prepare('DELETE FROM reminders WHERE id = ?').run([id])

db.close()
```

Note que `.get()`, `.all()`, `.run()` recebem **array** de parâmetros (não spread).
Isso é diferente do `better-sqlite3` que aceita spread. Pequena pegadinha.

---

## 4. Schema atual

```sql
CREATE TABLE IF NOT EXISTS reminders (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT,
  trigger_at    TEXT NOT NULL,                      -- ISO 8601
  recurrence    TEXT NOT NULL CHECK (recurrence IN ('once', 'daily', 'weekly')),
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'completed')),
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reminders_trigger ON reminders(trigger_at);
CREATE INDEX IF NOT EXISTS idx_reminders_status  ON reminders(status);
```

### Decisões do schema

- **`id` é TEXT, não INTEGER autoincrement.** Usamos UUIDs (`crypto.randomUUID()`).
  Vantagem: ids estáveis se um dia adicionarmos sync entre dispositivos —
  não há colisão.

- **`trigger_at` é TEXT em formato ISO 8601.** SQLite não tem tipo nativo
  de data. ISO ordena lexicograficamente igual cronologicamente, então
  `ORDER BY trigger_at ASC` funciona.

- **`CHECK` constraints em recurrence/status** previnem dados inválidos
  no banco. Mesmo que o código tenha bug e tente gravar `recurrence: 'monthly'`,
  o SQLite rejeita.

- **2 índices**: um em `trigger_at` (pra ordenar/buscar lembretes próximos
  na Fase 3 com cron) e outro em `status` (pra filtrar pendentes).

### snake_case no banco, camelCase no TS

```
DB:           trigger_at, created_at
TypeScript:   triggerAt, createdAt
```

A função `mapRow()` no `RemindersService` faz a tradução.
Isso é convenção — não há motivo técnico — mas mantém o SQL idiomático e
o TS idiomático ao mesmo tempo.

---

## 5. Migrations

O sistema é deliberadamente simples. Em `electron/db/migrations.ts`:

```ts
const MIGRATIONS = [
  { version: 1, name: 'initial_schema', sql: `CREATE TABLE...` },
  // version: 2, ... (próxima migration)
]
```

A função `runMigrations(db)`:

1. Cria a tabela `_migrations` se não existir.
2. Lê o `MAX(version)` aplicado.
3. Roda cada migration com `version > current` em ordem.
4. Marca como aplicada.

### Regras pra adicionar migration

- **Nunca edite uma migration já aplicada em algum usuário.** Se o NotifyMe v1.0
  enviou a migration 1, e a v1.1 muda a migration 1, usuários que pularam de
  v1.0 → v1.1 não vão receber a mudança (porque o `_migrations` já marcou
  versão 1 como aplicada).
- **Sempre incremente a versão.** Adicionar campo? Crie migration 2 com
  `ALTER TABLE`. Mudar tipo? Crie migration nova.
- **Mantém compatibilidade com schema antigo durante 1-2 versões** se a
  mudança for destrutiva (renomear coluna, dropar tabela). Coloque uma
  warning na release.

Pra app de lembrete simples, esse sistema deve durar muito tempo. Se um dia
crescer, pode-se trocar por algo como `umzug` ou `knex migrations`.

---

## 6. Onde fica o arquivo .db

```ts
const dbPath = path.join(app.getPath('userData'), 'notifyme.db')
```

`app.getPath('userData')` no Windows é:
```
C:\Users\<seu-user>\AppData\Roaming\NotifyMe\
```

**Não confunda com `app.getPath('appData')`** que é a pasta acima
(`AppData\Roaming\` sem o nome do app). `userData` é específico do app.

Esse caminho **persiste através de reinstalações** — o usuário desinstala
e reinstala o NotifyMe e os lembretes continuam lá.

Pra apagar tudo (nuke) é só apagar a pasta `NotifyMe` em `%APPDATA%`.

---

## 7. Transações (não usamos ainda, mas vale saber)

```ts
db.exec('BEGIN')
try {
  // várias operações
  db.exec('COMMIT')
} catch (e) {
  db.exec('ROLLBACK')
  throw e
}
```

Útil quando uma operação envolve múltiplos INSERTs que precisam ser atômicos.
No NotifyMe atual, cada operação é simples e atômica por natureza, então
não precisamos de transação explícita.

Vai ser útil na Fase 3, quando o cron disparar e for **(1)** marcar o lembrete
como completed e **(2)** criar a próxima ocorrência (se for recorrente)
numa transação só.

---

## 8. Backup / export (futuro)

Como o `.db` é um arquivo único, fazer backup é só copiar o arquivo. Na
Fase 7 (polimento) vamos adicionar um botão "Exportar lembretes" que copia
ou exporta CSV.

---

## 9. Comandos úteis pra debug

Pra inspecionar o banco em desenvolvimento:

```bash
# Instalar uma GUI gratuita: DB Browser for SQLite
# https://sqlitebrowser.org/

# Ou via CLI:
sqlite3 "C:\Users\<você>\AppData\Roaming\NotifyMe\notifyme.db"
sqlite> .tables
sqlite> SELECT * FROM reminders;
sqlite> .quit
```

---

## Próxima leitura

- [03 — IPC](03-ipc.md) — quem chama os métodos do `RemindersService`
- [05 — Agendamento com node-cron](05-agendamento-cron.md) — *(Fase 3)*
