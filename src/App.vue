<script setup lang="ts">
import { ref, computed } from 'vue'
import { Bell, Plus, Trash2, Info } from 'lucide-vue-next'
import ThemeToggle from '@/components/ThemeToggle.vue'
import ReminderCard from '@/components/ReminderCard.vue'
import ReminderModal from '@/components/ReminderModal.vue'
import EmptyState from '@/components/EmptyState.vue'
import AboutModal from '@/components/AboutModal.vue'
import { useReminders } from '@/composables/useReminders'
import pkg from '../package.json'

const {
  reminders,
  completed,
  loading,
  error,
  create,
  remove,
  markCompleted,
  clearCompleted,
} = useReminders()

const modalOpen = ref(false)
const aboutOpen = ref(false)
type Tab = 'pending' | 'completed'
const currentTab = ref<Tab>('pending')

const visibleList = computed(() =>
  currentTab.value === 'pending' ? reminders.value : completed.value
)

const version = pkg.version

async function handleClearCompleted() {
  if (completed.value.length === 0) return
  const ok = window.confirm(
    `Apagar definitivamente ${completed.value.length} lembrete(s) concluído(s)? Não dá pra desfazer.`
  )
  if (!ok) return
  await clearCompleted()
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
          <button
            @click="aboutOpen = true"
            class="w-9 h-9 inline-flex items-center justify-center rounded-md border border-border bg-background hover:bg-muted transition"
            aria-label="Sobre o NotifyMe"
            title="Sobre"
          >
            <Info class="w-4 h-4" />
          </button>

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
      <h2 class="text-2xl font-bold font-heading mb-4">Meus lembretes</h2>

      <div class="flex items-center justify-between mb-6 border-b border-border">
        <div class="flex">
          <button
            @click="currentTab = 'pending'"
            class="px-4 py-3 text-sm font-medium relative transition flex items-center gap-2"
            :class="
              currentTab === 'pending'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            "
          >
            Pendentes
            <span
              class="px-1.5 py-0.5 rounded-sm text-xs"
              :class="
                currentTab === 'pending'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              "
            >
              {{ reminders.length }}
            </span>
            <span
              v-if="currentTab === 'pending'"
              class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t"
            ></span>
          </button>

          <button
            @click="currentTab = 'completed'"
            class="px-4 py-3 text-sm font-medium relative transition flex items-center gap-2"
            :class="
              currentTab === 'completed'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            "
          >
            Concluídos
            <span
              class="px-1.5 py-0.5 rounded-sm text-xs"
              :class="
                currentTab === 'completed'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              "
            >
              {{ completed.length }}
            </span>
            <span
              v-if="currentTab === 'completed'"
              class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t"
            ></span>
          </button>
        </div>

        <button
          v-if="currentTab === 'completed' && completed.length > 0"
          @click="handleClearCompleted"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
        >
          <Trash2 class="w-3.5 h-3.5" />
          Limpar todos
        </button>
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
        v-else-if="visibleList.length === 0"
        :variant="currentTab"
        @create="modalOpen = true"
      />

      <div v-else class="space-y-3">
        <ReminderCard
          v-for="reminder in visibleList"
          :key="reminder.id"
          :reminder="reminder"
          @mark-completed="(id) => markCompleted(id)"
          @delete="(id) => remove(id)"
        />
      </div>
    </main>

    <footer class="border-t border-border bg-card">
      <div
        class="max-w-5xl mx-auto px-6 py-4 text-xs text-muted-foreground flex justify-between items-center"
      >
        <span>NotifyMe v{{ version }}</span>
        <button
          @click="aboutOpen = true"
          class="hover:text-foreground transition"
        >
          github.com/BelmanteGu/notifyme
        </button>
      </div>
    </footer>

    <ReminderModal
      v-model:open="modalOpen"
      @save="(input) => create(input)"
    />

    <AboutModal v-model:open="aboutOpen" />
  </div>
</template>
