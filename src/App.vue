<script setup lang="ts">
import { ref, onMounted } from 'vue'

// Tema light/dark — controlado via classe .dark no <html>.
// Mesma abordagem do Cliloop.
const isDark = ref(false)

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
}

onMounted(() => {
  // Detecta preferência do SO no primeiro boot
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  isDark.value = prefersDark
  document.documentElement.classList.toggle('dark', prefersDark)
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="border-b border-border bg-card">
      <div class="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div
            class="w-9 h-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg"
          >
            N
          </div>
          <div>
            <h1 class="text-xl font-bold leading-none">NotifyMe</h1>
            <p class="text-xs text-muted-foreground mt-0.5">
              Lembretes que não somem
            </p>
          </div>
        </div>

        <button
          @click="toggleTheme"
          class="px-3 py-2 rounded-md border border-border bg-background hover:bg-muted text-sm transition"
        >
          {{ isDark ? 'Light' : 'Dark' }}
        </button>
      </div>
    </header>

    <main class="flex-1 max-w-5xl mx-auto w-full px-6 py-12">
      <div class="rounded-lg border border-border bg-card p-12 text-center">
        <div
          class="w-16 h-16 rounded-lg bg-primary text-primary-foreground mx-auto mb-6 flex items-center justify-center text-3xl font-bold"
        >
          N
        </div>

        <h2 class="text-3xl font-bold mb-3">Olá, NotifyMe!</h2>
        <p class="text-muted-foreground max-w-md mx-auto mb-8">
          Setup inicial concluído. A partir daqui, vamos construir
          a UI da lista de lembretes na <strong>Fase 1</strong>.
        </p>

        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-accent-foreground text-sm font-medium">
          <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          Fase 0 — Setup base concluído
        </div>
      </div>

      <div class="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="rounded-md border border-border bg-card p-5">
          <div class="text-xs uppercase tracking-wide text-muted-foreground mb-2">
            Stack
          </div>
          <div class="font-semibold">Electron + Vue 3</div>
          <div class="text-xs text-muted-foreground mt-1">TypeScript + Vite + Tailwind</div>
        </div>

        <div class="rounded-md border border-border bg-card p-5">
          <div class="text-xs uppercase tracking-wide text-muted-foreground mb-2">
            Licença
          </div>
          <div class="font-semibold">MIT</div>
          <div class="text-xs text-muted-foreground mt-1">Open source, doações bem-vindas</div>
        </div>

        <div class="rounded-md border border-border bg-card p-5">
          <div class="text-xs uppercase tracking-wide text-muted-foreground mb-2">
            Plataforma
          </div>
          <div class="font-semibold">Windows 10/11</div>
          <div class="text-xs text-muted-foreground mt-1">Userspace puro, sem driver</div>
        </div>
      </div>
    </main>

    <footer class="border-t border-border bg-card">
      <div class="max-w-5xl mx-auto px-6 py-4 text-xs text-muted-foreground flex justify-between">
        <span>NotifyMe v0.0.1 — Fase 0</span>
        <span>github.com/BelmanteGu/notifyme</span>
      </div>
    </footer>
  </div>
</template>
