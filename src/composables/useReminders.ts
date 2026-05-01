import { ref, computed } from 'vue'
import type { Reminder, ReminderInput } from '@/types/reminder'

/**
 * Composable que envelopa as chamadas IPC do domínio "reminders".
 *
 * Usa estado global compartilhado (refs no escopo do módulo). Qualquer
 * componente que chame useReminders() vê a mesma lista — mantendo a UI
 * consistente em diferentes pontos da árvore.
 *
 * Subscreve a `reminders:changed` empurrado pelo Main quando o scheduler
 * dispara um recorrente e atualiza triggerAt em background. Sem essa
 * subscrição, a UI mostraria timestamps desatualizados.
 */

const reminders = ref<Reminder[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
let initialized = false

const sortedReminders = computed(() =>
  [...reminders.value].sort(
    (a, b) => new Date(a.triggerAt).getTime() - new Date(b.triggerAt).getTime()
  )
)

const pendingReminders = computed(() =>
  sortedReminders.value.filter((r) => r.status === 'pending')
)

/**
 * Concluídos ordenados pelo mais recente primeiro (triggerAt desc).
 * Útil pra ver "o que terminei agora" no topo.
 */
const completedReminders = computed(() =>
  reminders.value
    .filter((r) => r.status === 'completed')
    .sort(
      (a, b) =>
        new Date(b.triggerAt).getTime() - new Date(a.triggerAt).getTime()
    )
)

async function refresh() {
  loading.value = true
  try {
    reminders.value = await window.notifyme.reminders.list()
    error.value = null
  } catch (e) {
    error.value = (e as Error).message
    console.error('[useReminders] failed to list:', e)
  } finally {
    loading.value = false
  }
}

async function create(input: ReminderInput) {
  const reminder = await window.notifyme.reminders.create(input)
  reminders.value.push(reminder)
  return reminder
}

async function remove(id: string) {
  const ok = await window.notifyme.reminders.delete(id)
  if (ok) {
    reminders.value = reminders.value.filter((r) => r.id !== id)
  }
  return ok
}

async function markCompleted(id: string) {
  const updated = await window.notifyme.reminders.markCompleted(id)
  if (updated) {
    const idx = reminders.value.findIndex((r) => r.id === id)
    if (idx >= 0) reminders.value[idx] = updated
  }
  return updated
}

async function clearCompleted() {
  const count = await window.notifyme.reminders.clearCompleted()
  if (count > 0) {
    reminders.value = reminders.value.filter((r) => r.status !== 'completed')
  }
  return count
}

export function useReminders() {
  if (!initialized) {
    initialized = true
    refresh()
    // Listener pro push do Main (scheduler avançou triggerAt de recorrente)
    window.notifyme.reminders.onChanged(() => {
      refresh()
    })
  }

  return {
    reminders: pendingReminders,
    completed: completedReminders,
    allReminders: sortedReminders,
    loading,
    error,
    refresh,
    create,
    remove,
    markCompleted,
    clearCompleted,
  }
}
