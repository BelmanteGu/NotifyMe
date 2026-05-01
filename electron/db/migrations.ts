/**
 * Sistema simples de migrations.
 *
 * Cada migration é numerada (version) e aplicada em ordem.
 * O banco mantém uma tabela `_migrations` com o que já foi aplicado,
 * então rodar várias vezes é idempotente.
 *
 * Pra adicionar uma nova: adicione no array MIGRATIONS com
 * version maior que a atual. Nunca edite uma migration já aplicada
 * em algum usuário — sempre crie uma nova.
 */

import type { Database } from 'node-sqlite3-wasm'

interface Migration {
  version: number
  name: string
  sql: string
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    sql: `
      CREATE TABLE IF NOT EXISTS reminders (
        id            TEXT PRIMARY KEY,
        title         TEXT NOT NULL,
        description   TEXT,
        trigger_at    TEXT NOT NULL,
        recurrence    TEXT NOT NULL CHECK (recurrence IN ('once', 'daily', 'weekly')),
        status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
        created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_reminders_trigger ON reminders(trigger_at);
      CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
    `,
  },
]

export function runMigrations(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version    INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  const result = db
    .prepare('SELECT MAX(version) AS v FROM _migrations')
    .get() as { v: number | null } | undefined

  const currentVersion = result?.v ?? 0

  const insert = db.prepare(
    'INSERT INTO _migrations (version, name) VALUES (?, ?)'
  )

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      db.exec(migration.sql)
      insert.run([migration.version, migration.name])
      console.log(`[db] applied migration ${migration.version}: ${migration.name}`)
    }
  }
}
