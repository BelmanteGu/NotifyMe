/**
 * Conexão singleton com o SQLite.
 *
 * O arquivo .db fica em app.getPath('userData') —
 * que no Windows é %APPDATA%\NotifyMe\notifyme.db.
 * Esse caminho persiste através de updates do app.
 *
 * Usamos node-sqlite3-wasm em vez de better-sqlite3 pra evitar
 * a necessidade de Visual Studio Build Tools no PC do usuário.
 * Veja docs/04-banco-sqlite.md.
 */

import { Database } from 'node-sqlite3-wasm'
import { app } from 'electron'
import path from 'node:path'
import { runMigrations } from './migrations'

let db: Database | null = null

export function getDatabase(): Database {
  if (db) return db

  const dbPath = path.join(app.getPath('userData'), 'notifyme.db')
  console.log(`[db] opening SQLite at ${dbPath}`)

  db = new Database(dbPath)
  runMigrations(db)
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
