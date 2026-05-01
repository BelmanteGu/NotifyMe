<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { Bell, Clock, Repeat, MoreVertical, CheckCircle2, Trash2, AlertCircle } from 'lucide-vue-next'
import type { Reminder } from '@/types/reminder'
import { RECURRENCE_LABELS } from '@/types/reminder'
import { formatRelative } from '@/utils/formatDate'

const props = defineProps<{
  reminder: Reminder
}>()

defineEmits<{
  'mark-completed': [id: string]
  'delete': [id: string]
}>()

const recurrenceLabel = computed(() => RECURRENCE_LABELS[props.reminder.recurrence])
const triggerLabel = computed(() => formatRelative(props.reminder.triggerAt))

/** Lembrete pendente cuja hora já passou — visualmente destacado. */
const isOverdue = computed(() => {
  if (props.reminder.status !== 'pending') return false
  return new Date(props.reminder.triggerAt).getTime() < Date.now()
})

const menuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function handleClickOutside(event: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    menuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <article
    class="rounded-lg border bg-card p-5 flex items-start gap-4 hover:bg-muted/30 transition"
    :class="isOverdue ? 'border-destructive/50' : 'border-border'"
  >
    <div
      class="w-11 h-11 rounded-md flex items-center justify-center flex-shrink-0"
      :class="isOverdue ? 'bg-destructive/15 text-destructive' : 'bg-accent text-accent-foreground'"
    >
      <AlertCircle v-if="isOverdue" class="w-5 h-5" />
      <Bell v-else class="w-5 h-5" />
    </div>

    <div class="flex-1 min-w-0">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="font-semibold text-foreground truncate">
            {{ reminder.title }}
          </h3>
          <p
            v-if="reminder.description"
            class="text-sm text-muted-foreground mt-0.5 truncate"
          >
            {{ reminder.description }}
          </p>
        </div>

        <div ref="menuRef" class="relative flex-shrink-0">
          <button
            @click.stop="toggleMenu"
            class="p-1 rounded hover:bg-muted text-muted-foreground transition"
            aria-label="Mais opções"
          >
            <MoreVertical class="w-4 h-4" />
          </button>

          <div
            v-if="menuOpen"
            class="absolute right-0 top-full mt-1 w-52 rounded-md border border-border bg-popover shadow-lg z-20 py-1"
          >
            <button
              @click="$emit('mark-completed', reminder.id); menuOpen = false"
              class="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-muted transition"
            >
              <CheckCircle2 class="w-4 h-4 text-primary" />
              Marcar como concluído
            </button>
            <button
              @click="$emit('delete', reminder.id); menuOpen = false"
              class="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-muted transition text-destructive"
            >
              <Trash2 class="w-4 h-4" />
              Excluir
            </button>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3 mt-3 text-xs">
        <span
          class="inline-flex items-center gap-1"
          :class="isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'"
        >
          <Clock class="w-3.5 h-3.5" />
          <template v-if="isOverdue">Atrasado · {{ triggerLabel }}</template>
          <template v-else>{{ triggerLabel }}</template>
        </span>

        <span
          v-if="reminder.recurrence !== 'once'"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-accent text-accent-foreground font-medium"
        >
          <Repeat class="w-3 h-3" />
          {{ recurrenceLabel }}
        </span>
      </div>
    </div>
  </article>
</template>
