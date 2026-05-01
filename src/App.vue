<script setup lang="ts">
import { ref } from 'vue'
import { Bell, Plus } from 'lucide-vue-next'
import ThemeToggle from '@/components/ThemeToggle.vue'
import ReminderCard from '@/components/ReminderCard.vue'
import ReminderModal from '@/components/ReminderModal.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useReminders } from '@/composables/useReminders'

/**
 * Fase 2: lembretes vêm do SQLite via IPC.
 * Toda mutação chama o Main process; UI atualiza otimisticamente
 * com o resultado retornado.
 */
const { reminders, loading, error, create } = useReminders()
const modalOpen = ref(false)
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="border-b border-border bg-card sticky top-0 z-10">
      <div class="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div
            class="w-9 h-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center"
          >
            <Bell class="w-5 h-5" />
          </div>
          <div>
            <h1 class="text-lg font-bold leading-none">NotifyMe</h1>
            <p class="text-xs text-muted-foreground mt-0.5">
              Lembretes que não somem
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <ThemeToggle />

          <button
            @click="modalOpen = true"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition text-sm"
          >
            <Plus class="w-4 h-4" />
            Novo lembrete
          </button>
        </div>
      </div>
    </header>

    <main class="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
      <div class="mb-6 flex items-center justify-between">
        <h2 class="text-2xl font-bold font-heading">Meus lembretes</h2>
        <span v-if="!loading" class="text-sm text-muted-foreground">
          {{ reminders.length }}
          {{ reminders.length === 1 ? 'lembrete' : 'lembretes' }}
        </span>
      </div>

      <div
        v-if="error"
        class="mb-4 p-4 rounded-md border border-destructive bg-destructive/10 text-destructive text-sm"
      >
        Erro ao carregar lembretes: {{ error }}
      </div>

      <div v-if="loading" class="text-center text-muted-foreground py-12">
        Carregando…
      </div>

      <EmptyState
        v-else-if="reminders.length === 0"
        @create="modalOpen = true"
      />

      <div v-else class="space-y-3">
        <ReminderCard
          v-for="reminder in reminders"
          :key="reminder.id"
          :reminder="reminder"
        />
      </div>
    </main>

    <footer class="border-t border-border bg-card">
      <div
        class="max-w-5xl mx-auto px-6 py-4 text-xs text-muted-foreground flex justify-between"
      >
        <span>NotifyMe v0.0.1 — Fase 2</span>
        <span>github.com/BelmanteGu/notifyme</span>
      </div>
    </footer>

    <ReminderModal
      v-model:open="modalOpen"
      @save="(input) => create(input)"
    />
  </div>
</template>
