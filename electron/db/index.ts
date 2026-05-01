/**
 * Conexão singleton com o SQLite.
 *
 * O arquivo .db fica em app.getPath('userData') —
 * que no Windows é %APPDATA%\NotifyMe\notifyme.db.
 *
 * Usamos node-sqlite3-wasm em vez de better-sqlite3 pra evitar
 * a necessidade de Visual Studio Build Tools no PC do usuário.
 * Veja docs/04-banco-sqlite.md.
 *
 * NOTA SOBRE ESM/CJS:
 * O package.json tem "type": "module" e o main.js compilado é ESM.
 * O node-sqlite3-wasm é um pacote CJS — em ESM, importar com sintaxe
 * `import { Database } from 'node-sqlite3-wasm'` falha em runtime
 * porque o Node não detecta named exports do CJS.
 *
 * `createRequire(import.meta.url)` é a forma idiomática de carregar
 * um pacote CJS de dentro de um módulo ESM. Não precisa configurar
 * esModuleInterop nem mexer em nada do TypeScript — só funciona.
 */

import { createRequire } from 'node:module'
import { app } from 'electron'
import path from 'node:path'
import type { Database } from 'node-sqlite3-wasm'
import { runMigrations } from './migrations'

const require = createRequire(import.meta.url)
const sqliteWasm = require('node-sqlite3-wasm') as typeof import('node-sqlite3-wasm')

let db: Database | null = null

export function getDatabase(): Database {
  if (db) return db

  const dbPath = path.join(app.getPath('userData'), 'notifyme.db')
  console.log(`[db] opening SQLite at ${dbPath}`)

  db = new sqliteWasm.Database(dbPath)

  // busy_timeout: se o BD estiver locked por outra conexao,
  // espera ate 5s antes de dar erro em vez de falhar imediato.
  // Cobre o caso comum de o vite-plugin-electron reiniciar o app
  // em modo dev e a instancia anterior ainda nao ter fechado a conexao.
  db.exec('PRAGMA busy_timeout = 5000')

  runMigrations(db)
  console.log('[db] ready')
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
