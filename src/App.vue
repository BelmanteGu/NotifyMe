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
  <div class="min-h-screen flex flex-col bg-app">
    <header class="sticky top-0 z-10 backdrop-blur-xl bg-background/70 border-b border-border/50">
      <div class="max-w-5xl mx-auto px-8 py-5 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="icon-badge w-10 h-10 rounded-xl text-primary-foreground flex items-center justify-center">
            <Bell class="w-5 h-5" />
          </div>
          <div>
            <h1 class="text-base font-bold leading-tight tracking-tight">NotifyMe</h1>
            <p class="text-xs text-muted-foreground mt-0.5">
              Lembretes que não somem
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="aboutOpen = true"
            class="w-10 h-10 inline-flex items-center justify-center rounded-xl border border-border/60 bg-card/50 hover:bg-card transition-all"
            aria-label="Sobre o NotifyMe"
            title="Sobre"
          >
            <Info class="w-4 h-4" />
          </button>

          <ThemeToggle />

          <button
            @click="modalOpen = true"
            class="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-primary-foreground font-semibold text-sm"
          >
            <Plus class="w-4 h-4" />
            Novo lembrete
          </button>
        </div>
      </div>
    </header>

    <main class="flex-1 max-w-5xl mx-auto w-full px-8 py-10">
      <div class="mb-8">
        <h2 class="text-3xl font-bold font-heading tracking-tight">Meus lembretes</h2>
        <p class="text-muted-foreground mt-1 text-sm">
          {{
            currentTab === 'pending'
              ? 'O que está agendado pra disparar.'
              : 'O que você já marcou como concluído.'
          }}
        </p>
      </div>

      <!-- Tabs estilo pill segmentada (iOS-like) -->
      <div class="flex items-center justify-between mb-6">
        <div class="inline-flex p-1 rounded-full bg-muted/70 backdrop-blur-sm">
          <button
            @click="currentTab = 'pending'"
            class="px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2"
            :class="
              currentTab === 'pending'
                ? 'bg-card text-foreground shadow-soft'
                : 'text-muted-foreground hover:text-foreground'
            "
          >
            Pendentes
            <span
              class="px-1.5 rounded-full text-[10px] font-semibold leading-tight inline-flex items-center justify-center min-w-[18px] h-[18px]"
              :class="
                currentTab === 'pending'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-foreground/10 text-muted-foreground'
              "
            >
              {{ reminders.length }}
            </span>
          </button>

          <button
            @click="currentTab = 'completed'"
            class="px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2"
            :class="
              currentTab === 'completed'
                ? 'bg-card text-foreground shadow-soft'
                : 'text-muted-foreground hover:text-foreground'
            "
          >
            Concluídos
            <span
              class="px-1.5 rounded-full text-[10px] font-semibold leading-tight inline-flex items-center justify-center min-w-[18px] h-[18px]"
              :class="
                currentTab === 'completed'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-foreground/10 text-muted-foreground'
              "
            >
              {{ completed.length }}
            </span>
          </button>
        </div>

        <button
          v-if="currentTab === 'completed' && completed.length > 0"
          @click="handleClearCompleted"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
        >
          <Trash2 class="w-3.5 h-3.5" />
          Limpar todos
        </button>
      </div>

      <div
        v-if="error"
        class="mb-4 p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm"
      >
        Erro ao carregar lembretes: {{ error }}
      </div>

      <div v-if="loading" class="text-center text-muted-foreground py-16">
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

    <footer class="border-t border-border/50 bg-background/40 backdrop-blur-md">
      <div class="max-w-5xl mx-auto px-8 py-4 text-xs text-muted-foreground flex justify-between items-center">
        <span>NotifyMe v{{ version }}</span>
        <button @click="aboutOpen = true" class="hover:text-foreground transition">
          github.com/BelmanteGu/notifyme
        </button>
      </div>
    </footer>

    <ReminderModal v-model:open="modalOpen" @save="(input) => create(input)" />
    <AboutModal v-model:open="aboutOpen" />
  </div>
</template>
