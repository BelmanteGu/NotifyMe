<script setup lang="ts">
import { Bell, X, Github, Heart, Bug } from 'lucide-vue-next'
import pkg from '../../package.json'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const version = pkg.version
const repoUrl = 'https://github.com/BelmanteGu/notifyme'
const issuesUrl = `${repoUrl}/issues`
const sponsorsUrl = 'https://github.com/sponsors/BelmanteGu'
const kofiUrl = 'https://ko-fi.com/belmantegu'

function close() {
  emit('update:open', false)
}

function openLink(url: string) {
  window.notifyme.system.openExternal(url)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      @click.self="close"
    >
      <div
        class="w-full max-w-md rounded-lg border border-border bg-card shadow-2xl"
        role="dialog"
        aria-labelledby="about-title"
      >
        <header class="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 id="about-title" class="text-lg font-bold">Sobre o NotifyMe</h2>
          <button
            @click="close"
            class="p-1 rounded hover:bg-muted text-muted-foreground transition"
            aria-label="Fechar"
          >
            <X class="w-5 h-5" />
          </button>
        </header>

        <div class="px-6 py-6">
          <div class="flex items-center gap-4 mb-5">
            <div
              class="w-14 h-14 rounded-lg bg-primary text-primary-foreground flex items-center justify-center"
            >
              <Bell class="w-7 h-7" />
            </div>
            <div>
              <div class="text-xl font-bold">NotifyMe</div>
              <div class="text-sm text-muted-foreground">v{{ version }}</div>
            </div>
          </div>

          <p class="text-sm text-muted-foreground mb-5">
            Lembretes desktop persistentes para Windows. Notificações que não somem
            até você confirmar.
          </p>

          <div class="space-y-2 mb-6">
            <button
              @click="openLink(repoUrl)"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-md border border-border hover:bg-muted transition text-sm text-left"
            >
              <Github class="w-4 h-4 text-muted-foreground" />
              <span class="flex-1">Código no GitHub</span>
              <span class="text-xs text-muted-foreground">github.com/BelmanteGu/notifyme</span>
            </button>

            <button
              @click="openLink(issuesUrl)"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-md border border-border hover:bg-muted transition text-sm text-left"
            >
              <Bug class="w-4 h-4 text-muted-foreground" />
              <span class="flex-1">Reportar problema</span>
            </button>
          </div>

          <div class="rounded-md bg-accent p-4 mb-2">
            <div class="flex items-center gap-2 mb-2 text-accent-foreground">
              <Heart class="w-4 h-4" />
              <span class="text-sm font-semibold">Apoiar o projeto</span>
            </div>
            <p class="text-xs text-muted-foreground mb-3">
              O NotifyMe é gratuito e open source. Se ele te ajuda no dia a dia,
              considere uma doação — ajuda a manter o projeto ativo.
            </p>
            <div class="grid grid-cols-2 gap-2">
              <button
                @click="openLink(kofiUrl)"
                class="px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition"
              >
                Ko-fi
              </button>
              <button
                @click="openLink(sponsorsUrl)"
                class="px-3 py-2 rounded-md border border-border text-xs font-medium hover:bg-muted transition"
              >
                GitHub Sponsors
              </button>
            </div>
          </div>

          <p class="text-xs text-muted-foreground text-center">
            Open source · Licença MIT · Feito com Vue + Electron
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>
