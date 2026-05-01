<script setup lang="ts">
import { ref, computed } from 'vue'
import { Bell, Plus } from 'lucide-vue-next'
import ThemeToggle from '@/components/ThemeToggle.vue'
import ReminderCard from '@/components/ReminderCard.vue'
import ReminderModal from '@/components/ReminderModal.vue'
import EmptyState from '@/components/EmptyState.vue'
import type { Reminder, ReminderInput } from '@/types/reminder'
import { mockReminders } from '@/data/mockReminders'

/**
 * Estado raiz do app na Fase 1.
 *
 * Os lembretes vivem em memória — nada é persistido. Reiniciou o app, sumiu.
 * Isso muda na Fase 2 (SQLite via IPC).
 */
const reminders = ref<Reminder[]>([...mockReminders])
const modalOpen = ref(false)

const sortedReminders = computed(() =>
  [...reminders.value].sort(
    (a, b) => new Date(a.triggerAt).getTime() - new Date(b.triggerAt).getTime()
  )
)

function handleSave(input: ReminderInput) {
  const reminder: Reminder = {
    ...input,
    id: `r-${Date.now()}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  reminders.value.push(reminder)
}
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
        <span class="text-sm text-muted-foreground">
          {{ reminders.length }}
          {{ reminders.length === 1 ? 'lembrete' : 'lembretes' }}
        </span>
      </div>

      <EmptyState v-if="reminders.length === 0" @create="modalOpen = true" />

      <div v-else class="space-y-3">
        <ReminderCard
          v-for="reminder in sortedReminders"
          :key="reminder.id"
          :reminder="reminder"
        />
      </div>
    </main>

    <footer class="border-t border-border bg-card">
      <div
        class="max-w-5xl mx-auto px-6 py-4 text-xs text-muted-foreground flex justify-between"
      >
        <span>NotifyMe v0.0.1 — Fase 1</span>
        <span>github.com/BelmanteGu/notifyme</span>
      </div>
    </footer>

    <ReminderModal v-model:open="modalOpen" @save="handleSave" />
  </div>
</template>
