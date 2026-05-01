<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, Trash2 } from 'lucide-vue-next'
import ReminderCard from '@/components/ReminderCard.vue'
import ReminderModal from '@/components/ReminderModal.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useReminders } from '@/composables/useReminders'

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
type Tab = 'pending' | 'completed'
const currentTab = ref<Tab>('pending')

const visibleList = computed(() =>
  currentTab.value === 'pending' ? reminders.value : completed.value
)

async function handleClearCompleted() {
  if (completed.value.length === 0) return
  const ok = await window.notifyme.system.confirm({
    message: `Apagar ${completed.value.length} lembrete(s) concluído(s)?`,
    detail: 'Não dá pra desfazer.',
    confirmText: 'Apagar',
    cancelText: 'Cancelar',
    destructive: true,
  })
  if (!ok) return
  await clearCompleted()
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-8 py-10">
    <div class="mb-8 flex items-end justify-between gap-4">
      <div>
        <h2 class="text-3xl font-bold font-heading tracking-tight">Meus lembretes</h2>
        <p class="text-muted-foreground mt-1 text-sm">
          {{
            currentTab === 'pending'
              ? 'O que está agendado pra disparar.'
              : 'O que você já marcou como concluído.'
          }}
        </p>
      </div>

      <button
        @click="modalOpen = true"
        class="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-sm text-primary-foreground font-semibold text-sm flex-shrink-0"
      >
        <Plus class="w-4 h-4" />
        Novo lembrete
      </button>
    </div>

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
      class="mb-4 p-4 rounded-sm border border-destructive/30 bg-destructive/10 text-destructive text-sm"
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

    <ReminderModal
      v-model:open="modalOpen"
      @save="(input) => create(input)"
    />
  </div>
</template>
