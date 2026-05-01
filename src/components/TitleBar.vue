<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Bell, Minus, Square, Copy, X } from 'lucide-vue-next'

const isMaximized = ref(false)
let unsubscribe: (() => void) | null = null

onMounted(async () => {
  isMaximized.value = await window.notifyme.system.window.isMaximized()
  unsubscribe = window.notifyme.system.window.onMaximizedChanged((value) => {
    isMaximized.value = value
  })
})

onBeforeUnmount(() => {
  unsubscribe?.()
})

function minimize() {
  window.notifyme.system.window.minimize()
}
function toggleMaximize() {
  window.notifyme.system.window.toggleMaximize()
}
function close() {
  window.notifyme.system.window.close()
}
</script>

<template>
  <div
    class="h-9 flex items-center justify-between drag-region select-none border-b border-border/40 bg-background/60 backdrop-blur-md"
  >
    <div class="flex items-center gap-2 px-3">
      <div class="w-5 h-5 rounded-md icon-badge text-primary-foreground flex items-center justify-center">
        <Bell class="w-3 h-3" />
      </div>
      <span class="text-xs font-semibold text-foreground/75 tracking-tight">
        NotifyMe
      </span>
    </div>

    <!-- Controle da janela: minimize / maximize / close -->
    <div class="flex no-drag h-full">
      <button
        @click="minimize"
        class="w-11 h-full inline-flex items-center justify-center text-muted-foreground hover:bg-muted/60 hover:text-foreground transition"
        aria-label="Minimizar"
      >
        <Minus class="w-3.5 h-3.5" />
      </button>
      <button
        @click="toggleMaximize"
        class="w-11 h-full inline-flex items-center justify-center text-muted-foreground hover:bg-muted/60 hover:text-foreground transition"
        :aria-label="isMaximized ? 'Restaurar' : 'Maximizar'"
      >
        <Copy v-if="isMaximized" class="w-3 h-3" />
        <Square v-else class="w-3 h-3" />
      </button>
      <button
        @click="close"
        class="w-11 h-full inline-flex items-center justify-center text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition"
        aria-label="Fechar"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>
