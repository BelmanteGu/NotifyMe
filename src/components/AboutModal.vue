<script setup lang="ts">
import { ref } from 'vue'
import { Bell, X, Github, Heart, Bug, Check } from 'lucide-vue-next'
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
const pixKey = '65.516.621/0001-78'

const pixCopied = ref(false)

function close() {
  emit('update:open', false)
}

function openLink(url: string) {
  window.notifyme.system.openExternal(url)
}

async function copyPix() {
  try {
    await navigator.clipboard.writeText(pixKey)
    pixCopied.value = true
    setTimeout(() => {
      pixCopied.value = false
    }, 2000)
  } catch (e) {
    console.error('[about] clipboard failed:', e)
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
      @click.self="close"
    >
      <div
        class="w-full max-w-md rounded-xl glass-strong shadow-soft overflow-hidden"
        role="dialog"
        aria-labelledby="about-title"
      >
        <header class="flex items-center justify-between px-6 py-5 border-b border-border/40">
          <h2 id="about-title" class="text-lg font-bold tracking-tight">
            Sobre o NotifyMe
          </h2>
          <button
            @click="close"
            class="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground transition"
            aria-label="Fechar"
          >
            <X class="w-4 h-4" />
          </button>
        </header>

        <div class="px-6 py-6">
          <div class="flex items-center gap-4 mb-6">
            <div class="relative">
              <div class="absolute inset-0 rounded-2xl bg-primary/30 blur-xl"></div>
              <div
                class="relative w-16 h-16 rounded-2xl icon-badge text-primary-foreground flex items-center justify-center"
              >
                <Bell class="w-8 h-8" />
              </div>
            </div>
            <div>
              <div class="text-2xl font-bold tracking-tight">NotifyMe</div>
              <div class="text-sm text-muted-foreground">Versão {{ version }}</div>
            </div>
          </div>

          <p class="text-sm text-muted-foreground mb-6 leading-relaxed">
            Lembretes desktop persistentes para Windows. Notificações que não somem
            até você confirmar.
          </p>

          <div class="space-y-2 mb-6">
            <button
              @click="openLink(repoUrl)"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-md border border-border/60 hover:bg-muted transition text-sm text-left"
            >
              <Github class="w-4 h-4 text-muted-foreground" />
              <span class="flex-1 font-medium">Repositório no GitHub</span>
              <span class="text-xs text-muted-foreground">github.com/BelmanteGu/notifyme</span>
            </button>

            <button
              @click="openLink(issuesUrl)"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-md border border-border/60 hover:bg-muted transition text-sm text-left"
            >
              <Bug class="w-4 h-4 text-muted-foreground" />
              <span class="flex-1 font-medium">Reportar problema</span>
            </button>
          </div>

          <div class="rounded-md bg-accent p-5 mb-3">
            <div class="flex items-center gap-2 mb-2 text-accent-foreground">
              <Heart class="w-4 h-4" />
              <span class="text-sm font-semibold">Apoiar o projeto</span>
            </div>
            <p class="text-xs text-muted-foreground mb-4 leading-relaxed">
              O NotifyMe é 100% gratuito. Se ele te ajuda no dia a dia,
              considere uma doação. Ajuda a manter o projeto ativo.
            </p>
            <div class="grid grid-cols-3 gap-2">
              <button
                @click="copyPix"
                class="px-3 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold transition inline-flex items-center justify-center gap-1.5"
                :class="{ 'border-primary text-primary': pixCopied }"
                :title="`Clique para copiar: ${pixKey}`"
              >
                <Check v-if="pixCopied" class="w-3 h-3" />
                {{ pixCopied ? 'Copiado!' : 'PIX' }}
              </button>
              <button
                @click="openLink(kofiUrl)"
                class="btn-primary px-3 py-2.5 rounded-xl text-primary-foreground text-xs font-semibold"
              >
                Ko-fi
              </button>
              <button
                @click="openLink(sponsorsUrl)"
                class="px-3 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold transition"
              >
                Sponsors
              </button>
            </div>
            <p class="text-[11px] text-muted-foreground text-center mt-3 font-mono">
              PIX (CNPJ): {{ pixKey }}
            </p>
          </div>

          <p class="text-xs text-muted-foreground text-center">
            100% gratuito · Feito com Vue + Electron
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>
