import { ref, computed } from 'vue'
import type { Reminder, ReminderInput } from '@/types/reminder'

/**
 * Composable que envelopa as chamadas IPC do domínio "reminders".
 *
 * O Vue NUNCA fala com SQLite direto. Sempre passa por window.notifyme.reminders.*,
 * que é exposto pelo preload e implementado no Main process.
 *
 * Mantém uma cópia reativa dos lembretes em memória pra UI ficar
 * instantânea — depois de cada mutação atualiza o cache local.
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

export function useReminders() {
  if (!initialized) {
    initialized = true
    refresh()
  }

  return {
    reminders: sortedReminders,
    loading,
    error,
    refresh,
    create,
    remove,
    markCompleted,
  }
}
