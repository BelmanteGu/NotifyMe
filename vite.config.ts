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
 * electron-store eh ESM-only (v10) e tem dependencias internas (conf,
 * dot-prop, etc) que esperam ser carregadas como modulos separados.
 * Externalizar evita problemas de bundling com essas sub-deps.
 */
const externalDeps = ['electron-store']

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
