<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import {
  Bell,
  Clock,
  Repeat,
  MoreVertical,
  CheckCircle2,
  Trash2,
  AlertCircle,
} from 'lucide-vue-next'
import type { Reminder } from '@/types/reminder'
import { RECURRENCE_LABELS } from '@/types/reminder'
import { formatRelative } from '@/utils/formatDate'

const props = defineProps<{
  reminder: Reminder
}>()

defineEmits<{
  'mark-completed': [id: string]
  delete: [id: string]
}>()

const isCompleted = computed(() => props.reminder.status === 'completed')

const recurrenceLabel = computed(() => RECURRENCE_LABELS[props.reminder.recurrence])
const triggerLabel = computed(() => formatRelative(props.reminder.triggerAt))

const isOverdue = computed(() => {
  if (isCompleted.value) return false
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
    class="glass rounded-lg p-5 flex items-start gap-4 lift"
    :class="[
      isOverdue && '!border-destructive/40',
      isCompleted && 'opacity-65',
    ]"
  >
    <!-- Ícone com gradient + soft shadow -->
    <div
      class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
      :class="
        isCompleted
          ? 'bg-primary/15 text-primary'
          : isOverdue
            ? 'bg-destructive/15 text-destructive'
            : 'icon-badge text-primary-foreground'
      "
    >
      <CheckCircle2 v-if="isCompleted" class="w-5 h-5" />
      <AlertCircle v-else-if="isOverdue" class="w-5 h-5" />
      <Bell v-else class="w-5 h-5" />
    </div>

    <div class="flex-1 min-w-0">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <h3
            class="font-semibold text-foreground truncate text-[15px] leading-tight"
            :class="{ 'line-through decoration-1': isCompleted }"
          >
            {{ reminder.title }}
          </h3>
          <p
            v-if="reminder.description"
            class="text-sm text-muted-foreground mt-1 truncate"
          >
            {{ reminder.description }}
          </p>
        </div>

        <div ref="menuRef" class="relative flex-shrink-0">
          <button
            @click.stop="toggleMenu"
            class="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground transition"
            aria-label="Mais opções"
          >
            <MoreVertical class="w-4 h-4" />
          </button>

          <div
            v-if="menuOpen"
            class="absolute right-0 top-full mt-1 w-56 rounded-xl glass-strong shadow-soft z-20 py-1.5 overflow-hidden"
          >
            <button
              v-if="!isCompleted"
              @click="$emit('mark-completed', reminder.id); menuOpen = false"
              class="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2.5 hover:bg-muted transition"
            >
              <CheckCircle2 class="w-4 h-4 text-primary" />
              Marcar como concluído
            </button>
            <button
              @click="$emit('delete', reminder.id); menuOpen = false"
              class="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2.5 hover:bg-destructive/10 transition text-destructive"
            >
              <Trash2 class="w-4 h-4" />
              Excluir
            </button>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2 mt-3 text-xs">
        <span
          class="inline-flex items-center gap-1.5"
          :class="
            isOverdue
              ? 'text-destructive font-semibold'
              : 'text-muted-foreground'
          "
        >
          <Clock class="w-3.5 h-3.5" />
          <template v-if="isOverdue">Atrasado · {{ triggerLabel }}</template>
          <template v-else>{{ triggerLabel }}</template>
        </span>

        <span
          v-if="reminder.recurrence !== 'once'"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-medium text-[11px]"
        >
          <Repeat class="w-3 h-3" />
          {{ recurrenceLabel }}
        </span>
      </div>
    </div>
  </article>
</template>
