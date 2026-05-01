import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron/simple'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * `external` no build do Main: deps que NAO devem ser bundleadas dentro
 * do main.js. Ficam em node_modules e sao carregadas em runtime.
 *
 * Necessario pra `node-sqlite3-wasm` porque a lib usa __dirname (CJS) pra
 * encontrar o arquivo .wasm — e __dirname nao existe em ES modules.
 * Externalizando, o Node carrega o pacote como CJS de node_modules
 * onde __dirname funciona.
 */
const externalDeps = ['node-sqlite3-wasm']

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [
    vue(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              external: externalDeps,
            },
          },
        },
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.ts'),
        vite: {
          build: {
            rollupOptions: {
              external: externalDeps,
            },
          },
        },
      },
      renderer: {},
    }),
  ],
})
