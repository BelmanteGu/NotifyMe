<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { TriangleAlert, HelpCircle } from 'lucide-vue-next'
import { useConfirm } from '@/composables/useConfirm'

const { state, handleConfirm, handleCancel } = useConfirm()

function handleKeyDown(event: KeyboardEvent) {
  if (!state.open) return
  if (event.key === 'Escape') {
    event.preventDefault()
    handleCancel()
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    handleConfirm()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="state.open"
        class="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        @click.self="handleCancel"
      >
        <Transition
          appear
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95 -translate-y-1"
          enter-to-class="opacity-100 scale-100 translate-y-0"
        >
          <div
            v-if="state.open && state.options"
            class="confirm-dialog w-full max-w-sm rounded-md overflow-hidden"
            role="alertdialog"
            aria-modal="true"
          >
            <!-- Header com ícone + mensagem -->
            <div class="px-6 pt-6 pb-5">
              <div class="flex items-start gap-4">
                <div
                  class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  :class="
                    state.options.destructive
                      ? 'bg-destructive/15 text-destructive'
                      : 'bg-primary/15 text-primary'
                  "
                >
                  <TriangleAlert
                    v-if="state.options.destructive"
                    class="w-5 h-5"
                  />
                  <HelpCircle v-else class="w-5 h-5" />
                </div>
                <div class="flex-1 min-w-0 pt-1">
                  <h2 class="text-base font-semibold text-foreground leading-snug">
                    {{ state.options.message }}
                  </h2>
                  <p
                    v-if="state.options.detail"
                    class="text-sm text-muted-foreground mt-1.5 leading-relaxed"
                  >
                    {{ state.options.detail }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Footer com botões -->
            <div
              class="px-6 py-4 bg-muted/30 flex justify-end gap-2 border-t border-border/40"
            >
              <button
                @click="handleCancel"
                class="inline-flex items-center justify-center h-9 px-5 rounded-sm border border-border bg-card hover:bg-muted text-sm font-medium transition-colors"
              >
                {{ state.options.cancelText ?? 'Cancelar' }}
              </button>
              <button
                @click="handleConfirm"
                class="inline-flex items-center justify-center h-9 px-5 rounded-sm text-sm font-semibold transition-colors"
                :class="
                  state.options.destructive
                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    : 'btn-primary text-primary-foreground'
                "
              >
                {{ state.options.confirmText ?? 'OK' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/*
 * Dialog estilo Windows 11 Fluent:
 *   - Glassmorphism (Mica-like) com translucência + blur
 *   - Sombra dupla (camada externa larga + interna mais focada)
 *   - Border sutil pra dar contorno em fundos escuros
 */
.confirm-dialog {
  background: hsl(var(--card) / 0.94);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border: 1px solid hsl(var(--border) / 0.6);
  box-shadow:
    0 24px 60px -12px rgba(0, 0, 0, 0.28),
    0 8px 16px -8px rgba(0, 0, 0, 0.18);
}

:global(.dark) .confirm-dialog {
  background: hsl(var(--card) / 0.82);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 24px 60px -12px rgba(0, 0, 0, 0.7),
    0 8px 16px -8px rgba(0, 0, 0, 0.5);
}
</style>
